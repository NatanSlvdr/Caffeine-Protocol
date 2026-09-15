import { describe,it,expect } from 'vitest';
import reference from './reference-results.json';
import { levels,lessons } from '../src/data';
import { compileProgram,executeCustomerEvent,LIMIT } from '../src/domain/program';
import { runLevel,buildReplayTimeline } from '../src/domain/simulation';
import { completeLevel,incomingProgram,newSave,parseSave,readSave,SAVE_KEY,writeSave } from '../src/domain/persistence';
const run=(i:number,source=lessons[i].solution)=>runLevel(levels[i],compileProgram(source,i+1));
const tea=levels[3].seeds[1].customers[0],coffee=levels[3].seeds[0].customers[0];
const exec=(source:string,customer=coffee,level=14)=>executeCustomerEvent(compileProgram(source,level),customer,'test');
describe('reference parity — all 14 complete solutions',()=>{
 for(const [i,level] of levels.slice(0,14).entries()){
  it(`${level.id}: preserves order outcomes and resolves current instruction traces`,()=>{
   const actual=run(i);expect(actual.passed).toBe(true);
   const semantics=(events:typeof actual.events)=>events.map(e=>({customer:e.customer,asked_help:e.asked_help,tickets:e.tickets.map(t=>({item:t.item,with_sugar:t.with_sugar,sugar_count:t.sugar_count,source_intent:t.source_intent}))}));
   expect(semantics(actual.events)).toEqual(semantics(reference[i].events as typeof actual.events));
   // Handoff and payment intentionally changed the old trace; every step must still resolve to its source.
   for(const event of actual.events)for(const step of event.trace)expect(lessons[i].solution.split('\n')[step.line].trim()).toBe(step.command);
   if(i>=2)expect(actual.stars).toBe(3);
   const timeline=buildReplayTimeline(actual);expect(timeline.every(t=>t.end>=t.start)).toBe(true);
  });
  if(i>=2&&![7,10,11,12,13].includes(i))it(`${level.id}: incoming incomplete routine fails the new mechanic`,()=>expect(run(i,lessons[i].starter).passed).toBe(false));
 }
 it('manual rush builds a measurable backlog',()=>{const r=run(1);expect(r.events.at(-1)!.satisfaction).toBeLessThan(r.events[0].satisfaction);});
 it('repeat runs produce the same complete result without input mutation',()=>{const before=JSON.stringify(levels);expect(run(13)).toEqual(run(13));expect(JSON.stringify(levels)).toBe(before);});
});
describe('compiler and runtime',()=>{
 it('takes only the true branch',()=>{const r=exec(lessons[3].solution,tea,4);expect(r.tickets[0].item).toBe('tea');expect(r.trace.some(t=>t.command==='ITEM coffee')).toBe(false);});
 it('takes the else branch',()=>expect(exec(lessons[3].solution).tickets[0].item).toBe('coffee'));
 it('compares a selected drink against customer speech',()=>{
  const source='LISTEN\nIF coffee IN CUSTOMER SPEECH\nTICKET\nITEM coffee\nELSE\nTICKET\nITEM tea\nEND\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
  expect(exec(source,coffee,4).tickets[0].item).toBe('coffee');
  expect(exec(source,tea,4).tickets[0].item).toBe('tea');
 });
 it('resumes the next speech without stale intent',()=>{const p=compileProgram(lessons[4].solution,5);const a=executeCustomerEvent(p,coffee,'a');const b=executeCustomerEvent(p,tea,'b',a.state);expect(b.error).toBe('');expect(b.tickets[0].item).toBe('tea');});
 for(const source of ['', 'LISTEN\nEND','LISTEN\nEACH','LISTEN\nEACH\nEACH\nEND\nEND','LISTEN\nREPEAT\nTICKET','LISTEN\nBOGUS','TICKET\nLISTEN','LISTEN\nELSE','LISTEN\nIF tea\nELSE\nELSE\nEND','LISTEN\nCALL build_ticket','LISTEN\nJUMP listen','POSITION listen\nLISTEN\nPOSITION listen','LISTEN\nLISTEN','LISTEN\nIF tea\nFUNCTION build_ticket\nEND\nEND'])it(`rejects structural invalidity ${JSON.stringify(source)}`,()=>expect(compileProgram(source).compile_error).not.toBe(''));
 it('gates locked instructions',()=>expect(compileProgram('LISTEN\nHELP',3).compile_error).toContain('locked'));
 it('enforces 128 blocks',()=>{expect(compileProgram('LISTEN\n'+'TICKET\n'.repeat(127)).compile_error).toBe('');expect(compileProgram('LISTEN\n'+'TICKET\n'.repeat(128)).compile_error).toContain('128');});
 it('does not execute comments as code',()=>expect(exec('# heading\nLISTEN\nTICKET\nITEM coffee\nSUBMIT').trace[0].line).toBe(1));
 it('rejects sugar reads before speech',()=>expect(exec('POSITION listen\nREAD sugar\nLISTEN').error).toContain('No customer speech'));
 it('rejects help before speech',()=>expect(exec('POSITION listen\nHELP\nLISTEN').error).toContain('No customer speech'));
 it('identifies the missing number line',()=>{const r=exec('LISTEN\nREAD count',tea);expect(r.error).toContain('none was heard');expect(r.error_line).toBe(1);});
 it('rejects unread locals',()=>expect(exec('LISTEN\nTICKET\nITEM coffee\nSUGAR variable\nSUBMIT').error).toContain('local variable'));
 it('rejects recursive calls',()=>expect(exec('LISTEN\nCALL build_ticket\nFUNCTION build_ticket\nCALL build_ticket\nEND').error).toContain('Recursive'));
 it('does not leak function locals to caller',()=>expect(exec('LISTEN\nCALL build_ticket\nSUGAR variable\nSUBMIT\nFUNCTION build_ticket\nTICKET\nITEM heard\nREAD sugar\nRETURN\nEND',levels[6].seeds[0].customers[0]).error).toContain('local variable'));
 it('does not leak caller locals to function',()=>expect(exec('LISTEN\nREAD sugar\nCALL build_ticket\nFUNCTION build_ticket\nTICKET\nITEM heard\nSUGAR variable\nEND',levels[6].seeds[0].customers[0]).error).toContain('local variable'));
 it('bounds large loops at exactly 1024 executed instructions',()=>{const c={...coffee,intent:{orders:Array.from({length:400},()=>({drink:'coffee' as const}))}};const r=exec('LISTEN\nEACH\nTICKET\nITEM heard\nMOVE RIGHT 1\nSUBMIT\nMOVE LEFT 1\nEND',c);expect(r.error).toContain('limit');expect(r.executed_instructions).toBe(LIMIT);});
 it('preserves zero numeric sugar',()=>{const r=exec('LISTEN\nTICKET\nITEM coffee\nIF count = 0\nREAD count\nSUGAR number\nEND\nMOVE RIGHT 1\nSUBMIT\nMOVE LEFT 1',levels[9].seeds[0].customers[0]);expect(r.error).toBe('');expect(r.tickets[0].sugar_count).toBe(0);});
 for(const cond of ['count > 0','count > 1','count = 1','count = 2'])it(`numeric comparison ${cond}`,()=>{const c=levels[9].seeds[0].customers[2];const r=exec(`LISTEN\nTICKET\nITEM tea\nIF ${cond}\nREAD count\nSUGAR number\nEND\nMOVE RIGHT 1\nSUBMIT\nMOVE LEFT 1`,c);expect(r.error).toBe('');expect(r.tickets[0].sugar_count).toBe(cond==='count = 1'?null:2);});
 it('missing count comparisons fail',()=>expect(exec('LISTEN\nIF count > 0\nEND').error).toContain('none was heard'));
 it('missing ITEM paper fails',()=>expect(exec('LISTEN\nITEM coffee').error).toContain('Take the order paper'));
 it('missing SUGAR paper fails',()=>expect(exec('LISTEN\nSUGAR heard').error).toContain('Take the order paper'));
 it('missing item fails DEPOSIT',()=>expect(exec('LISTEN\nPICKUP UP\nDEPOSIT RIGHT').error).toContain('missing an item'));
 it('unsubmitted paper cannot be overwritten',()=>expect(exec('LISTEN\nPICKUP UP\nPICKUP UP').error).toContain('Deposit the current paper'));
 it('rejects RETURN outside a function',()=>expect(exec('LISTEN\nRETURN').error).toContain('inside a called function'));
 it('rejects jumping from an active loop',()=>expect(exec('POSITION listen\nLISTEN\nEACH\nJUMP listen\nEND').error).toContain('Finish the function or EACH'));
 it('defers unresolved ambiguity without a guess',()=>{const c={...coffee,intent:{confidence:'ambiguous' as const},clarification_intent:{}};const r=exec(lessons[13].solution,c);expect(r.asked_help).toBe(true);expect(r.tickets).toEqual([]);expect(r.error).toBe('');});
 it('fails on first customer mismatch and highlights item source',()=>{const r=run(3,lessons[2].solution);expect(r.events).toHaveLength(2);expect(r.first_failure?.seed_id).toBe('L04_B');expect(r.first_failure?.error_line).toBe(2);});
 for(const [index,source] of [[3,lessons[2].solution],[4,'LISTEN\nTICKET\nITEM heard\nSUBMIT'],[5,'LISTEN\nTICKET\nITEM heard\nSUBMIT\nREPEAT'],[6,lessons[5].solution],[8,lessons[7].solution],[9,lessons[8].solution]] as const)it(`incomplete mechanic rejects L${index+1}`,()=>expect(run(index,source).passed).toBe(false));
});
describe('persistence',()=>{
 it('round trips every save field',()=>{let s=newSave();s=completeLevel(s,2,3,lessons[2].solution);s.drafts[2]='# comment\nLISTEN';s.story[2]=true;expect(parseSave(JSON.stringify(s))).toEqual(s);});
 it('preserves best stars and passing source over a broken draft',()=>{let s=completeLevel(newSave(),2,3,lessons[2].solution);s=completeLevel(s,2,1);s.drafts[2]='broken later edit';expect(s.stars[2]).toBe(3);expect(incomingProgram(s,3)).toBe(lessons[2].solution);expect(s.unlocked).toBe(3);});
 it('persists to storage and reloads',()=>{const storage=new Map<string,string>();const adapter={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);}};const s=completeLevel(newSave(),13,3,lessons[13].solution);expect(writeSave(adapter,s)).toBe('');expect(readSave(adapter).save).toEqual(s);expect(readSave(adapter).save.complete).toBe(false);expect(readSave(adapter).save.unlocked).toBe(14);});
 it('new game preserves settings and clears progress',()=>{const s=completeLevel(newSave(),13,3);s.settings.music=0;const fresh=newSave(s.settings);expect(fresh.unlocked).toBe(0);expect(fresh.complete).toBe(false);expect(fresh.stars).toEqual({});expect(fresh.settings.music).toBe(0);});
 for(const value of ['{','null','[]','{"version":2}',JSON.stringify({...newSave(),selected:9}),JSON.stringify({...newSave(),stars:{2:4}}),JSON.stringify({...newSave(),drafts:{99:'LISTEN'}}),JSON.stringify({...newSave(),settings:{...newSave().settings,music:-1}})])it(`rejects malformed save ${value.slice(0,30)}`,()=>expect(()=>parseSave(value)).toThrow());
 it('recovers without mutating malformed storage',()=>{const storage={getItem:()=>'{broken'};expect(readSave(storage).error).not.toBe('');expect(readSave(storage).save).toEqual(newSave());expect(storage.getItem()).toBe('{broken');});
 it('reports storage write failure',()=>expect(writeSave({setItem:()=>{throw new Error('quota');}},newSave())).toContain('could not be saved'));
 it('uses versioned local storage key',()=>expect(SAVE_KEY).toContain('v1'));
});
