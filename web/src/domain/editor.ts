import { isOpening } from './program';
import type { ProgramBlock } from './types';
export const textToBlocks=(source:string):ProgramBlock[]=>source.split('\n').map((command,sourceLine)=>({id:String(sourceLine),command,sourceLine}));
export const blocksToText=(blocks:ProgramBlock[])=>blocks.map(b=>b.command).join('\n');
export function insertBlock(source:string,command:string,selected=-1){const lines=source?source.split('\n'):[];const at=selected<0?lines.length:Math.min(selected+1,lines.length);lines.splice(at,0,command,...(isOpening(command)?['END']:[]));return {source:lines.join('\n'),selected:at};}
export function groupEnd(lines:string[],from:number){let end=from;if(isOpening(lines[from].trim())){let depth=1;while(end+1<lines.length&&depth){const c=lines[++end].trim();if(isOpening(c))depth++;if(c==='END')depth--;}}return end;}
export function moveGroup(source:string,from:number,to:number){const lines=source.split('\n'),end=groupEnd(lines,from);if(to>=from&&to<=end)return source;const moved=lines.splice(from,end-from+1);if(to>end)to-=moved.length;lines.splice(Math.max(0,to),0,...moved);return lines.join('\n');}
export function moveBlock(source:string,from:number,delta:number){const lines=source.split('\n'),to=Math.max(0,Math.min(lines.length-1,from+delta));[lines[from],lines[to]]=[lines[to],lines[from]];return lines.join('\n');}
export function deleteBlock(source:string,line:number){return source.split('\n').filter((_,i)=>i!==line).join('\n');}
