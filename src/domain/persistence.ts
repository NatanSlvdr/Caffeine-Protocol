import type { ProgressSaveV1,Settings } from './types';
import { lessons } from '../data';
export const SAVE_KEY='caffeine-protocol.v1';
export const defaultSettings:Settings={volume:.6,music:.55,effects:.65,reduced_motion:false,fullscreen:false};
export const newSave=(settings:Settings={...defaultSettings}):ProgressSaveV1=>({version:1,selected:0,unlocked:0,complete:false,drafts:{},solutions:{},stars:{},story:{},settings:{...settings}});
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const index=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=13;
/** Validate an entire import before replacing anything in the active save. */
export function parseSave(text:string):ProgressSaveV1 {
  if(text.length>2_000_000)throw new Error('This save is too large. Choose a Caffeine Protocol JSON export.');
  const v:unknown=JSON.parse(text);
  if(!record(v)||v.version!==1)throw new Error('Unsupported save version. Your current café has been kept.');
  if(!index(v.selected)||!index(v.unlocked)||v.selected>v.unlocked||typeof v.complete!=='boolean')throw new Error('Invalid campaign progress.');
  for(const key of ['drafts','solutions','stars','story']){
    const entries=v[key];if(!record(entries))throw new Error(`Missing ${key} data.`);
    for(const [k,value] of Object.entries(entries)){
      if(!/^(?:[0-9]|1[0-3])$/.test(k))throw new Error('Invalid shift in save.');
      if((key==='drafts'||key==='solutions')&&(typeof value!=='string'||value.length>100_000))throw new Error('Invalid program in save.');
      if(key==='stars'&&(typeof value!=='number'||!Number.isInteger(value)||value<0||value>3))throw new Error('Invalid star count.');
      if(key==='story'&&typeof value!=='boolean')throw new Error('Invalid story state.');
    }
  }
  if(!record(v.settings))throw new Error('Missing settings.');
  for(const k of ['volume','music','effects']){const n=v.settings[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)throw new Error('Invalid audio setting.');}
  for(const k of ['reduced_motion','fullscreen'])if(typeof v.settings[k]!=='boolean')throw new Error('Invalid display setting.');
  // Copy only the defined schema; extra imported properties never enter application state.
  return {version:1,selected:v.selected,unlocked:v.unlocked,complete:v.complete,drafts:{...v.drafts as Record<string,string>},solutions:{...v.solutions as Record<string,string>},stars:{...v.stars as Record<string,number>},story:{...v.story as Record<string,boolean>},settings:{volume:v.settings.volume as number,music:v.settings.music as number,effects:v.settings.effects as number,reduced_motion:v.settings.reduced_motion as boolean,fullscreen:v.settings.fullscreen as boolean}};
}
export function readSave(storage:Pick<Storage,'getItem'>):{save:ProgressSaveV1;error:string}{try{const raw=storage.getItem(SAVE_KEY);return {save:raw?parseSave(raw):newSave(),error:''};}catch{return {save:newSave(),error:'Saved progress could not be read. The original data is untouched; export a recovery copy in Settings before saving a new café.'};}}
export function writeSave(storage:Pick<Storage,'setItem'>,save:ProgressSaveV1):string{try{storage.setItem(SAVE_KEY,JSON.stringify(save));return '';}catch{return 'Progress could not be saved. Export your café from Settings to keep it.';}}
export function incomingProgram(save:ProgressSaveV1,index:number):string{return index<=2?lessons[index].starter:(save.solutions[index-1]??save.drafts[index-1]??lessons[index].starter);}
export function completeLevel(save:ProgressSaveV1,index:number,stars:number,source=''):ProgressSaveV1{return {...save,unlocked:Math.max(save.unlocked,Math.min(index+1,13)),complete:save.complete||index===13,stars:{...save.stars,[index]:Math.max(save.stars[index]??-1,stars)},solutions:source?{...save.solutions,[index]:source}:save.solutions};}
