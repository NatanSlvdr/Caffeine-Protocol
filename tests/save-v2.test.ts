import { describe,it,expect } from 'vitest';
import { completeLevel,incomingRobotPrograms,newSave,parseSave,readSave,saveRobotDraft,writeSave } from '../src/features/campaign/save/persistence';
import { lessons } from '../src/data';
import { referencePrograms } from '../src/data/extension';

describe('version 3 campaign saves',()=>{
 it.each([1,2])('resets incompatible Query programs from version %i while preserving unlocks and settings',version=>{
  const source='LISTEN\nEACH\nITEM heard\nSUGAR heard\nEND';
  const save={...newSave(),version,selected:13,unlocked:13,drafts:{13:source},solutions:{13:source},stars:{13:2},story:{13:true},robotDrafts:{13:{query:source,prep:'',floor:''}},robotSolutions:{13:{query:source,prep:'',floor:''}}};
  const migrated=parseSave(JSON.stringify(save),lessons);
  expect(migrated.version).toBe(3);expect(migrated.unlocked).toBe(13);expect(migrated.selected).toBe(13);
  expect(migrated.drafts).toEqual({});expect(migrated.solutions).toEqual({});expect(migrated.robotSolutions).toEqual({});
  expect(migrated.robotDrafts[13].query).toBe(lessons[13].starter);
  expect(migrated.stars).toEqual({});expect(migrated.story).toEqual({});expect(migrated.settings).toEqual(save.settings);
 });
 it('preserves kitchen and floor routines when resetting Query in later acts',()=>{
  const programs={query:'LISTEN\nITEM heard',prep:'WAIT TICKET\nCALL recipe',floor:'WAIT DRINK\nTAKE DOWN'};
  const save={...newSave(),version:2,selected:23,unlocked:23,robotDrafts:{23:programs},robotSolutions:{23:programs},stars:{13:3,23:2},story:{7:true,23:true}};
  const migrated=parseSave(JSON.stringify(save),lessons);
  expect(migrated.robotDrafts[23]).toEqual({...programs,query:lessons[23].starter});
  expect(migrated.robotSolutions[23].prep).toBe(programs.prep);expect(migrated.robotSolutions[23].floor).toBe(programs.floor);
  expect(migrated.stars).toEqual({23:2});expect(migrated.story).toEqual({23:true});
  expect(parseSave(JSON.stringify(migrated),lessons)).toEqual(migrated);
 });
 it('keeps the non-charging path when importing an old Porter routine',()=>{
  const source='# my route\nWAIT DRINK\nIF BATTERY < 40\nMOVE LEFT 2\nCHARGE\nMOVE RIGHT 2\nELSE\nTAKE DOWN\nEND\nSERVE';
  const save={...newSave(),robotDrafts:{0:{query:'LISTEN',prep:'',floor:source}}};
  const restored=parseSave(JSON.stringify(save),lessons);
  expect(restored.robotDrafts[0].floor).toBe('# my route\nWAIT DRINK\nTAKE DOWN\nSERVE');
 });
 it('keeps Act II unlocked for completed legacy Act I',()=>{
  const legacy={...newSave(),version:1,selected:13,unlocked:13,complete:true,solutions:{13:'ITEM heard'}};
  const migrated=parseSave(JSON.stringify(legacy),lessons);
  expect(migrated.unlocked).toBe(14);expect(migrated.complete).toBe(false);expect(migrated.solutions).toEqual({});
  expect(incomingRobotPrograms(migrated,14,lessons).prep).toContain('TODO');
 });
 it('keeps independent role drafts and solutions across reload',()=>{
  let save=completeLevel(newSave(),22,3,'',lessons);const programs={query:'LISTEN',prep:'MOVE UP 2',floor:'MOVE DOWN 3'};save=saveRobotDraft(save,22,programs);save.robotSolutions[22]=referencePrograms(23);
  const storage=new Map<string,string>();const adapter={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>{storage.set(key,value);}};
  expect(writeSave(adapter,save)).toBe('');const restored=readSave(adapter,lessons).save;expect(restored).toEqual(save);expect(incomingRobotPrograms(restored,23,lessons)).toEqual(save.robotSolutions[22]);
 });
 it('enables pixel art when loading saves created before the display option existed',()=>{
  const oldSave=newSave();delete (oldSave.settings as Partial<typeof oldSave.settings>).pixel_art;
  expect(parseSave(JSON.stringify(oldSave),lessons).settings.pixel_art).toBe(true);
  expect(()=>parseSave(JSON.stringify({...newSave(),settings:{...newSave().settings,pixel_art:'yes'}}),lessons)).toThrow('Invalid display setting.');
 });
 it('introduces Porter with a starter while preserving Query and Brew',()=>{
  const save=completeLevel(newSave(),21,3,'',lessons);save.robotSolutions[21]={...referencePrograms(22),query:'# custom Query',prep:'# custom Brew'};const next=incomingRobotPrograms(save,22,lessons);expect(next.query).toBe('# custom Query');expect(next.prep).toBe('# custom Brew');expect(next.floor).toContain('TODO');
 });
 it('unlocks the new acts and completes only at shift 32',()=>{expect(completeLevel(newSave(),13,3,'',lessons).complete).toBe(false);const end=completeLevel(newSave(),31,3,'',lessons);expect(end.complete).toBe(true);expect(end.unlocked).toBe(31);expect(parseSave(JSON.stringify(end),lessons)).toEqual(end);});
 it('rejects malformed role data and out-of-range shifts without replacing storage',()=>{
  for(const value of [{...newSave(),robotDrafts:{15:{query:'LISTEN',prep:2,floor:''}}},{...newSave(),robotSolutions:{32:referencePrograms(32)}},{...newSave(),complete:true}])expect(()=>parseSave(JSON.stringify(value),lessons)).toThrow();
 });
});
