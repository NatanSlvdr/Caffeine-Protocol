import { STARTS, ENTRANCE, gridRoute, STATIONS, tableFront, tableSeat } from './layout';
import type { Point } from './layout';
import type { ActorId, ActorSnapshot, RunResult } from './types';
/** Sample immutable execution records; presentation never invents a robot route. */
export function sampleReplay(result:RunResult,time:number){
 const seed=result.execution?.find(s=>time>=s.start&&time<s.start+s.duration)??result.execution?.at(-1);
 const local=Math.max(0,time-(seed?.start??0)),level=Number(result.level_id.slice(1));
 const actors:Partial<Record<ActorId,ActorSnapshot>>={};
 if(level>=3)actors.query={position:STARTS.query,inventory:[],battery:80,role:'query'};
 if(level>=15)actors.prep={position:STARTS.prep,inventory:[],battery:80,role:'prep'};
 if(level>=23)actors.floor={position:STARTS.floor,inventory:[],battery:80,role:'floor'};
 if(level<23)actors.niko={position:level>=15?STARTS.floor:level>=3?STARTS.prep:STARTS.query,inventory:[],battery:80,role:level>=15?'floor':level>=3?'prep':'query'};
 const logs=seed?.events??[];
 for(const id of ['query','prep','floor','niko'] as const){
  const history=logs.filter(e=>e.actor===id&&e.start<=local);if(!history.length)continue;
  const motion=history.filter(e=>e.from[0]!==e.to[0]||e.from[1]!==e.to[1]).at(-1),settled=history.filter(e=>e.end<=local).at(-1),last=history.at(-1)!;
  let position=settled?.to??last.from;
  if(motion&&motion.end>local){const t=Math.max(0,Math.min(1,(local-motion.start)/(motion.end-motion.start)));position=[motion.from[0]+(motion.to[0]-motion.from[0])*t,motion.from[1]+(motion.to[1]-motion.from[1])*t];}
  actors[id]={position,inventory:settled?.inventory??[],battery:settled?.battery??80,role:last.role};
 }
 const customers=result.events.map((event,index)=>({event,index})).filter(({event})=>event.seed_id===seed?.seed_id&&local>=event.timing.arrival&&local<Math.max(event.timing.left,event.timing.created)+5).map(({event,index})=>{
  const front=tableFront(Math.max(0,event.table-1));let from:Point=ENTRANCE,to:Point=STATIONS.orders.floor,begin=event.timing.arrival,end=event.timing.created;
  if(local>=event.timing.created){from=STATIONS.orders.floor;to=front;begin=event.timing.created;end=begin+gridRoute(from,to).length-1;}
  if(local>=event.timing.left&&event.timing.left>event.timing.created){from=front;to=ENTRANCE;begin=event.timing.left;end=begin+5;}
  const path=gridRoute(from,to),d=Math.max(0,Math.min(1,(local-begin)/Math.max(1,end-begin)))*(path.length-1),i=Math.floor(d),a=path[i],b=path[Math.min(i+1,path.length-1)];
  const seated=event.table>0&&to===front&&local>=end&&local<event.timing.left;
  return {id:event.customer.customer_id,position:seated?tableSeat(event.table-1,index%2 as 0|1):[a[0]+(b[0]-a[0])*(d-i),a[1]+(b[1]-a[1])*(d-i)] as Point,seated,side:index%2 as 0|1};
 });
 const pickup=new Map<string,string>();for(const e of logs.filter(e=>e.end<=local)){if(e.command==='DEPOSIT'&&e.ticketId)pickup.set(e.ticketId,result.tickets.find(t=>t.ticket_id===e.ticketId)?.item??'coffee');if(e.command==='PICKUP'&&e.ticketId)pickup.delete(e.ticketId);}
 return {actors,customers,pickup:[...pickup.entries()],seed,local,active:logs.filter(e=>e.start<=local).at(-1)};
}
