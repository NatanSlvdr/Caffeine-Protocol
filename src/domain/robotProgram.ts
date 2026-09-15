import type { Program, RobotRole } from './types';
import { availableCommands, compileProgram } from './program';
import { DIRECTIONS } from './directions';
export const MOVING_ROLES = ['prep','floor'] as const;
const movePattern = new RegExp(`^MOVE (${DIRECTIONS.join('|')}) ([1-9]|1[0-9])$`);
const directionalPickupPattern = new RegExp(`^(TAKE|PICKUP) (${DIRECTIONS.join('|')})$`);
const directionalDepositPattern = new RegExp(`^DEPOSIT (${DIRECTIONS.join('|')})$`);
/** Commands are role-gated; numbered MOVE operands are edited separately in the block editor. */
export function robotCommands(role:RobotRole,level:number):string[]{
 if(role==='query')return availableCommands(Math.min(level,14));
 const common=[...DIRECTIONS.map(direction=>`MOVE ${direction} 1`),'REPEAT','IF coffee','IF tea','IF sugar','ELSE','END'];
 if(role==='prep')return [...common,'WAIT TICKET',...DIRECTIONS.map(direction=>`TAKE ${direction}`),'GRIND','FILL WATER','BREW','STEEP','ADD SUGAR','DEPOSIT UP',...DIRECTIONS.filter(direction=>direction!=='UP').map(direction=>`DEPOSIT ${direction}`),...(level>=20?['FUNCTION recipe','CALL recipe','RETURN']:[])];
 return [...common,'FUNCTION deliver','CALL deliver','FUNCTION clear','CALL clear','RETURN','WAIT DRINK','TAKE DOWN',...DIRECTIONS.filter(direction=>direction!=='DOWN').map(direction=>`TAKE ${direction}`),'SERVE',...Array.from({length:10},(_,i)=>`IF TABLE ${i+1}`),...(level>=23?['WAIT DIRTY','COLLECT','RETURN CUPS']:[]),...(level>=27?['CHARGE','IF BATTERY < 40']:[])];
}
export function compileRobot(source:string,role:RobotRole,level=32):Program{
 if(role==='query')return compileProgram(source,Math.min(level,14));
 const p:Program={source,instructions:[],source_lines:[],ends:{},alternatives:{},positions:{},functions:{},compile_error:'',error_line:0,block_count:0};
 const stack:number[]=[],allowed=robotCommands(role,level);
 const fail=(message:string,line:number)=>{p.compile_error=message;p.error_line=line;return p;};
 for(const [line,raw] of source.split('\n').entries()){
  const c=raw.trim();if(!c||c.startsWith('#'))continue;
  const legacyAction = role==='prep' ? ['DEPOSIT','TAKE BEANS','TAKE LEAVES'].includes(c) : c==='PICKUP';
  if(!allowed.includes(c)&&!movePattern.test(c)&&!(role==='prep'&&directionalDepositPattern.test(c))&&!(role==='floor'&&directionalPickupPattern.test(c))&&!legacyAction)return fail(`Unknown or locked ${role} instruction: ${c}`,line);
  const i=p.instructions.length;p.instructions.push(c);p.source_lines.push(line);
  if(c.startsWith('IF ')||c.startsWith('FUNCTION ')){
   if(c.startsWith('FUNCTION ')){if(stack.length||p.functions[c.slice(9)]!==undefined)return fail('Functions must be unique and outside other blocks.',line);p.functions[c.slice(9)]=i;}
   stack.push(i);
  }else if(c==='ELSE'){const opening=stack.at(-1);if(opening===undefined||!p.instructions[opening].startsWith('IF ')||opening in p.alternatives)return fail('ELSE requires one matching IF.',line);p.alternatives[opening]=i;
  }else if(c==='END'){const opening=stack.pop();if(opening===undefined)return fail('END requires an opening block.',line);p.ends[opening]=i;p.ends[i]=opening;if(opening in p.alternatives)p.ends[p.alternatives[opening]]=i;}
 }
 if(stack.length)return fail('Close each IF and FUNCTION with END.',p.source_lines[stack.at(-1)!]);
 for(const [i,c] of p.instructions.entries())if(c.startsWith('CALL ')&&!(c.slice(5) in p.functions))return fail('Define the called function.',p.source_lines[i]);
 p.block_count=p.instructions.length;if(p.block_count>512)return fail('Moving robots have room for 512 blocks.',p.source_lines[512]);
 if(!p.block_count)return fail('Add instructions for this robot.',0);
 return p;
}
