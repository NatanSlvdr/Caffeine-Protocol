import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { availableCommands, compileProgram } from '../../../src/domain/program';
import { buildReplayTimeline } from '../../../src/domain/simulation';
import { runCampaignLevel as run } from '../../helpers/run';

describe('redesigned Act I campaign',()=>{
 for(const [i,level] of levels.slice(0,14).entries()){
  it(`${level.id}: reference passes every authored seed with valid source traces`,()=>{
   const actual=run(i);expect(actual.first_failure).toBeNull();expect(actual.passed).toBe(true);
   expect(actual.passed_seeds).toBe(level.seeds.length);
   for(const event of actual.events)for(const step of event.trace)expect(lessons[i].solution.split('\n')[step.line].trim()).toBe(step.command);
   if(i>=2)expect(actual.stars).toBe(3);
   expect(buildReplayTimeline(actual).every(t=>t.end>=t.start)).toBe(true);
  });
  if([2,3,4,5,6,8,9,10].includes(i))it(`${level.id}: incoming routine fails the new mechanic`,()=>expect(run(i,lessons[i].starter).passed).toBe(false));
 }
 it('manual rush builds a measurable backlog',()=>{const r=run(1);expect(r.events.at(-1)!.satisfaction).toBeLessThan(r.events[0].satisfaction);});
 it('repeated runs are deterministic without input mutation',()=>{const before=JSON.stringify(levels);expect(run(13)).toEqual(run(13));expect(JSON.stringify(levels)).toBe(before);});
 it.each([
  ['coffee',['coffee'],undefined],['tea please',['tea'],undefined],
  ['coffee with sugar',['coffee','sugar'],undefined],
  ['coffee without sugar',['coffee','sugar','negation'],undefined],
  ['coffee no sugar',['coffee','sugar','negation'],undefined],
  ['coffee, but no sugar please',['coffee','sugar','negation'],undefined],
  ['tea with 2 sugars',['tea','sugar','number'],2],
 ])('authors recognized tokens for %s',(phrase,tokens,number)=>{
  const customer=levels.slice(0,14).flatMap(l=>l.seeds.flatMap(s=>s.customers)).find(c=>c.phrase===phrase)!;
  expect(customer.heard_orders).toEqual([{tokens,...(number===undefined?{}:{number})}]);
 });
 it('unlocks only the intended syntax at each milestone',()=>{
  expect(availableCommands(5)).not.toContain('SUGAR true');
  expect(availableCommands(6)).toContain('IF sugar IN CUSTOMER SPEECH');
  expect(availableCommands(6)).not.toContain('IF negation IN CUSTOMER SPEECH');
  expect(availableCommands(7)).toContain('IF negation IN CUSTOMER SPEECH');
  expect(availableCommands(8)).toEqual(availableCommands(7));
  expect(availableCommands(9)).toContain('FOR item IN heard orders');
  expect(availableCommands(10)).not.toContain('HELP');
  expect(availableCommands(11)).toContain('HELP');
  for(const command of ['EACH','ITEM heard','SUGAR heard','SUGAR binary','READ sugar','SUGAR variable','FUNCTION build_ticket','CALL build_ticket','RETURN','IF tea'])expect(compileProgram(`LISTEN\n${command}`).compile_error).toContain('locked');
 });
});
