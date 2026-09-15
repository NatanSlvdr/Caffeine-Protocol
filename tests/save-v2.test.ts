import { describe,it,expect } from 'vitest';
import { completeLevel,incomingRobotPrograms,newSave,parseSave,readSave,saveRobotDraft,writeSave } from '../src/domain/persistence';
import { lessons } from '../src/data';
import { referencePrograms } from '../src/data/extension';

describe('version 2 campaign saves',()=>{
 it.each([1,2])('removes retired payment blocks from version %i saves without losing other data',version=>{
  const source='# CHARGE ORDER was automatic\nLISTEN\n  CHARGE ORDER  \n\nMOVE LEFT 1';
  const expected='# CHARGE ORDER was automatic\nLISTEN\n\nMOVE LEFT 1';
  const save={...newSave(),version,selected:3,unlocked:3,drafts:{3:source},solutions:{3:source},stars:{3:2},robotDrafts:{3:{query:source,prep:'',floor:'CHARGE'}},robotSolutions:{3:{query:source,prep:'',floor:'CHARGE'}}};
  const migrated=parseSave(JSON.stringify(save));
  expect(migrated.drafts[3]).toBe(expected);expect(migrated.solutions[3]).toBe(expected);
  expect(migrated.robotDrafts[3].query).toBe(expected);expect(migrated.robotSolutions[3].query).toBe(expected);
  expect(incomingRobotPrograms(migrated,4).query).toBe(expected);
  expect(migrated.stars).toEqual(save.stars);expect(migrated.settings).toEqual(save.settings);
  if(version===2)expect(migrated.robotDrafts[3].floor).toBe('');
 });
 it('keeps the non-charging path when importing an old Porter routine',()=>{
  const source='# my route\nWAIT DRINK\nIF BATTERY < 40\nMOVE LEFT 2\nCHARGE\nMOVE RIGHT 2\nELSE\nTAKE DOWN\nEND\nSERVE';
  const save={...newSave(),robotDrafts:{0:{query:'LISTEN',prep:'',floor:source}}};
  const restored=parseSave(JSON.stringify(save));
  expect(restored.robotDrafts[0].floor).toBe('# my route\nWAIT DRINK\nTAKE DOWN\nSERVE');
 });
 it('migrates completed Act I while retaining all personal data',()=>{
  const legacy={version:1,selected:13,unlocked:13,complete:true,drafts:{13:'# my draft\nLISTEN'},solutions:{13:lessons[13].solution},stars:{13:3},story:{13:true},settings:{...newSave().settings,music:0}};
  const migrated=parseSave(JSON.stringify(legacy));expect(migrated.version).toBe(2);expect(migrated.unlocked).toBe(14);expect(migrated.selected).toBe(13);expect(migrated.complete).toBe(false);expect(migrated.robotDrafts[13].query).toBe(legacy.drafts[13]);expect(migrated.solutions).toEqual(legacy.solutions);expect(migrated.settings).toEqual(legacy.settings);expect(migrated.stars).toEqual(legacy.stars);expect(migrated.story).toEqual(legacy.story);
  const incoming=incomingRobotPrograms(migrated,14);expect(incoming.query).toBe(legacy.solutions[13]);expect(incoming.prep).toContain('TODO');
 });
 it('keeps independent role drafts and solutions across reload',()=>{
  let save=completeLevel(newSave(),22,3);const programs={query:'LISTEN',prep:'MOVE UP 2',floor:'MOVE DOWN 3'};save=saveRobotDraft(save,22,programs);save.robotSolutions[22]=referencePrograms(23);
  const storage=new Map<string,string>();const adapter={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>{storage.set(key,value);}};
  expect(writeSave(adapter,save)).toBe('');const restored=readSave(adapter).save;expect(restored).toEqual(save);expect(incomingRobotPrograms(restored,23)).toEqual(save.robotSolutions[22]);
 });
 it('enables pixel art when loading saves created before the display option existed',()=>{
  const oldSave=newSave();delete (oldSave.settings as Partial<typeof oldSave.settings>).pixel_art;
  expect(parseSave(JSON.stringify(oldSave)).settings.pixel_art).toBe(true);
  expect(()=>parseSave(JSON.stringify({...newSave(),settings:{...newSave().settings,pixel_art:'yes'}}))).toThrow('Invalid display setting.');
 });
 it('introduces Porter with a starter while preserving Query and Brew',()=>{
  const save=completeLevel(newSave(),21,3);save.robotSolutions[21]={...referencePrograms(22),query:'# custom Query',prep:'# custom Brew'};const next=incomingRobotPrograms(save,22);expect(next.query).toBe('# custom Query');expect(next.prep).toBe('# custom Brew');expect(next.floor).toContain('TODO');
 });
 it('unlocks the new acts and completes only at shift 32',()=>{expect(completeLevel(newSave(),13,3).complete).toBe(false);const end=completeLevel(newSave(),31,3);expect(end.complete).toBe(true);expect(end.unlocked).toBe(31);expect(parseSave(JSON.stringify(end))).toEqual(end);});
 it('rejects malformed role data and out-of-range shifts without replacing storage',()=>{
  for(const value of [{...newSave(),robotDrafts:{15:{query:'LISTEN',prep:2,floor:''}}},{...newSave(),robotSolutions:{32:referencePrograms(32)}},{...newSave(),complete:true}])expect(()=>parseSave(JSON.stringify(value))).toThrow();
 });
});
