import { orderTotal } from './pricing';
import type { Customer, CustomerExecution, OrderTicket, Program, RuntimeState, SpeechIntent, HeardOrder } from './types';
import { DIRECTIONS } from './directions';
import { samePoint, STARTS, STATIONS } from './layout';
import { interactionTarget, moveQuery, queryPosition } from './queryMovement';
export const LIMIT = 1024;
export const isOpening = (command: string) => command.startsWith('FOR ') || command.startsWith('IF ') || command.startsWith('FUNCTION ');
export const CONDITION_OPERATORS = ['IN', 'NOT IN'] as const;
export const CONDITION_VALUES = ['coffee', 'tea', 'sugar', 'negation', 'number', 'ambiguous'] as const;
export const CONDITION_SOURCES = ['item'] as const;
export interface ComparisonCondition { left: string; operator: typeof CONDITION_OPERATORS[number]; right: string }
/** Membership operands stay independent of the token vocabulary and source registry. */
export function parseComparison(command: string): ComparisonCondition | undefined {
  const match = /^IF ([a-z][a-z0-9_]*) (IN|NOT IN) ([a-z][a-z0-9_]*)$/.exec(command);
  return match ? { left: match[1], operator: match[2] as ComparisonCondition['operator'], right: match[3] } : undefined;
}
export const CONDITION_CONNECTORS = ['AND', 'OR'] as const;
export interface ConditionExpression { conditions: ComparisonCondition[]; connectors: (typeof CONDITION_CONNECTORS[number])[] }
/** AND binds more tightly than OR; compound conditions remain one IF instruction. */
export function parseConditionExpression(command: string): ConditionExpression | undefined {
  const parts = command.split(/ (AND|OR) /);
  const conditions: ComparisonCondition[] = [];
  const connectors: ConditionExpression['connectors'] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const condition = parseComparison(index === 0 ? parts[index] : `IF ${parts[index]}`);
    if (!condition) return undefined;
    conditions.push(condition);
    if (index > 0) connectors.push(parts[index - 1] as typeof CONDITION_CONNECTORS[number]);
  }
  return { conditions, connectors };
}
export function formatConditionExpression(expression: ConditionExpression) {
  return 'IF ' + expression.conditions.map((condition, index) => `${index ? expression.connectors[index - 1] + ' ' : ''}${condition.left} ${condition.operator} ${condition.right}`).join(' ');
}
export function isComparisonCondition(command: string) { return !!parseConditionExpression(command); }
const tokenUnlocks: Record<string, number> = { coffee: 4, tea: 4, sugar: 6, negation: 7, number: 10, ambiguous: 11 };
export function comparisonUnlocked(command: string, level: number) {
  const expression = parseConditionExpression(command);
  return !!expression && expression.conditions.every(condition => condition.right === 'item' && level >= (tokenUnlocks[condition.left] ?? Infinity));
}
export interface ForInstruction { variable: string; selector: string }
export const LOOP_VARIABLES = ['item'] as const;
/** Selectors resolve collections; the loop engine only binds and advances values. */
const collectionSelectors: Record<string, (orders: HeardOrder[]) => HeardOrder[]> = {
  'heard orders': orders => orders,
};
export const LOOP_SELECTORS = Object.keys(collectionSelectors);
export function parseFor(command: string): ForInstruction | undefined {
  const match = /^FOR ([a-z][a-z0-9_]*) IN ([a-z][a-z ]*)$/.exec(command);
  return match ? { variable: match[1], selector: match[2] } : undefined;
}
const queryDirectionalPattern = new RegExp(`^(TAKE|PICKUP|DEPOSIT) (${DIRECTIONS.join('|')})$`);
const movePattern = new RegExp(`^MOVE (${DIRECTIONS.join('|')}) ([1-9]|1[0-9])$`);
const legacyQueryAction = (command: string) => command === 'TICKET' || command === 'SUBMIT' || /^MOVE (RIGHT|LEFT) 1$/.test(command);
export const isPaperPickup = (command: string) => command === 'TICKET' || /^(TAKE|PICKUP) (UP|UP_RIGHT|RIGHT|DOWN_RIGHT|DOWN|DOWN_LEFT|LEFT|UP_LEFT)$/.test(command);
export const isOrderDeposit = (command: string) => command === 'SUBMIT' || /^DEPOSIT (UP|UP_RIGHT|RIGHT|DOWN_RIGHT|DOWN|DOWN_LEFT|LEFT|UP_LEFT)$/.test(command);

/** Rename old actions without removing movement, comments, or formatting. */
export function migrateQuerySource(source: string): string {
  const lines = source.split('\n');
  // Restore the handoff steps in saves from the brief stationary-PICKUP version.
  const stationaryPickup = lines.some(line => line.trim().startsWith('PICKUP ')) && !lines.some(line => line.trim().startsWith('MOVE '));
  return lines.map(raw => {
    const command = raw.trim();
    const indent = raw.slice(0, raw.length - raw.trimStart().length);
    const trailing = raw.slice(raw.trimEnd().length);
    if (stationaryPickup && command === 'DEPOSIT RIGHT') return `${indent}MOVE RIGHT 1\n${raw}\n${indent}MOVE LEFT 1`;
    if (command === 'TICKET') return indent + 'TAKE UP' + trailing;
    if (command === 'SUBMIT') return indent + 'DEPOSIT RIGHT' + trailing;
    if (command.startsWith('PICKUP ')) return indent + command.replace('PICKUP ', 'TAKE ') + trailing;
    return raw;
  }).join('\n');
}
export function availableCommands(level: number): string[] {
  const c = ['LISTEN','TAKE UP','ITEM coffee','MOVE RIGHT 1','DEPOSIT RIGHT'];
  if (level >= 3) c.push(...DIRECTIONS.filter(direction => direction !== 'UP').map(direction => `TAKE ${direction}`), ...DIRECTIONS.filter(direction => direction !== 'RIGHT').map(direction => `DEPOSIT ${direction}`), ...DIRECTIONS.filter(direction => direction !== 'RIGHT').map(direction => `MOVE ${direction} 1`));
  if(level>=4)c.push(...CONDITION_VALUES.filter(token => level >= tokenUnlocks[token]).map(token => `IF ${token} IN item`),'ELSE','END','ITEM tea');
  if(level>=5)c.push('POSITION listen','JUMP listen','REPEAT');
  if(level>=6)c.push('SUGAR true','SUGAR false');
  if(level>=9)c.push('FOR item IN heard orders');
  if(level>=10)c.push('READ number','SUGAR number');
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
    if(!allowed.includes(c)&&!legacyQueryAction(c)&&!(level>=5&&/^(POSITION|JUMP) [a-z][a-z0-9_]*$/.test(c))&&!(level>=3&&(queryDirectionalPattern.test(c)||movePattern.test(c)))&&!comparisonUnlocked(c, level))return fail('Unknown or locked instruction: '+c);
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
  p.block_count=p.instructions.length;if(p.block_count>128)p.compile_error='Query has room for at most 128 blocks.';
  return p;
}
export function createTicket(customer: Customer, id: string, intent: SpeechIntent = {}): OrderTicket {
  return {ticket_id:id,customer_id:customer.customer_id,table_id:null,source_phrase:customer.phrase,source_intent:structuredClone(intent),item:'',with_sugar:false,sugar_count:null,status:'created',created_at:customer.arrival,due_at:customer.arrival+30,debug_notes:''};
}
/** Resume at the next speech event, returning a new state without mutating inputs. */
export function* streamCustomerEvent(p: Program, customer: Customer, id: string, initial: RuntimeState = {pc:0,stopped:false}, checkWrittenOrder = false): Generator<CustomerExecution, CustomerExecution> {
  const out: CustomerExecution={tickets:[],asked_help:false,error:'',executed_instructions:0,trace:[],state:{...initial}};
  const fail=(message:string)=>{out.error=message;return out;};
  if(p.compile_error){out.error_line=p.error_line;return fail(p.compile_error);}
  if(initial.stopped)return fail('Query stopped listening. Jump to the listen position after serving.');
  let orders=structuredClone(customer.heard_orders), vars: {number?:number}={}, ticket: OrderTicket|undefined, heard=false;
  const bindings: Record<string, HeardOrder | undefined> = { item: orders[0] };
  const ambiguous = () => orders.some(order => order.tokens.includes('ambiguous'));
  // Checkout is automatic once the complete paper order is deposited.
  const finish=()=>{
    if(!out.error&&out.tickets.length&&!out.payment){
      if(ticket)return fail('Deposit the current paper before finishing the order.');
      if(out.state.counter)return fail('Return to the register after depositing the order.');
      out.payment={amount:orderTotal(out.tickets),ticketIds:out.tickets.map(t=>t.ticket_id)};
    }
    return out;
  };
  const loops: {start:number;variable:string;values:HeardOrder[];index:number;previous:HeardOrder|undefined}[]=[], calls:{return:number;variables:typeof vars;loop_depth:number}[]=[];
  while(out.state.pc<p.instructions.length){
    const pc=out.state.pc,raw=p.instructions[pc];
    const c=raw==='TICKET'?'TAKE UP':raw==='SUBMIT'?'DEPOSIT RIGHT':raw.replace(/^PICKUP /,'TAKE ');
    if(out.executed_instructions>=LIMIT)return fail('Instruction limit reached. A loop must return to Wait for customer speech.');
    if(c==='LISTEN'&&heard)return finish();
    out.executed_instructions++;out.error_line=p.source_lines[pc];out.trace.push({line:p.source_lines[pc],command:p.instructions[pc],function_depth:calls.length});
    if(!checkWrittenOrder||!['END','ELSE'].includes(c)&&!c.startsWith('POSITION '))yield out;
    if(!heard&&(c==='HELP'||c.startsWith('FOR ')||c.startsWith('READ ')))return fail('No customer speech is available.');
    let next=pc+1;
    if(c.startsWith('IF ')){
      if(!heard)return fail('No customer speech is available.');
      const expression=parseConditionExpression(c);
      const yes=!!expression && evaluateConditionExpression(expression, bindings);
      if(!yes)next=(p.alternatives[pc]??p.ends[pc])+1;
    } else if(c.startsWith('FOR ')){
      const loop=parseFor(c);
      const resolve=loop && collectionSelectors[loop.selector];
      if(!loop||!resolve)return fail('Unsupported loop selector.');
      const values=resolve(orders);
      if(!values.length)next=p.ends[pc]+1;
      else {loops.push({start:pc,variable:loop.variable,values,index:0,previous:bindings[loop.variable]});bindings[loop.variable]=values[0];vars={};}
    } else if(c.startsWith('FUNCTION '))next=p.ends[pc]+1;
    else if(c.startsWith('CALL ')){
      if(calls.length)return fail('Recursive function calls are not supported.');
      calls.push({return:next,variables:{...vars},loop_depth:loops.length});vars={};next=p.functions[c.slice(5)]+1;
    } else if(c.startsWith('JUMP ')){
      if(calls.length||loops.length)return fail('Finish the function or FOR before jumping to listen.');next=p.positions[c.slice(5)];
    } else if(c.startsWith('MOVE ')){
      const position=moveQuery(queryPosition(out.state.counter),c);
      out.state.counter=position[0]===STARTS.query[0]?0:1;
    } else switch(c){
      case 'LISTEN':if(out.state.counter)return fail('Move left 1 tile to the register before waiting for customer speech.');heard=true;break;
      case 'HELP':
        if(ambiguous()){
          if(ticket||loops.length)return fail('Ask for clarification before taking paper or starting FOR.');
          out.asked_help=true;orders=structuredClone(customer.clarification_heard_orders??[]);bindings.item=orders[0];vars={};
          if(!orders.length){out.state={pc:0,stopped:!p.instructions.includes('REPEAT')&&!p.instructions.some(command=>command.startsWith('JUMP '))};return out;}
        }
        break;
      case 'ERROR':return fail('Query reported an unsupported order. Ask Niko for help before taking paper.');
      case 'ELSE':next=p.ends[pc]+1;break;
      case 'END':{
        const open=p.instructions[p.ends[pc]];
        if(open.startsWith('FOR ')){
          const loop=loops.at(-1);if(!loop)return fail('No active FOR block.');
          if(ticket)return fail('Deposit one paper per item before ending FOR.');
          loop.index++;vars={};
          if(loop.index<loop.values.length){bindings[loop.variable]=loop.values[loop.index];next=loop.start+1;}
          else{loops.pop();bindings[loop.variable]=loop.previous;}
        }else if(open.startsWith('FUNCTION ')){const frame=calls.pop();if(!frame)return fail('Function ended outside a call.');next=frame.return;vars=frame.variables;}
        break;
      }
      case 'RETURN':{const frame=calls.pop();if(!frame)return fail('Return belongs inside a called function.');next=frame.return;vars=frame.variables;loops.length=frame.loop_depth;break;}
      case 'TAKE UP':case 'TAKE UP_RIGHT':case 'TAKE RIGHT':case 'TAKE DOWN_RIGHT':case 'TAKE DOWN':case 'TAKE DOWN_LEFT':case 'TAKE LEFT':case 'TAKE UP_LEFT':
        if(!heard)return fail('No customer speech is available.');
        if(ambiguous())return fail('Ambiguous customer speech. Ask for help before taking paper.');
        if(!bindings.item)return fail('No current heard item is available.');
        if(ticket)return fail('Deposit the current paper before taking another.');
        {const target=interactionTarget(queryPosition(out.state.counter),c.slice(5));
        if(!target||!samePoint(target,[STARTS.query[0],STARTS.query[1]-1]))return fail('No paper in that direction. Take from the paper stack above the register.');}
        ticket=createTicket(customer,`${id}_${String(out.tickets.length+1).padStart(2,'0')}`);break;
      case 'ITEM coffee':case 'ITEM tea':
        if(!ticket)return fail('Take the order paper before writing its item.');
        ticket.item=c.slice(5);
        if(checkWrittenOrder){
          const expected=(customer.expected.tickets??[customer.expected])[out.tickets.length];
          if(expected?.item&&ticket.item!==expected.item)return fail(`Wrong item on ticket ${out.tickets.length+1}: expected ${expected.item}, got ${ticket.item}.`);
        }
        break;
      case 'READ number':
        if(!bindings.item?.tokens.includes('number')||bindings.item.number===undefined)return fail('Expected a number token, but none was heard.');
        vars.number=bindings.item.number;break;
      case 'SUGAR true':case 'SUGAR false':case 'SUGAR number':
        if(!ticket)return fail('Take the order paper before setting sugar.');
        if(c==='SUGAR number'){
          if(vars.number===undefined)return fail('Read the number into the local variable first.');
          ticket.sugar_count=vars.number;ticket.with_sugar=vars.number>0;
        }else{ticket.with_sugar=c==='SUGAR true';ticket.sugar_count=null;}
        break;
      case 'DEPOSIT UP':case 'DEPOSIT UP_RIGHT':case 'DEPOSIT RIGHT':case 'DEPOSIT DOWN_RIGHT':case 'DEPOSIT DOWN':case 'DEPOSIT DOWN_LEFT':case 'DEPOSIT LEFT':case 'DEPOSIT UP_LEFT':
        if(!ticket||!['coffee','tea'].includes(ticket.item))return fail('The order paper is missing an item.');
        {const target=interactionTarget(queryPosition(out.state.counter),c.slice(8));
        if(!target||!samePoint(target,STATIONS.orders.cell))return fail('Move right to the handoff tile, then Deposit right into the order counter.');}
        out.tickets.push(ticket);ticket=undefined;break;
      case 'REPEAT':out.state.pc=0;return finish();
    }
    out.heldPaper=ticket;
    out.state.pc=next;
  }
  out.state.stopped=true;return finish();
}

/** Token membership never consults the expected ticket or semantic intent. */
export function evaluateComparison(condition: ComparisonCondition, bindings: Record<string, HeardOrder | undefined>) {
  const present = bindings[condition.right]?.tokens.includes(condition.left) ?? false;
  return condition.operator === 'NOT IN' ? !present : present;
}

/** Evaluate OR-separated groups of AND terms against the same current bindings. */
export function evaluateConditionExpression(expression: ConditionExpression, bindings: Record<string, HeardOrder | undefined>) {
  let group = evaluateComparison(expression.conditions[0], bindings);
  for (let index = 1; index < expression.conditions.length; index++) {
    if (expression.connectors[index - 1] === 'OR') {
      if (group) return true;
      group = evaluateComparison(expression.conditions[index], bindings);
    } else group = group && evaluateComparison(expression.conditions[index], bindings);
  }
  return group;
}

/** Offline validation drains the same interpreter used by the live game. */
export function executeCustomerEvent(p: Program, customer: Customer, id: string, initial: RuntimeState = {pc:0,stopped:false}): CustomerExecution {
  const execution = streamCustomerEvent(p, customer, id, initial);
  let step = execution.next();
  while (!step.done) step = execution.next();
  return step.value;
}
