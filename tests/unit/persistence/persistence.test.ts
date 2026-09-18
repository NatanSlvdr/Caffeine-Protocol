import { describe, it, expect } from 'vitest';
import { lessons } from '../../../src/data';
import { completeLevel, incomingProgram, newSave, parseSave, readSave, SAVE_KEY, writeSave } from '../../../src/features/campaign/save/persistence';

describe('persistence',()=>{
 it('round trips every save field',()=>{let s=newSave();s=completeLevel(s,2,3,lessons[2].solution,lessons);s.drafts[2]='# comment\nLISTEN';s.story[2]=true;expect(parseSave(JSON.stringify(s),lessons)).toEqual(s);});
 it('preserves best stars and passing source over a broken draft',()=>{let s=completeLevel(newSave(),2,3,lessons[2].solution,lessons);s=completeLevel(s,2,1,'',lessons);s.drafts[2]='broken later edit';expect(s.stars[2]).toBe(3);expect(incomingProgram(s,3,lessons)).toBe(lessons[2].solution);expect(s.unlocked).toBe(3);});
 it('persists to storage and reloads',()=>{const storage=new Map<string,string>();const adapter={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>{storage.set(k,v);}};const s=completeLevel(newSave(),13,3,lessons[13].solution,lessons);expect(writeSave(adapter,s)).toBe('');expect(readSave(adapter,lessons).save).toEqual(s);expect(readSave(adapter,lessons).save.complete).toBe(false);expect(readSave(adapter,lessons).save.unlocked).toBe(14);});
 it('new game preserves settings and clears progress',()=>{const s=completeLevel(newSave(),13,3,'',lessons);s.settings.music=0;const fresh=newSave(s.settings);expect(fresh.unlocked).toBe(0);expect(fresh.complete).toBe(false);expect(fresh.stars).toEqual({});expect(fresh.settings.music).toBe(0);});
 for(const value of ['{','null','[]','{"version":2}',JSON.stringify({...newSave(),selected:9}),JSON.stringify({...newSave(),stars:{2:4}}),JSON.stringify({...newSave(),drafts:{99:'LISTEN'}}),JSON.stringify({...newSave(),settings:{...newSave().settings,music:-1}})])it(`rejects malformed save ${value.slice(0,30)}`,()=>expect(()=>parseSave(value,lessons)).toThrow());
 it('recovers without mutating malformed storage',()=>{const storage={getItem:()=>'{broken'};expect(readSave(storage,lessons).error).not.toBe('');expect(readSave(storage,lessons).save).toEqual(newSave());expect(storage.getItem()).toBe('{broken');});
 it('reports storage write failure',()=>expect(writeSave({setItem:()=>{throw new Error('quota');}},newSave())).toContain('could not be saved'));
 it('uses versioned local storage key',()=>expect(SAVE_KEY).toContain('v1'));
});
