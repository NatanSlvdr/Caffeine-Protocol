import { ticketUnits, belongsToPaper } from './ticketUnits';
import { seatingDuration, DRINK_SECONDS, STREET_EXIT_SECONDS } from './street';
import { BLOCK_SECONDS } from './playback';
import { compileRobot } from './robotProgram';
import { floorSource, preparationSource } from './routines';
import { gridRoute, isWalkable, samePoint, MANUAL_INTAKE, STARTS, STATIONS, tableFront } from './layout';
import type { Point } from './layout';
import { directionVectors, normalizeDirection } from './directions';
import { isOrderDeposit } from './program';
import { evaluateComparison, parseComparison } from './robotConditions';
import { moveQuery } from './queryMovement';
import type { ActorId, Cargo, ExecutionEvent, LevelDefinition, Program, ReplayEvent, RobotPrograms, RobotRole, SeedExecution } from './types';

type Job={ticketId:string;table:number;item:'coffee'|'tea';sugar:number;event:ReplayEvent;created:number;status:'ticket'|'claimed'|'ready'|'reserved'|'carried'|'served'|'dirty'|'cleared';dirtyAt:number};
type Worker={role:'prep'|'floor';actor:ActorId;program:Program;pc:number;stack:number[];position:Point;inventory:Cargo[];job?:Job;count:number;maxLoad:number;done:boolean;pending?:{end:number;apply:()=>void};move?:{started:number;from:Point;direction:Point;remaining:number;requested:number;completed:number;line:number;command:string}};
export interface ServiceFailure {role:RobotRole;line:number;time:number;reason:string;event?:ReplayEvent}
export interface ServiceResult {execution:SeedExecution;failure?:ServiceFailure;instructions:number}
const configFor=(level:LevelDefinition)=>level.service??{prepCapacity:1,floorCapacity:1,clearing:true,objective:'serve' as const};
const sugarOf=(ticket:ReplayEvent['tickets'][number])=>ticket.sugar_count??(ticket.with_sugar?1:0);
export interface LiveService {
 pump: (time:number, log:ExecutionEvent[]) => void;
 next: () => number;
 done: () => boolean;
 attach: (execution:SeedExecution) => void;
}
/** Execute workers on a deterministic event clock; only completed actions mutate shared queues. */
export function* streamService(level:LevelDefinition,events:ReplayEvent[],programs:RobotPrograms,start=0,live?:LiveService):Generator<number,ServiceResult>{
 const number=Number(level.id.slice(1)),config=configFor(level),seed=events[0]?.seed_id??level.seeds[0].id;
 const log:ExecutionEvent[]=[],jobs:Job[]=[],tableOwners=new Map<number,string>();let now=0,failure:ServiceFailure|undefined,nikoPosition:Point=MANUAL_INTAKE;
 const workers:Worker[]=(['prep','floor'] as const).map(role=>({role,actor:role,program:compileRobot(number>=(role==='prep'?15:23)?programs[role]:role==='prep'?preparationSource(32):floorSource(32),role,number>=(role==='prep'?15:23)?number:32),pc:0,stack:[],position:STARTS[role],inventory:[],count:0,maxLoad:0,done:false}));
 let intakeFree=0,manualIndex=0;let manualIntake:{end:number;apply:()=>void}|undefined;
 let queryPosition:Point=STARTS.query;
 if(!live)for(const [index,event] of events.entries()){
  const created=Math.max(intakeFree,event.customer.arrival)+(level.programming_enabled?Math.max(.1,event.trace.length*.1):9);intakeFree=created;
  event.table=event.tickets.length?index%level.active_tables+1:0;
  event.timing={arrival:event.customer.arrival,created,seated:Infinity,ready:Infinity,served:Infinity,left:event.tickets.length?Infinity:created,cleaned:event.tickets.length?Infinity:created};
  event.trace.forEach((step,i)=>{
   const from=queryPosition;
   if(step.command.startsWith('MOVE '))queryPosition=moveQuery(queryPosition,step.command);
   log.push({seed_id:seed,actor:level.programming_enabled?'query':'niko',role:'query',start:created-(event.trace.length-i)*.1,end:created-(event.trace.length-i-1)*.1,line:step.line,command:step.command,from,to:queryPosition,inventory:[],customerId:event.customer.customer_id});
  });
  const submitted=log.filter(e=>e.actor==='query'&&isOrderDeposit(e.command)&&e.customerId===event.customer.customer_id);
  for(const [ticketIndex,ticket] of (event.passed?event.tickets:[]).entries()){
   const handoff=submitted[ticketIndex]?.end??created;
   ticket.table_id=`T${String(event.table).padStart(2,'0')}`;ticket.status='created';ticket.created_at=handoff;
   for(const unit of ticketUnits(ticket))jobs.push({ticketId:unit.ticket_id,table:event.table,item:ticket.item as 'coffee'|'tea',sugar:sugarOf(ticket),event,created:number<3?Infinity:handoff,status:'ticket',dirtyAt:Infinity});
  }
 }
 let queryFailure=events.find(e=>!e.passed);
 live?.attach({seed_id:seed,start,duration:Infinity,events:log});
 const fail=(w:Worker,reason:string,line=w.program.source_lines[w.pc]??-1)=>{
  failure={role:w.role,line,time:now,reason,event:w.job?.event??jobs.find(j=>j.ticketId===w.inventory[0]?.ticketId)?.event??events[0]};
  log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end:now,line,command:w.program.instructions[w.pc]??'END OF PROGRAM',from:w.position,to:w.position,inventory:structuredClone(w.inventory),error:reason});
 };
 const currentCargo=(w:Worker)=>w.role==='prep'?(w.inventory.find(c=>c.stage!=='brewed')??w.inventory[0]):w.inventory[0];
 const currentJob=(w:Worker)=>w.role==='floor'&&w.job?w.job:jobs.find(j=>j.ticketId===currentCargo(w)?.ticketId);
 const record=(w:Worker,command:string,line:number,from:Point,end:number,extra:Partial<ExecutionEvent>={})=>log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end,line,command,from,to:w.position,inventory:structuredClone(w.inventory),customerId:currentJob(w)?.event.customer.customer_id,...extra});
 const schedule=(w:Worker,seconds:number,command:string,line:number,apply:()=>void,extra:Partial<ExecutionEvent>={})=>{
  const actionJob=command.startsWith('DEPOSIT')||command==='ADD SUGAR'?jobs.find(j=>j.ticketId===w.inventory.find(c=>c.stage==='brewed')?.ticketId):currentJob(w)??(command.startsWith('WAIT ')?nextWork(command):undefined);
  const automatic=number<(w.role==='prep'?15:23);
  const duration=live?(automatic?seconds/12:BLOCK_SECONDS/(w.move?.requested??1)):seconds;
  const from=w.position,begin=now,end=now+duration;
  const preview:ExecutionEvent={seed_id:seed,actor:w.actor,role:w.role,start:begin,end,line,command,from,to:w.move?[from[0]+w.move.direction[0],from[1]+w.move.direction[1]]:from,inventory:structuredClone(w.inventory),customerId:actionJob?.event.customer.customer_id,ticketId:actionJob?.ticketId,...extra};
  if(live)log.push(preview);
  w.pending={end,apply:()=>{apply();if(live){preview.to=w.position;preview.inventory=structuredClone(w.inventory);}else log.push({seed_id:seed,actor:w.actor,role:w.role,start:begin,end,line,command,from,to:w.position,inventory:structuredClone(w.inventory),customerId:actionJob?.event.customer.customer_id,ticketId:actionJob?.ticketId,...extra});}};
 };
 const station=(w:Worker,p:Point,name:string)=>{if(!samePoint(w.position,p)){fail(w,`Move to the ${name} interaction tile (${p.join(', ')}) first.`);return false;}return true;};
 const capacity=(w:Worker)=>w.role==='prep'?config.prepCapacity:config.floorCapacity;
 const condition=(w:Worker,c:string)=>{const job=currentJob(w);const comparison=parseComparison(`IF ${c}`);if(comparison){const speech={drink:job?.item,with_sugar:(job?.sugar??0)>0,sugar_count:job?.sugar};return evaluateComparison(comparison,speech,speech);}return c==='coffee'?job?.item==='coffee':c==='tea'?job?.item==='tea':c==='sugar'?(job?.sugar??0)>0:c.startsWith('TABLE ')?job?.table===Number(c.slice(6)):false;};
 const canClaimDrink=(j:Job)=>j.status==='ready'&&j.event.timing.seated<=now&&tableOwners.get(j.table)===j.event.customer.customer_id;
 const nextWork=(c:string)=>c==='WAIT TICKET'?jobs.find(j=>j.status==='ticket'&&j.created<=now):c==='WAIT DRINK'?jobs.find(canClaimDrink):jobs.find(j=>j.status==='dirty'&&j.dirtyAt<=now);
 const markWaiting=(w:Worker,line:number,command:string)=>{
  if(!live)return;
  const previous=log.at(-1);
  if(previous?.actor===w.actor&&previous.line===line&&previous.command===command&&previous.start===now&&previous.end===now)return;
  log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end:now,line,command,from:w.position,to:w.position,inventory:structuredClone(w.inventory),customerId:currentJob(w)?.event.customer.customer_id});
 };
 const step=(w:Worker):boolean=>{
  if(w.done||w.pending||failure)return false;
  const p=w.program,c=p.instructions[w.pc],line=p.source_lines[w.pc]??-1;
  if(p.compile_error){fail(w,p.compile_error,p.error_line);return false;}
  if(c===undefined){w.done=true;return true;}
  if(c.startsWith('WAIT ')&&!nextWork(c)){markWaiting(w,line,c);return false;}
  if(w.move){
   const move=w.move,next:Point=[w.position[0]+move.direction[0],w.position[1]+move.direction[1]];
   if(!move.remaining||!isWalkable(next,w.role)){
    const complete=()=>{record(w,move.command,move.line,move.from,now,{requested:move.requested,completed:move.completed,from:w.position});w.move=undefined;w.pc++;};
    const end=move.started+BLOCK_SECONDS;
    if(live&&number>=(w.role==='prep'?15:23)&&end>now+1e-8){
     log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end,line:move.line,command:move.command,from:w.position,to:w.position,inventory:structuredClone(w.inventory),requested:move.requested,completed:move.completed});
     w.pending={end,apply:complete};
    }else complete();
    return true;
   }
   schedule(w,1,move.command,line,()=>{w.position=next;move.remaining--;move.completed++;},{requested:move.requested,completed:move.completed+1});return true;
  }
  if(++w.count>10000){fail(w,'Instruction limit reached (10,000 per robot).');return false;}
  if(c.startsWith('MOVE ')){
   const [,dir,n]=c.split(' '),normalized=normalizeDirection(dir);
   if(!normalized){fail(w,`Unknown movement direction: ${dir}`,line);return false;}
   const direction:Point=directionVectors[normalized];
   w.move={started:now,from:w.position,direction,remaining:Number(n),requested:Number(n),completed:0,line,command:c};return true;
  }
  const control=(apply:()=>void)=>{if(live)schedule(w,1,c,line,apply);else{record(w,c,line,w.position,now);apply();}return true;};
  if(c.startsWith('IF ')){return control(()=>{w.pc=condition(w,c.slice(3))?w.pc+1:(p.alternatives[w.pc]??p.ends[w.pc])+1;});}
  if(c==='ELSE'){record(w,c,line,w.position,now);w.pc=p.ends[w.pc]+1;return true;}
  if(c.startsWith('FUNCTION ')){w.pc=p.ends[w.pc]+1;return true;}
  if(c.startsWith('CALL ')){if(w.stack.length){fail(w,'Recursive calls are not supported.');return false;}return control(()=>{w.stack.push(w.pc+1);w.pc=p.functions[c.slice(5)]+1;});}
  if(c==='RETURN'||c==='END'&&p.instructions[p.ends[w.pc]]?.startsWith('FUNCTION ')){const back=w.stack.pop();if(back===undefined){fail(w,'RETURN requires an active function.');return false;}return control(()=>{w.pc=back;});}
  if(c==='END'||c==='REPEAT'){return control(()=>{w.pc=c==='REPEAT'?0:w.pc+1;});}
  const cargo=currentCargo(w),job=currentJob(w);
  let apply:()=>void=()=>{},seconds=1;
  if(c==='WAIT TICKET'){
   if(!station(w,STATIONS.orders.prep,'order handoff'))return false;
   if(w.inventory.length>=capacity(w)){fail(w,'Carrying capacity reached. Deposit a drink before claiming another ticket.');return false;}
   const next=nextWork(c)!;apply=()=>{next.status='claimed';w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'claimed',sugar:0});};
  }else if(c==='WAIT DRINK'||c==='WAIT DIRTY'){
   if(w.job){fail(w,'Finish the claimed job before waiting for another.');return false;}
   const next=nextWork(c)!;apply=()=>{w.job=next;next.status='reserved';if(c==='WAIT DRINK')tableOwners.set(next.table,next.event.customer.customer_id);};
  }else if(w.role==='floor'&&(c==='PICKUP'||c.startsWith('PICKUP ')||c.startsWith('TAKE '))){
   if(!station(w,STATIONS.pickup.floor,'pickup'))return false;
   const direction=c==='PICKUP'?'DOWN':normalizeDirection(c.split(' ')[1]);
   if(direction!=='DOWN'){fail(w,'Take the ready drink downward from the pickup counter.');return false;}
   if(!w.job||w.job.status!=='reserved'||w.job.dirtyAt!==Infinity){fail(w,'WAIT DRINK before taking a ready drink.');return false;}
   if(w.inventory.length>=capacity(w)){fail(w,'Tray is full. Serve a carried item first.');return false;}
   const next=w.job;apply=()=>{next.status='carried';w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'brewed',sugar:next.sugar});w.job=undefined;};
  }else if(c==='SERVE'){
   if(!cargo||cargo.stage!=='brewed'||!job){fail(w,'Carry a ready drink before serving.');return false;}
   if(!station(w,tableFront(cargo.table-1),`table ${cargo.table}`))return false;
   if(job.event.timing.seated>now){markWaiting(w,line,c);return false;}
   apply=()=>{
    w.inventory.shift();job.status='served';job.dirtyAt=now+DRINK_SECONDS;job.event.timing.served=now;const paper=job.event.tickets.find(t=>belongsToPaper(job.ticketId,t))!;
    if(jobs.filter(j=>belongsToPaper(j.ticketId,paper)).every(j=>Number.isFinite(j.dirtyAt)))paper.status='served';
    const group=jobs.filter(j=>j.event===job.event);
    if(group.length===job.event.tickets.reduce((sum,t)=>sum+(t.quantity??1),0)&&job.event.tickets.every(ticket=>ticket.status==='served'))job.event.timing.left=Math.max(...group.map(served=>served.dirtyAt));
   };
  }else if(c==='COLLECT'){
   if(!w.job||w.job.dirtyAt>now){fail(w,'WAIT DIRTY before collecting a used cup.');return false;}
   if(!station(w,tableFront(w.job.table-1),`table ${w.job.table}`))return false;
   if(w.inventory.length>=capacity(w)){fail(w,'Tray is full. Return cups before collecting another.');return false;}
   const next=w.job;apply=()=>{w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'dirty',sugar:0});next.status='carried';w.job=undefined;};
  }else if(c==='RETURN CUPS'){
   if(!station(w,STATIONS.returns.floor,'cup return'))return false;
   if(!cargo||cargo.stage!=='dirty'||!job){fail(w,'Carry a used cup before returning it.');return false;}
   apply=()=>{w.inventory.shift();job.status='cleared';job.event.timing.cleaned=now;if(jobs.filter(j=>j.event===job.event).every(j=>j.status==='cleared'))tableOwners.delete(job.table);};
  }else{
   if(!cargo||!job){fail(w,'WAIT TICKET before preparing a drink.');return false;}
   const rules:Record<string,{point:Point;stage:Cargo['stage'];previous:Cargo['stage'][];item?:Cargo['item'];duration?:number}>={
    'TAKE BEANS':{point:STATIONS.ingredients.prep,stage:'beans',previous:['claimed'],item:'coffee'},
    'TAKE LEAVES':{point:STATIONS.ingredients.prep,stage:'leaves',previous:['claimed'],item:'tea'},
    'GRIND':{point:STATIONS.grinder.prep,stage:'ground',previous:['beans'],duration:2},
    'FILL WATER':{point:STATIONS.water.prep,stage:'water',previous:['ground','leaves']},
    'BREW':{point:STATIONS.brewer.prep,stage:'brewed',previous:['water'],item:'coffee',duration:6},
    'STEEP':{point:STATIONS.brewer.prep,stage:'brewed',previous:['water'],item:'tea',duration:7},
   };
   let recipeCommand=c;
   if(c.startsWith('TAKE ')&&normalizeDirection(c.slice(5))){
    if(!station(w,STATIONS.ingredients.prep,'ingredients'))return false;
    if(normalizeDirection(c.slice(5))!=='UP'){fail(w,'Take ingredients upward from the storage counter.');return false;}
    recipeCommand=job.item==='coffee'?'TAKE BEANS':'TAKE LEAVES';
   }
   const rule=rules[recipeCommand];
   // Once brewed, sugar and deposit operate on the oldest finished drink.
   const finished=w.inventory.find(item=>item.stage==='brewed');
   if(c==='ADD SUGAR'||c==='DEPOSIT'||c.startsWith('DEPOSIT ')){
    const ready=finished,readyJob=jobs.find(j=>j.ticketId===ready?.ticketId);
    if(!ready||!readyJob){fail(w,'Finish brewing before adding sugar or depositing.');return false;}
    if(!station(w,c==='ADD SUGAR'?STATIONS.sugar.prep:STATIONS.pickup.prep,c==='ADD SUGAR'?'sugar':'pickup'))return false;
    if(c==='ADD SUGAR')apply=()=>{ready.sugar=readyJob.sugar;};
    else {
     const direction=c==='DEPOSIT'?'UP':normalizeDirection(c.slice('DEPOSIT '.length));
     if(direction!=='UP'){fail(w,'Deposit the prepared drink upward into the pickup counter.');return false;}
     if(ready.sugar!==readyJob.sugar){fail(w,'The prepared drink has the wrong sugar amount.');return false;}
     apply=()=>{w.inventory.splice(w.inventory.indexOf(ready),1);readyJob.status='ready';readyJob.event.timing.ready=now;};
    }
   }else if(rule){
    if(!station(w,rule.point,c.toLowerCase()))return false;
    if(!rule.previous.includes(cargo.stage)||rule.item&&rule.item!==cargo.item){fail(w,`Invalid recipe step: ${c} after ${cargo.stage} for ${cargo.item}.`);return false;}
    seconds=rule.duration??1;apply=()=>{cargo.stage=rule.stage;};
   }else {fail(w,`Unsupported action: ${c}`);return false;}
  }
  schedule(w,seconds,c,line,()=>{apply();w.maxLoad=Math.max(w.maxLoad,w.inventory.length);w.pc++;});return true;
 };
 const finished=()=>jobs.every(j=>config.objective==='prepare'?['ready','reserved','carried','served','dirty','cleared'].includes(j.status):config.objective==='pickup'?['carried','served','dirty','cleared'].includes(j.status):config.clearing?j.status==='cleared':['served','dirty','cleared'].includes(j.status));
 let transitions=0;
 while(!failure&&now<=3600&&transitions++<200000){
  if(live){
   live.pump(now,log);
   queryFailure=events.find(e=>!e.passed);
   for(const event of events)for(const ticket of event.tickets){
    if(jobs.some(j=>belongsToPaper(j.ticketId,ticket)))continue;
    for(const unit of ticketUnits(ticket))jobs.push({ticketId:unit.ticket_id,table:event.table,item:ticket.item as 'coffee'|'tea',sugar:sugarOf(ticket),event,created:ticket.created_at,status:'ticket',dirtyAt:Infinity});
   }
  }
  if(queryFailure&&now>=queryFailure.timing.created){const position=log.findLast(e=>e.actor==='query')?.to??STARTS.query;failure={role:'query',line:queryFailure.failure_line??0,time:now,reason:queryFailure.reason??'Order program failed.',event:queryFailure};log.push({seed_id:seed,actor:'query',role:'query',start:now,end:now,line:failure.line,command:queryFailure.trace.at(-1)?.command??'COMPILE',from:position,to:position,inventory:[],error:failure.reason,customerId:queryFailure.customer.customer_id});break;}
  for(const w of workers)if(w.pending&&w.pending.end<=now){const pending=w.pending;w.pending=undefined;pending.apply();}
  if(manualIntake&&manualIntake.end<=now){const intake=manualIntake;manualIntake=undefined;intake.apply();}
  if(!live&&number<3&&!manualIntake&&manualIndex<events.length&&events[manualIndex].customer.arrival<=now){
   const event=events[manualIndex++],path=gridRoute(nikoPosition,MANUAL_INTAKE);let arrival=now;
   path.slice(1).forEach((to,i)=>log.push({seed_id:seed,actor:'niko',role:'query',start:arrival,end:++arrival,line:-1,command:'WALK TO ORDER COUNTER',from:path[i],to,inventory:[]}));
   const end=arrival+9;intakeFree=end;
   log.push({seed_id:seed,actor:'niko',role:'query',start:arrival,end,line:-1,command:'TAKE ORDER',from:MANUAL_INTAKE,to:MANUAL_INTAKE,inventory:[],customerId:event.customer.customer_id});
   manualIntake={end,apply:()=>{nikoPosition=MANUAL_INTAKE;event.timing.created=end;for(const job of jobs.filter(j=>j.event===event)){job.created=end;event.tickets.find(t=>belongsToPaper(job.ticketId,t))!.created_at=end;}}};
  }
  for(const job of jobs)if(job.status==='served'&&job.dirtyAt<=now)job.status='dirty';
  // Reserve a table as the customer chooses it; delivery waits for the seated timestamp.
  for(const [index,event] of events.entries()){
   if(event.timing.created<=now&&event.tickets.length&&event.timing.seated===Infinity&&!tableOwners.has(event.table)){
    tableOwners.set(event.table,event.customer.customer_id);
    event.timing.seating=now;
    event.timing.seated=now+seatingDuration(event.table-1,index%2 as 0|1);
   }
   if(!config.clearing&&event.timing.left<=now&&tableOwners.get(event.table)===event.customer.customer_id)tableOwners.delete(event.table);
  }
  if((!live||live.done())&&finished()&&workers.every(w=>!w.pending)&&workers.every(w=>!w.move)&&now>=intakeFree&&(config.objective!=='serve'||events.every(event=>!event.tickets.length||now>=event.timing.left+STREET_EXIT_SECONDS))){
   const floor=workers[1],loadWorker=number<23?workers[0]:floor;
   if((config.minLoad??0)>loadWorker.maxLoad){fail(loadWorker,`This shift requires carrying ${config.minLoad} items together.`);break;}
   else break;
  }
  let advanced=false;for(const w of workers){if(config.objective==='prepare'&&w.role==='floor')continue;advanced=step(w)||advanced;}
  if(failure)break;
  if(advanced)continue;
  const future=[...events.flatMap(event=>[event.timing.created,event.timing.seated,event.timing.left,event.timing.left+STREET_EXIT_SECONDS]).filter(t=>t>now),...(live?[live.next()]:[]),...(queryFailure&&queryFailure.timing.created>now?[queryFailure.timing.created]:[]),...(manualIntake?[manualIntake.end]:[]),...(!live&&number<3&&manualIndex<events.length?[events[manualIndex].customer.arrival]:[]),...workers.flatMap(w=>w.pending?[w.pending.end]:[]),...jobs.filter(j=>j.status==='ticket'&&j.created>now).map(j=>j.created),...jobs.filter(j=>j.status==='served'&&j.dirtyAt>now).map(j=>j.dirtyAt)].filter(t=>Number.isFinite(t)&&t>now);
  if(!future.length){if(!finished())fail(workers.find(w=>!w.done)??workers[0],'Unfinished work: no worker can advance. Check event waits, routes, and repeat instructions.');break;}
  const next=Math.min(...future);
  yield next;
  now=next;
 }
 if(!failure&&(now>3600||transitions>=200000))fail(workers[0],'Simulation limit reached (3,600 seconds).');
 for(const event of events){
  const created=Number.isFinite(event.timing.created)?event.timing.created:Math.max(now,event.timing.arrival);
  const served=Number.isFinite(event.timing.served)?event.timing.served:Math.max(now,created);
  event.satisfaction=Math.round(Math.max(0,100-(created-event.timing.arrival)*.6-(served-created)*.05)*10)/10;
 }
 if(failure){for(let i=log.length-1;i>=0;i--)if(log[i].start>failure.time)log.splice(i,1);}
 log.sort((a,b)=>a.start-b.start||a.end-b.end);
 return {execution:{seed_id:seed,start,duration:failure?Math.max(.1,Math.min(failure.time,3600)):Math.max(1,Math.min(now,3600),...log.map(e=>e.end)),events:log},failure,instructions:workers.filter(w=>number>=(w.role==='prep'?15:23)).reduce((n,w)=>n+w.count,0)};
}

/** Batch validation uses the exact service rules without presentation delays. */
export function simulateService(level:LevelDefinition,events:ReplayEvent[],programs:RobotPrograms,start=0):ServiceResult {
 const execution=streamService(level,events,programs,start);
 let step=execution.next();
 while(!step.done)step=execution.next();
 return step.value;
}
