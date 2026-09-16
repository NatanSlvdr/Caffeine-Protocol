
import type { ProgressSave,Settings,RobotPrograms,RobotRole } from './types';
import { lessons, CAMPAIGN_LENGTH } from '../data';
import { migrateQuerySource } from './program';
export const SAVE_KEY='caffeine-protocol.v1';
export const defaultSettings:Settings={volume:.6,music:.55,effects:.65,reduced_motion:false,pixel_art:true,fullscreen:false};
export const newSave=(settings:Settings={...defaultSettings}):ProgressSave=>({version:3,robotDrafts:{},robotSolutions:{},selected:0,unlocked:0,complete:false,drafts:{},solutions:{},stars:{},story:{},settings:{...settings}});
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
/** Migrate retired payment instructions without changing comments or other commands. */
function removeOrderCharge(source:string){return source.split('\n').filter(line=>line.trim()!=='CHARGE ORDER').join('\n');}
/** Retire charging from saved floor routines while keeping comments and non-charging branches. */
function cleanFloor(source:string){
 const lines=source.split('\n');
 for(let i=lines.length-1;i>=0;i--){
  if(lines[i].trim()!=='IF BATTERY < 40')continue;
  let depth=1,end=i+1,alternative=-1;
  for(;end<lines.length;end++){
   const command=lines[end].trim();
   if(/^(IF |FUNCTION |EACH$)/.test(command))depth++;
   if(command==='ELSE'&&depth===1)alternative=end;
   if(command==='END'&&!--depth)break;
  }
  if(end<lines.length)lines.splice(i,end-i+1,...(alternative<0?[]:lines.slice(alternative+1,end)));
 }
 return lines.filter(line=>line.trim()!=='CHARGE').join('\n');
}
const cleanQuery=(source:string)=>migrateQuerySource(removeOrderCharge(source));
const cleanQueryMap=(programs:Record<string,string>)=>Object.fromEntries(Object.entries(programs).map(([shift,source])=>[shift,cleanQuery(source)]));
const index=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<CAMPAIGN_LENGTH;
/** Validate an entire import before replacing anything in the active save. */
export function parseSave(text:string):ProgressSave {
  if(text.length>2_000_000)throw new Error('This save is too large. Choose a Caffeine Protocol JSON export.');
  const v:unknown=JSON.parse(text);
  if(!record(v)||(v.version!==1&&v.version!==2&&v.version!==3))throw new Error('Unsupported save version. Your current café has been kept.');
  if(!index(v.selected)||!index(v.unlocked)||v.selected>v.unlocked||typeof v.complete!=='boolean'||v.version===1&&v.unlocked>13||v.version!==1&&v.complete&&v.unlocked!==CAMPAIGN_LENGTH-1)throw new Error('Invalid campaign progress.');
  for(const key of ['drafts','solutions','stars','story']){
    const entries=v[key];if(!record(entries))throw new Error(`Missing ${key} data.`);
    for(const [k,value] of Object.entries(entries)){
      if(!/^(0|[1-9]\d*)$/.test(k)||!index(Number(k))||v.version===1&&Number(k)>13)throw new Error('Invalid shift in save.');
      if((key==='drafts'||key==='solutions')&&(typeof value!=='string'||value.length>100_000))throw new Error('Invalid program in save.');
      if(key==='stars'&&(typeof value!=='number'||!Number.isInteger(value)||value<0||value>3))throw new Error('Invalid star count.');
      if(key==='story'&&typeof value!=='boolean')throw new Error('Invalid story state.');
    }
  }
  if(!record(v.settings))throw new Error('Missing settings.');
  for(const k of ['volume','music','effects']){const n=v.settings[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)throw new Error('Invalid audio setting.');}
  for(const k of ['reduced_motion','fullscreen'])if(typeof v.settings[k]!=='boolean')throw new Error('Invalid display setting.');
  if(v.settings.pixel_art!==undefined&&typeof v.settings.pixel_art!=='boolean')throw new Error('Invalid display setting.');
  const robotMaps: {robotDrafts:Record<string,RobotPrograms>;robotSolutions:Record<string,RobotPrograms>}={robotDrafts:{},robotSolutions:{}};
  if(v.version!==1)for(const key of ['robotDrafts','robotSolutions'] as const){
    const entries=v[key];if(!record(entries))throw new Error(`Missing ${key} data.`);
    for(const [shift,programs] of Object.entries(entries)){
      if(!/^\d+$/.test(shift)||!index(Number(shift))||!record(programs))throw new Error('Invalid robot program collection.');
      for(const role of ['query','prep','floor'])if(typeof programs[role]!=='string'||programs[role].length>100_000)throw new Error('Invalid robot source.');
      robotMaps[key][shift]={query:cleanQuery(programs.query as string),prep:programs.prep as string,floor:cleanFloor(programs.floor as string)};
    }
  }
  if(v.version===1)for(const [flat,mapped] of [['drafts','robotDrafts'],['solutions','robotSolutions']] as const)for(const [shift,query] of Object.entries(v[flat] as Record<string,string>))robotMaps[mapped][shift]={query:cleanQuery(query),prep:'',floor:''};
  // Semantic-copy programs cannot be translated into the new token puzzles.
  // Preserve unlocks and other robots, but retire Query drafts, scores and story beats.
  if(v.version!==3){
    for(const key of ['robotDrafts','robotSolutions'] as const){
      for(const [shift,programs] of Object.entries(robotMaps[key])){
        if(key==='robotSolutions'&&Number(shift)<14)delete robotMaps[key][shift];
        else programs.query=lessons[Number(shift)].starter;
      }
    }
    const keepLater=(entries:Record<string,unknown>)=>Object.fromEntries(Object.entries(entries).filter(([shift])=>Number(shift)>=14));
    v.drafts={};v.solutions={};v.stars=keepLater(v.stars as Record<string,unknown>);v.story=keepLater(v.story as Record<string,unknown>);
  }
  return {version:3,...robotMaps,selected:v.selected,unlocked:v.version===1&&v.complete?14:v.unlocked,complete:v.version!==1&&v.complete,drafts:cleanQueryMap(v.drafts as Record<string,string>),solutions:cleanQueryMap(v.solutions as Record<string,string>),stars:{...v.stars as Record<string,number>},story:{...v.story as Record<string,boolean>},settings:{volume:v.settings.volume as number,music:v.settings.music as number,effects:v.settings.effects as number,reduced_motion:v.settings.reduced_motion as boolean,pixel_art:v.settings.pixel_art as boolean|undefined??true,fullscreen:v.settings.fullscreen as boolean}};
}
export function readSave(storage:Pick<Storage,'getItem'>):{save:ProgressSave;error:string}{try{const raw=storage.getItem(SAVE_KEY);return {save:raw?parseSave(raw):newSave(),error:''};}catch{return {save:newSave(),error:'Saved progress could not be read. The original data is untouched; export a recovery copy in Settings before saving a new café.'};}}
export function writeSave(storage:Pick<Storage,'setItem'>,save:ProgressSave):string{try{storage.setItem(SAVE_KEY,JSON.stringify(save));return '';}catch{return 'Progress could not be saved. Export your café from Settings to keep it.';}}
export function incomingProgram(save:ProgressSave,index:number):string{return cleanQuery(index<=2?lessons[index].starter:(save.solutions[index-1]??save.drafts[index-1]??lessons[index].starter));}
export function completeLevel(save:ProgressSave,index:number,stars:number,source=''):ProgressSave{return {...save,unlocked:Math.max(save.unlocked,Math.min(index+1,CAMPAIGN_LENGTH-1)),complete:save.complete||index===CAMPAIGN_LENGTH-1,stars:{...save.stars,[index]:Math.max(save.stars[index]??-1,stars)},solutions:source?{...save.solutions,[index]:source}:save.solutions};}

/** Carry the last passing program forward independently for every unlocked robot. */
export function incomingRobotPrograms(save:ProgressSave,index:number):RobotPrograms{
 const lesson=lessons[index],defaults=lesson.robotStarter??{query:incomingProgram(save,index),prep:'',floor:''};
 const previous=save.robotSolutions[index-1]??save.robotDrafts[index-1];
 return {query:cleanQuery(save.drafts[index]??previous?.query??incomingProgram(save,index)),prep:index===14?defaults.prep:previous?.prep??defaults.prep,floor:cleanFloor(index===22?defaults.floor:previous?.floor??defaults.floor)};
}
export function saveRobotDraft(save:ProgressSave,index:number,programs:RobotPrograms):ProgressSave{return {...save,selected:index,drafts:{...save.drafts,[index]:programs.query},robotDrafts:{...save.robotDrafts,[index]:programs}};}
export function robotSource(save:ProgressSave,index:number,role:RobotRole){return (save.robotDrafts[index]??incomingRobotPrograms(save,index))[role];}
