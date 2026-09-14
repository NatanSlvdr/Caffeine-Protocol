import { orderTotal } from './pricing';
import { simulateService } from './service';
import type { RobotPrograms } from './types';
import { createTicket, executeCustomerEvent } from './program';
import type { Customer, CustomerExecution, LevelDefinition, Program, ReplayEvent, RunFailure, RunResult } from './types';
const round = (n:number)=>Math.round(n*10)/10;
function validate(customer:Customer, actual:CustomerExecution):string {
  const expected=customer.expected, tickets=expected.tickets??(expected.item?[expected]:[]);
  if(actual.error)return actual.error;
  if(expected.ask_help&&!actual.asked_help)return 'Expected Query to ask for help.';
  if(!expected.ask_help&&actual.asked_help)return 'Query asked for help on a supported phrase.';
  if(expected.ask_help&&!tickets.length)return actual.tickets.length?'Do not guess a drink when no clarification is available.':'';
  if(!actual.tickets.length)return 'No ticket was created.';
  if(actual.tickets.length!==tickets.length)return `Wrong ticket count: expected ${tickets.length}, got ${actual.tickets.length}.`;
  for(const [i,e] of tickets.entries()){
    const a=actual.tickets[i];
    if(e.item!==undefined&&a.item!==e.item)return `Wrong item on ticket ${i+1}: expected ${e.item}, got ${a.item}.`;
    if(e.with_sugar!==undefined&&a.with_sugar!==e.with_sugar)return `Wrong binary sugar modifier on ticket ${i+1}.`;
    if(e.sugar_count!==undefined&&a.sugar_count!==e.sugar_count)return `Wrong sugar count on ticket ${i+1}.`;
  }
  if(!actual.payment)return 'Return to the register after submitting all tickets to finish automatic checkout.';
  if(actual.payment.amount!==orderTotal(actual.tickets)||actual.payment.ticketIds.length!==actual.tickets.length)return 'The customer payment does not match the submitted order.';
  return '';
}
/** Stop on the first failure across ordered validation seeds. */
export function runLevel(level:LevelDefinition,program:Program,robotPrograms?:RobotPrograms):RunResult {
  const result:RunResult={passed:true,observation:!level.programming_enabled,events:[],level_id:level.id,level_title:level.title,passed_seeds:0,required_seeds:level.seeds.length,tickets:[],executed_instructions:0,average_satisfaction:100,stars:0,first_failure:null};
  if(level.programming_enabled)result.block_count=program.block_count;
  outer:for(const seed of level.seeds){
    let state={pc:0,stopped:false},seedInstructions=0;
    for(const customer of seed.customers){
      const id=`${seed.id}_T${String(result.tickets.length+1).padStart(2,'0')}`;
      let actual:CustomerExecution;
      if(level.programming_enabled)actual=executeCustomerEvent(program,customer,id,state);
      else {const ticket=createTicket(customer,id);ticket.item='coffee';ticket.created_at=0;ticket.due_at=0;ticket.status='served';actual={payment:{amount:orderTotal([ticket]),ticketIds:[ticket.ticket_id]},tickets:[ticket],asked_help:false,error:'',trace:[],executed_instructions:0,state};}
      state=actual.state;seedInstructions+=actual.executed_instructions;if(seedInstructions>10000)actual.error='Instruction limit reached (10,000 per robot).';result.executed_instructions+=actual.executed_instructions;
      const reason=validate(customer,actual);let line=actual.error_line??-1;
      if(reason&&!actual.error){const prefix=reason.includes('checkout')||reason.includes('payment')?'MOVE LEFT':reason.includes('item')?'ITEM':reason.includes('sugar')?'SUGAR':'SUBMIT';line=actual.trace.findLast(s=>s.command.startsWith(prefix))?.line??line;}
      const event:ReplayEvent={payment:actual.payment,seed_id:seed.id,customer:structuredClone(customer),tickets:actual.tickets,asked_help:actual.asked_help,passed:!reason,trace:actual.trace,timing:{arrival:0,created:0,seated:0,ready:0,served:0,left:0,cleaned:0},table:0,satisfaction:100};
      if(level.programming_enabled){event.reason=reason;event.failure_line=reason?line:-1;}
      result.events.push(event);result.tickets.push(...actual.tickets);
      if(reason){const failure:RunFailure={seed_id:seed.id,error_line:line,customer_id:customer.customer_id,event_time:customer.arrival,phrase:customer.phrase,intent:customer.intent,expected:customer.expected,actual:actual.tickets,reason};result.first_failure=failure;result.passed=false;break outer;}
    }result.passed_seeds++;
  }
  const levelNumber=Number(level.id.slice(1));
  const programs=robotPrograms??{query:program.source,prep:'',floor:''};
  result.programs=programs;result.execution=[];
  let offset=0;const orderPassed=result.passed;
  for(const seed of level.seeds){
    const events=result.events.filter(e=>e.seed_id===seed.id);if(!events.length)continue;
    const service=simulateService(level,events,programs,offset);result.execution.push(service.execution);offset+=service.execution.duration;result.executed_instructions+=service.instructions;
    if(service.failure){const f=service.failure,e=f.event??events[0];result.passed=false;e.passed=false;e.reason=f.reason;e.failure_line=f.line;result.passed_seeds=level.seeds.indexOf(seed);result.first_failure={role:f.role,seed_id:seed.id,error_line:f.line,customer_id:e.customer.customer_id,event_time:f.time,phrase:e.customer.phrase,intent:e.customer.intent,expected:e.customer.expected,actual:e.tickets,reason:f.reason};break;}
  }
  if(result.first_failure){const failedIndex=level.seeds.findIndex(s=>s.id===result.first_failure?.seed_id);result.events=result.events.filter(e=>level.seeds.findIndex(s=>s.id===e.seed_id)<=failedIndex);result.tickets=result.events.flatMap(e=>e.tickets);}
  if(!orderPassed&&result.first_failure&&!result.first_failure.role)result.first_failure.role='query';
  if(levelNumber>=15)result.block_count=program.block_count+programs.prep.split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).length+(levelNumber>=23?programs.floor.split('\n').filter(l=>l.trim()&&!l.trim().startsWith('#')).length:0);
  result.average_satisfaction=result.events.length?round(result.events.reduce((a,e)=>a+e.satisfaction,0)/result.events.length):100;
  if(result.passed&&level.programming_enabled){result.stars=1;if((result.block_count??0)<=level.block_target){result.stars=2;if(result.executed_instructions<=level.instruction_target)result.stars=3;}}
  return result;
}
/** Customer navigation uses the same absolute seed clock as actor playback. */
export function buildReplayTimeline(result:RunResult){return result.events.map(event=>{const seed=result.execution?.find(s=>s.seed_id===event.seed_id);return {event,start:(seed?.start??0)+event.timing.arrival,end:(seed?.start??0)+Math.max(event.timing.cleaned,event.timing.left,event.timing.served,event.timing.created)};});}
