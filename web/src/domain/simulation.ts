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
  }return '';
}
/** Reserve stations and tables in simulation seconds, independently of replay speed. */
function schedule(events:ReplayEvent[],level:LevelDefinition){
  let seed='',prepFree=0,counterFree=0,serverFree=0,tables:number[]=[];
  for(const event of events){
    if(event.seed_id!==seed){seed=event.seed_id;prepFree=counterFree=serverFree=0;tables=Array.from({length:level.active_tables},()=>0);}
    const arrival=event.customer.arrival,created=Math.max(arrival,counterFree)+(level.programming_enabled?Math.max(1,event.tickets.length):9);counterFree=created;
    if(!event.tickets.length||!event.passed){event.timing={arrival,created,seated:created,ready:created,served:created,left:created,cleaned:created};event.table=0;event.satisfaction=round(Math.max(0,100-(created-arrival)*.6));continue;}
    const table=tables.indexOf(Math.min(...tables)),seated=Math.max(created,tables[table]);let ready=Math.max(created,prepFree);
    for(const ticket of event.tickets){ready+=ticket.item==='tea'?7:6;ticket.table_id=`T${String(table+1).padStart(2,'0')}`;ticket.created_at=created;ticket.status='served';}
    prepFree=ready;const served=Math.max(ready,seated,serverFree)+5;serverFree=served;const left=served+5,cleaned=left+4;tables[table]=cleaned;
    event.timing={arrival,created,seated,ready,served,left,cleaned};event.table=table+1;event.satisfaction=round(Math.max(0,Math.min(100,100-(created-arrival)*.6-(served-created)*.3)));
  }
}
/** Stop on the first failure across ordered validation seeds. */
export function runLevel(level:LevelDefinition,program:Program):RunResult {
  const result:RunResult={passed:true,observation:!level.programming_enabled,events:[],level_id:level.id,level_title:level.title,passed_seeds:0,required_seeds:level.seeds.length,tickets:[],executed_instructions:0,average_satisfaction:100,stars:0,first_failure:null};
  if(level.programming_enabled)result.block_count=program.block_count;
  outer:for(const seed of level.seeds){
    let state={pc:0,stopped:false};
    for(const customer of seed.customers){
      const id=`${seed.id}_T${String(result.tickets.length+1).padStart(2,'0')}`;
      let actual:CustomerExecution;
      if(level.programming_enabled)actual=executeCustomerEvent(program,customer,id,state);
      else {const ticket=createTicket(customer,id);ticket.item='coffee';ticket.created_at=0;ticket.due_at=0;ticket.status='served';actual={tickets:[ticket],asked_help:false,error:'',trace:[],executed_instructions:0,state};}
      state=actual.state;result.executed_instructions+=actual.executed_instructions;
      const reason=validate(customer,actual);let line=actual.error_line??-1;
      if(reason&&!actual.error){const prefix=reason.includes('item')?'ITEM':reason.includes('sugar')?'SUGAR':'SUBMIT';line=actual.trace.findLast(s=>s.command.startsWith(prefix))?.line??line;}
      const event:ReplayEvent={seed_id:seed.id,customer:structuredClone(customer),tickets:actual.tickets,asked_help:actual.asked_help,passed:!reason,trace:actual.trace,timing:{arrival:0,created:0,seated:0,ready:0,served:0,left:0,cleaned:0},table:0,satisfaction:100};
      if(level.programming_enabled){event.reason=reason;event.failure_line=reason?line:-1;}
      result.events.push(event);result.tickets.push(...actual.tickets);
      if(reason){const failure:RunFailure={seed_id:seed.id,error_line:line,customer_id:customer.customer_id,event_time:customer.arrival,phrase:customer.phrase,intent:customer.intent,expected:customer.expected,actual:actual.tickets,reason};result.first_failure=failure;result.passed=false;break outer;}
    }result.passed_seeds++;
  }
  schedule(result.events,level);result.average_satisfaction=result.events.length?round(result.events.reduce((a,e)=>a+e.satisfaction,0)/result.events.length):100;
  if(result.passed&&level.programming_enabled){result.stars=1;if(program.block_count<=level.block_target){result.stars=2;if(result.executed_instructions<=level.instruction_target)result.stars=3;}}
  return result;
}
export const EVENT_DURATION=18;
export function buildReplayTimeline(result:RunResult){return result.events.map((event,index)=>({event,start:index*EVENT_DURATION,end:(index+1)*EVENT_DURATION}));}
export function replayStage(phase:number){return phase<.12?'Arriving':phase<.34?'Taking order':phase<.5?'Preparing':phase<.58?'Pickup':phase<.7?'Delivering':phase<.76?'Enjoying a drink':phase<.87?'Departing':phase<.9?'Cleaning':'Returning to pickup';}
