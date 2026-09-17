/** Query language: command unlocks and the finite-instruction compiler. */
import type { Program } from '../types';
import { DIRECTIONS } from '../directions';
import { DEPOSIT_RE, MOVE_RE, TAKE_RE } from '../commands';
import { QUERY_MAX_BLOCKS } from '../constants';
import { isOpening } from '../scope';
import { QUERY_CONDITION_SOURCES, QUERY_CONDITION_VALUES, parseConditionExpression } from './conditions';
import { legacyQueryAction } from './migration';
import { VARIABLES, parseStore, parseSugarWrite } from './vars';

const writePattern = /^ITEM ([1-9]|1[0-9]) (coffee|tea)$/;

const tokenUnlocks: Record<string, number> = { coffee: 4, tea: 4, sugar: 6, negation: 7, number: 10, ambiguous: 11 };
function comparisonUnlocked(command: string, level: number) {
  const expression = parseConditionExpression(command);
  return !!expression && expression.conditions.every(condition => QUERY_CONDITION_SOURCES.some(source => source === condition.right) && level >= (tokenUnlocks[condition.left] ?? Infinity));
}

export function availableCommands(level: number): string[] {
  const c = ['LISTEN','TAKE UP','ITEM coffee','MOVE RIGHT 1','DEPOSIT RIGHT'];
  if (level >= 3) c.push(...DIRECTIONS.filter(direction => direction !== 'UP').map(direction => `TAKE ${direction}`), ...DIRECTIONS.filter(direction => direction !== 'RIGHT').map(direction => `DEPOSIT ${direction}`), ...DIRECTIONS.filter(direction => direction !== 'RIGHT').map(direction => `MOVE ${direction} 1`));
  if(level>=4)c.push(...QUERY_CONDITION_VALUES.filter(token => level >= tokenUnlocks[token]).map(token => `IF ${token} IN CUSTOMER SPEECH`),'ELSE','END','ITEM tea');
  if(level>=5)c.push('POSITION listen','JUMP listen','REPEAT');
  if(level>=6)c.push('WRITE 1 sugar','WRITE 0 sugar');
  if(level>=9)c.push('FOR item IN heard orders');
  if(level>=10)c.push('STORE var1 FROM number','WRITE var1 sugar');
  if(level>=11)c.push('HELP','ERROR');
  return c;
}
/** Compile the finite instruction language; player text is never evaluated as JavaScript. */
export function compileProgram(source: string, level = 14): Program {
  const p: Program = {source,instructions:[],source_lines:[],ends:{},alternatives:{},positions:{},functions:{},compile_error:'',error_line:0,block_count:0};
  const stack: number[] = [], allowed = availableCommands(level);
  const fail = (message: string) => {p.compile_error=message;return p;};
  for(const [line,raw] of source.split('\n').entries()) {
    const c=raw.trim(); p.error_line=line;
    if(!c || c.startsWith('#'))continue;
    const sugar=parseSugarWrite(c);
    const stored=parseStore(c);
    const dataInstruction=(level>=10&&!!stored&&VARIABLES.some(variable=>variable===stored.variable))||(level>=6&&sugar!==undefined&&(/^\d+$/.test(sugar)||level>=10&&VARIABLES.some(variable=>variable===sugar)))||(level>=6&&/^SUGAR (true|false)$/.test(c))||(level>=10&&['READ number','SUGAR number'].includes(c));
    if(!dataInstruction&&!allowed.includes(c)&&!legacyQueryAction(c)&&!(level>=5&&/^(POSITION|JUMP) [a-z][a-z0-9_]*$/.test(c))&&!(level>=3&&(TAKE_RE.test(c)||DEPOSIT_RE.test(c)||MOVE_RE.test(c)))&&!(level>=3&&writePattern.test(c)&&(level>=4||c.endsWith('coffee')))&&!comparisonUnlocked(c, level))return fail('Unknown or locked instruction: '+c);
    if(parseConditionExpression(c)?.conditions.some(condition=>condition.right==='item')&&!stack.some(i=>p.instructions[i].startsWith('FOR ')))return fail('The item source is available only inside FOR. Use customer speech here.');
    const at=p.instructions.length; p.instructions.push(c); p.source_lines.push(line);
    if(c.startsWith('POSITION ')){const label=c.slice(9);if(label in p.positions)return fail('Duplicate position: '+label);p.positions[label]=at;}
    if(isOpening(c)){
      if(c.startsWith('FOR ')&&stack.some(i=>p.instructions[i].startsWith('FOR ')))return fail('Do not nest FOR blocks.');
      if(c.startsWith('FUNCTION ')){const label=c.slice(9);if(stack.length||label in p.functions)return fail('Functions must be unique and placed outside other blocks.');p.functions[label]=at;}
      stack.push(at);
    } else if(c==='ELSE'){
      const start=stack.at(-1);if(start===undefined||!p.instructions[start].startsWith('IF ')||start in p.alternatives)return fail('ELSE belongs inside one IF block.');p.alternatives[start]=at;
    } else if(c==='END'){
      const start=stack.pop();if(start===undefined)return fail('END needs an IF, FOR or FUNCTION above it.');p.ends[start]=at;p.ends[at]=start;if(start in p.alternatives)p.ends[p.alternatives[start]]=at;
    }
  }
  if(stack.length)p.compile_error='Close each IF, FOR and FUNCTION with END.';
  else if(p.instructions[0]!=='LISTEN'&&!p.instructions[0]?.startsWith('POSITION '))p.compile_error='Start with Wait for customer speech, or a jump destination.';
  else if(p.instructions.filter(c=>c==='LISTEN').length!==1)p.compile_error='Use one Wait for customer speech; jump back to it for continuous service.';
  else if(p.instructions.includes('REPEAT')&&(p.instructions.at(-1)!=='REPEAT'||p.instructions.filter(c=>c==='REPEAT').length>1))p.compile_error='REPEAT belongs once, at the very end.';
  p.instructions.forEach((c,i)=>{if(c.startsWith('JUMP ')&&!(c.slice(5) in p.positions)){p.compile_error='Jump target has no matching Position block.';p.error_line=p.source_lines[i];}if(c.startsWith('CALL ')&&!(c.slice(5) in p.functions)){p.compile_error='Define the function before calling it.';p.error_line=p.source_lines[i];}});
  p.block_count=p.instructions.length;if(p.block_count>QUERY_MAX_BLOCKS)p.compile_error='Query has room for at most 128 blocks.';
  return p;
}
