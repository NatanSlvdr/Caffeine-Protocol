import { ticketUnits } from './ticketUnits';
import { STARTS, STATIONS, tableFront } from './layout';
import type { Point } from './layout';
import type { ActorId, ActorSnapshot, RunResult } from './types';
import { directionVectors } from './directions';
import { commandDirection } from './commands';
import { customerApproach, customerExit, customerSeatPath, pathDistance, CUSTOMER_WALK_SPEED, SEAT_CHOICE_SECONDS, SIT_SECONDS, DRINK_SECONDS, samplePath, STREET_APPROACH_SECONDS, STREET_EXIT_SECONDS } from './street';
/** Sample immutable execution records; presentation never invents a robot route. */
export function sampleReplay(result:RunResult,time:number){
 const seed=(time<0?result.execution?.[0]:result.execution?.find(s=>time>=s.start&&time<s.start+s.duration))??result.execution?.at(-1);
 const local=time-(seed?.start??0),level=Number(result.level_id.slice(1));
 const actors:Partial<Record<ActorId,ActorSnapshot>>={};
 if(level>=3)actors.query={position:STARTS.query,inventory:[],role:'query'};
 actors.prep={position:STARTS.prep,inventory:[],role:'prep'};
 actors.floor={position:STARTS.floor,inventory:[],role:'floor'};
 if(level<3)actors.niko={position:STARTS.query,inventory:[],role:'query'};
 const logs=[...(seed?.events??[])].sort((a,b)=>a.start-b.start||a.end-b.end);
 for(const id of ['query','prep','floor','niko'] as const){
  const history=logs.filter(e=>e.actor===id&&e.start<=local);
  if(!history.length){
   // The approach starts before the interpreter clock; Query is already waiting at the counter.
   const waitingForOrders=id==='query'&&actors.query&&(/^\s*LISTEN(?:\s*#.*)?$/m.test(result.programs?.query??'')||logs.find(e=>e.actor==='query')?.command==='LISTEN');
   if(waitingForOrders)actors.query!.action={command:'LISTEN',progress:0,start:-STREET_APPROACH_SECONDS};
   continue;
  }
  const motion=history.filter(e=>e.from[0]!==e.to[0]||e.from[1]!==e.to[1]).at(-1),settled=history.filter(e=>e.end<=local&&!e.error).at(-1),last=history.at(-1)!;
  let position=settled?.to??last.from;
  if(motion&&motion.end>local){const t=Math.max(0,Math.min(1,(local-motion.start)/(motion.end-motion.start)));position=[motion.from[0]+(motion.to[0]-motion.from[0])*t,motion.from[1]+(motion.to[1]-motion.from[1])*t];}
  const directional=history.findLast(event=>event.command==='LISTEN'||commandDirection(event.command)!==undefined);
  const direction=directional?commandDirection(directional.command):undefined;
  const vector=direction?directionVectors[direction]:undefined;
  const facing=directional?.command==='LISTEN'?-Math.PI/2:vector?Math.atan2(vector[0],vector[1]):id==='query'?-Math.PI/2:0;
  const reach=/^(TAKE|PICKUP|DEPOSIT)( |$)/.test(last.command)&&last.end>local?Math.sin(Math.PI*(local-last.start)/Math.max(.001,last.end-last.start)):0;
  // Zero-duration wait records describe an idle state until another instruction starts.
  const waiting=!last.error&&last.start===last.end&&(last.command==='LISTEN'||last.command.startsWith('WAIT '))&&local<(seed?.duration??Infinity);
  actors[id]={position,facing,reach,action:waiting?{command:last.command,progress:0,start:last.start}:last.end>local?{command:last.command,progress:Math.max(0,Math.min(1,(local-last.start)/(last.end-last.start))),start:last.start}:undefined,variables:settled?.variables,walking:!!motion&&motion.end>local,inventory:settled?.inventory??[],heldPaper:settled?.heldPaper,role:last.role};
 }
 const servedTimes=new Map(logs.filter(log=>log.command==='SERVE'&&log.ticketId&&log.end<=local).map(log=>[log.ticketId!,log.end]));
 const collected=new Set(logs.filter(log=>log.command==='COLLECT'&&log.end<=local).map(log=>log.ticketId));
 // Intake is serial: later arrivals line up behind customers still at the counter.
 const intakeEvents=result.events.filter(event=>event.seed_id===seed?.seed_id);
 const customers=result.events.map((event,index)=>({event,index})).filter(({event})=>event.seed_id===seed?.seed_id&&local>=event.timing.arrival-STREET_APPROACH_SECONDS&&local<event.timing.left+STREET_EXIT_SECONDS).map(({event,index})=>{
  const side=index%2 as 0|1, timing=event.timing;
  const hasSeat=Number.isFinite(timing.seated)&&event.table>0;
  const seating=timing.seating??timing.created;
  const leaving=local>=timing.left;
  let path=customerApproach(index), progress=(local-(timing.arrival-STREET_APPROACH_SECONDS))/STREET_APPROACH_SECONDS;
  const queueIndex=intakeEvents.slice(0,intakeEvents.indexOf(event)).filter(previous=>local<Math.min(previous.timing.seating??previous.timing.created,previous.timing.left)).length;
  if(queueIndex>0&&local<seating&&!leaving){
   const queuePath:Point[]=[STATIONS.orders.floor,[-8,5],[-9.6,5],[-9.6,5-queueIndex]];
   const slot=samplePath(queuePath,queueIndex/pathDistance(queuePath));
   path=[customerApproach(index)[0],[-9.6,slot[1]],slot];
  }
  const showOrder=logs.some(log=>log.customerId===event.customer.customer_id&&log.role==='query'&&log.start<=local)
   || local>=timing.created;
  let sit=0;
  if(hasSeat&&local>=seating){
   path=customerSeatPath(event.table-1,side);
   progress=(local-seating-SEAT_CHOICE_SECONDS)/(pathDistance(path)/CUSTOMER_WALK_SPEED);
   sit=Math.max(0,Math.min(1,(local-(timing.seated-SIT_SECONDS))/SIT_SECONDS));
  }
  if(leaving){
   const front=hasSeat?tableFront(event.table-1):STATIONS.orders.floor;
   const seatPath=hasSeat?customerSeatPath(event.table-1,side):[];
   path=hasSeat?[...seatPath.slice(-2).reverse(),...customerExit(front,index)]:customerExit(front,index);
   const stand=hasSeat?SIT_SECONDS:0;
   progress=(local-timing.left-stand)/(STREET_EXIT_SECONDS-stand);
   sit=hasSeat?Math.max(0,1-(local-timing.left)/SIT_SECONDS):0;
  }
  const position=samplePath(path,progress), ahead=samplePath(path,progress+.001);
  const walking=progress>0&&progress<1;
  const facing=walking?Math.atan2(ahead[0]-position[0],ahead[1]-position[1]):hasSeat&&local>=timing.seated-SIT_SECONDS?(side===0?Math.PI/2:-Math.PI/2):Math.PI/2;
  const drinks=event.tickets.flatMap(ticketUnits).filter(ticket=>servedTimes.has(ticket.ticket_id)&&!collected.has(ticket.ticket_id));
  const sipping=drinks.find(ticket=>local<servedTimes.get(ticket.ticket_id)!+DRINK_SECONDS);
  return {id:event.customer.customer_id,showOrder,position,seated:sit===1,sit,walking,facing,side,drinking:!!sipping&&!leaving,drink:sipping?.item,sippingId:!leaving?sipping?.ticket_id:undefined,table:event.table,drinks};
 });
 const pickup=new Map<string,string>();for(const e of logs.filter(e=>e.end<=local)){if(e.role==='prep'&&e.command.startsWith('DEPOSIT')&&e.ticketId)pickup.set(e.ticketId,result.tickets.flatMap(ticketUnits).find(t=>t.ticket_id===e.ticketId)?.item??'coffee');if(e.role==='floor'&&(e.command.startsWith('PICKUP')||e.command.startsWith('TAKE '))&&e.ticketId)pickup.delete(e.ticketId);}
 // A submitted ticket stays on the shared counter until prep finishes claiming it.
 const claimed=new Set(logs.filter(e=>e.command==='WAIT TICKET'&&e.end<=local).map(e=>e.ticketId));
 const waitingTickets=result.events.filter(e=>e.seed_id===seed?.seed_id&&e.passed).flatMap(e=>e.tickets).filter(t=>t.created_at<=local).flatMap(ticket=>{const remaining=ticketUnits(ticket).filter(unit=>!claimed.has(unit.ticket_id)).length;return remaining?[{...ticket,quantity:remaining}]:[];});
 const sippingIds=new Set(customers.map(customer=>customer.sippingId));
 const tableDrinks=result.events.filter(event=>event.seed_id===seed?.seed_id).flatMap(event=>event.tickets.flatMap(ticketUnits).filter(ticket=>servedTimes.has(ticket.ticket_id)&&!collected.has(ticket.ticket_id)&&!sippingIds.has(ticket.ticket_id)).map(ticket=>({id:ticket.ticket_id,item:ticket.item,table:event.table})));
 return {actors,customers,tableDrinks,waitingTickets,pickup:[...pickup.entries()],seed,local,active:logs.filter(e=>e.start<=local).at(-1)};
}
