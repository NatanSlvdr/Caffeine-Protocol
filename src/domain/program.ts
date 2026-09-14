import { orderTotal } from './pricing';
import type { Customer, CustomerExecution, OrderTicket, Program, RuntimeState, SpeechIntent } from './types';
export const LIMIT = 1024;
export const isOpening = (command: string) => command === 'EACH' || command.startsWith('IF ') || command.startsWith('FUNCTION ');
export function availableCommands(level: number): string[] {
  const c = ['LISTEN','TICKET','ITEM coffee','MOVE RIGHT 1','MOVE LEFT 1','SUBMIT'];
  if(level>=4)c.push('IF tea','IF coffee','ELSE','END','ITEM tea','ITEM heard');
  if(level>=5)c.push('POSITION listen','JUMP listen','REPEAT');
  if(level>=6)c.push('EACH');
  if(level>=7)c.push('READ sugar','SUGAR variable','SUGAR binary','IF sugar');
  if(level>=8)c.push('FUNCTION build_ticket','CALL build_ticket','RETURN');
  if(level>=9)c.push('IF ambiguous','HELP','ERROR');
  if(level>=10)c.push('IF count','IF count > 0','IF count > 1','IF count = 0','IF count = 1','IF count = 2','READ count','SUGAR number','SUGAR count');
  if(level>=11)c.push('SUGAR heard');
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
    if(!allowed.includes(c)&&!(level>=5&&/^(POSITION|JUMP) [a-z][a-z0-9_]*$/.test(c)))return fail('Unknown or locked instruction: '+c);
    const at=p.instructions.length; p.instructions.push(c); p.source_lines.push(line);
    if(c.startsWith('POSITION ')){const label=c.slice(9);if(label in p.positions)return fail('Duplicate position: '+label);p.positions[label]=at;}
    if(isOpening(c)){
      if(c==='EACH'&&stack.some(i=>p.instructions[i]==='EACH'))return fail('Use one EACH per speech event; do not nest EACH blocks.');
      if(c.startsWith('FUNCTION ')){const label=c.slice(9);if(stack.length||label in p.functions)return fail('Functions must be unique and placed outside other blocks.');p.functions[label]=at;}
      stack.push(at);
    } else if(c==='ELSE'){
      const start=stack.at(-1);if(start===undefined||!p.instructions[start].startsWith('IF ')||start in p.alternatives)return fail('ELSE belongs inside one IF block.');p.alternatives[start]=at;
    } else if(c==='END'){
      const start=stack.pop();if(start===undefined)return fail('END needs an IF, EACH or FUNCTION above it.');p.ends[start]=at;p.ends[at]=start;if(start in p.alternatives)p.ends[p.alternatives[start]]=at;
    }
  }
  if(stack.length)p.compile_error='Close each IF, EACH and FUNCTION with END.';
  else if(p.instructions[0]!=='LISTEN'&&!p.instructions[0]?.startsWith('POSITION '))p.compile_error='Start with Wait for customer speech, or a jump destination.';
  else if(p.instructions.filter(c=>c==='LISTEN').length!==1)p.compile_error='Use one Wait for customer speech; jump back to it for continuous service.';
  else if(p.instructions.includes('REPEAT')&&(p.instructions.at(-1)!=='REPEAT'||p.instructions.filter(c=>c==='REPEAT').length>1))p.compile_error='REPEAT belongs once, at the very end.';
  p.instructions.forEach((c,i)=>{if(c.startsWith('JUMP ')&&!(c.slice(5) in p.positions)){p.compile_error='Jump target has no matching Position block.';p.error_line=p.source_lines[i];}if(c.startsWith('CALL ')&&!(c.slice(5) in p.functions)){p.compile_error='Define the function before calling it.';p.error_line=p.source_lines[i];}});
  p.block_count=p.instructions.length;if(p.block_count>128)p.compile_error='Query has room for at most 128 blocks.';
  return p;
}
export function createTicket(customer: Customer, id: string, intent: SpeechIntent = {}): OrderTicket {
  return {ticket_id:id,customer_id:customer.customer_id,table_id:null,source_phrase:customer.phrase,source_intent:structuredClone(intent),item:'',with_sugar:null,sugar_count:null,status:'created',created_at:customer.arrival,due_at:customer.arrival+30,debug_notes:''};
}
/** Resume at the next speech event, returning a new state without mutating inputs. */
export function executeCustomerEvent(p: Program, customer: Customer, id: string, initial: RuntimeState = {pc:0,stopped:false}): CustomerExecution {
  const out: CustomerExecution={tickets:[],asked_help:false,error:'',executed_instructions:0,trace:[],state:{...initial}};
  const fail=(message:string)=>{out.error=message;return out;};
  if(p.compile_error){out.error_line=p.error_line;return fail(p.compile_error);}
  if(initial.stopped)return fail('Query stopped listening. Jump to the listen position after serving.');
  let intent=structuredClone(customer.intent), order=intent, vars: {with_sugar?:boolean;sugar_count?:number}={}, ticket: OrderTicket|undefined, heard=false;
  // Checkout is automatic once the complete order is submitted and Query returns to the register.
  const finish=()=>{
    if(!out.error&&out.tickets.length&&!out.payment){
      if(ticket)return fail('Submit the current ticket before finishing the order.');
      if(out.state.counter)return fail('Move left 1 tile back to the register after submitting.');
      out.payment={amount:orderTotal(out.tickets),ticketIds:out.tickets.map(t=>t.ticket_id)};
    }
    return out;
  };
  const loops: {start:number;orders:SpeechIntent[];index:number}[]=[], calls:{return:number;variables:typeof vars;loop_depth:number}[]=[];
  while(out.state.pc<p.instructions.length){
    const pc=out.state.pc,c=p.instructions[pc];
    if(out.executed_instructions>=LIMIT)return fail('Instruction limit reached. A loop must return to Wait for customer speech.');
    if(c==='LISTEN'&&heard)return finish();
    out.executed_instructions++;out.error_line=p.source_lines[pc];out.trace.push({line:p.source_lines[pc],command:c,function_depth:calls.length});
    if(!heard&&(['HELP','EACH'].includes(c)||c.startsWith('READ ')))return fail('No customer speech is available.');
    let next=pc+1;
    if(c.startsWith('IF ')){
      if(!heard)return fail('No customer speech is available.');
      const cond=c.slice(3);let yes=false;
      if(cond==='tea'||cond==='coffee')yes=order.drink===cond;
      if(cond==='sugar')yes=!!order.with_sugar;
      if(cond==='ambiguous')yes=intent.confidence==='ambiguous';
      if(cond==='count')yes=order.sugar_count!==undefined;
      if(cond.startsWith('count ')){if(order.sugar_count===undefined)return fail('Expected a sugar count chip, but none was heard.');yes=cond.includes('=')?order.sugar_count===Number(cond.at(-1)):order.sugar_count>Number(cond.at(-1));}
      if(!yes)next=(p.alternatives[pc]??p.ends[pc])+1;
    } else if(c.startsWith('FUNCTION '))next=p.ends[pc]+1;
    else if(c.startsWith('CALL ')){
      if(calls.length)return fail('Recursive function calls are not supported.');
      calls.push({return:next,variables:{...vars},loop_depth:loops.length});vars={};next=p.functions[c.slice(5)]+1;
    } else if(c.startsWith('JUMP ')){
      if(calls.length||loops.length)return fail('Finish the function or EACH before jumping to listen.');next=p.positions[c.slice(5)];
    } else switch(c){
      case 'MOVE RIGHT 1':out.state.counter=1;break;
      case 'MOVE LEFT 1':out.state.counter=0;break;
      case 'LISTEN':if(out.state.counter)return fail('Move left 1 tile to the register before waiting for customer speech.');heard=true;break;
      case 'HELP':if(intent.confidence==='ambiguous'){out.asked_help=true;intent=structuredClone(customer.clarification_intent??{});order=intent;if(!Object.keys(intent).length){out.state={pc:0,stopped:!p.instructions.includes('REPEAT')&&!p.instructions.includes('JUMP listen')};return out;}}break;
      case 'ERROR':return fail('Query reported an unsupported order. Ask Niko for help before creating a ticket.');
      case 'EACH':{const orders=intent.orders??[intent];if(!orders.length)return fail('No order chips were heard.');loops.push({start:pc,orders,index:0});order=orders[0];break;}
      case 'ELSE':next=p.ends[pc]+1;break;
      case 'END':{const open=p.instructions[p.ends[pc]];if(open==='EACH'){const loop=loops.at(-1);if(!loop)return fail('No active EACH block.');loop.index++;if(loop.index<loop.orders.length){order=loop.orders[loop.index];next=loop.start+1;}else{loops.pop();order=intent;}}else if(open.startsWith('FUNCTION ')){const frame=calls.pop();if(!frame)return fail('Function ended outside a call.');next=frame.return;vars=frame.variables;}break;}
      case 'RETURN':{const frame=calls.pop();if(!frame)return fail('Return belongs inside a called function.');next=frame.return;vars=frame.variables;loops.length=frame.loop_depth;break;}
      case 'TICKET':if(!heard)return fail('No customer speech is available.');if(order.confidence==='ambiguous')return fail('Ambiguous customer speech. Ask for help before creating a ticket.');if(ticket)return fail('Submit the current ticket before creating another.');ticket=createTicket(customer,`${id}_${String(out.tickets.length+1).padStart(2,'0')}`,order);break;
      case 'ITEM coffee':case 'ITEM tea':case 'ITEM heard':if(!ticket)return fail('Create a ticket before setting its item.');ticket.item=c==='ITEM heard'?(order.drink??''):c.slice(5);break;
      case 'READ sugar':if(order.with_sugar===undefined)return fail('Expected a with_sugar chip, but none was heard.');vars.with_sugar=order.with_sugar;break;
      case 'READ count':if(order.sugar_count===undefined)return fail('Expected a sugar_count chip, but none was heard.');vars.sugar_count=order.sugar_count;break;
      case 'SUGAR binary':case 'SUGAR count':case 'SUGAR heard':case 'SUGAR variable':case 'SUGAR number':
        if(!ticket)return fail('Create a ticket before setting sugar.');
        if(c==='SUGAR variable'){if(vars.with_sugar===undefined)return fail('Read the sugar value into the local variable first.');ticket.with_sugar=vars.with_sugar;}
        else if(c==='SUGAR number'){if(vars.sugar_count===undefined)return fail('Read the sugar value into the local variable first.');ticket.sugar_count=vars.sugar_count;}
        else{if(c!=='SUGAR count'&&order.with_sugar!==undefined)ticket.with_sugar=order.with_sugar;if(c!=='SUGAR binary'&&order.sugar_count!==undefined)ticket.sugar_count=order.sugar_count;}break;
      case 'SUBMIT':if(!ticket||!['coffee','tea'].includes(ticket.item))return fail('Created ticket is missing an item.');if(out.state.counter!==1)return fail('Move right 1 tile to the shared kitchen counter, then Submit Ticket.');out.tickets.push(ticket);ticket=undefined;break;
      case 'REPEAT':out.state.pc=0;return finish();
    }
    out.state.pc=next;
  }
  out.state.stopped=true;return finish();
}
