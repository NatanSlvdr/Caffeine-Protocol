import { compileRobot } from './robotProgram';
import { floorSource, preparationSource } from './routines';
import { gridRoute, isWalkable, samePoint, MANUAL_INTAKE, STARTS, STATIONS, tableFront } from './layout';
import type { Point } from './layout';
import type { ActorId, Cargo, ExecutionEvent, LevelDefinition, Program, ReplayEvent, RobotPrograms, RobotRole, SeedExecution } from './types';

type Job={ticketId:string;table:number;item:'coffee'|'tea';sugar:number;event:ReplayEvent;created:number;status:'ticket'|'claimed'|'ready'|'reserved'|'carried'|'served'|'dirty'|'cleared';dirtyAt:number};
type Worker={role:'prep'|'floor';actor:ActorId;program:Program;pc:number;stack:number[];position:Point;inventory:Cargo[];job?:Job;battery:number;count:number;charges:number;maxLoad:number;done:boolean;pending?:{end:number;apply:()=>void};move?:{from:Point;direction:Point;remaining:number;requested:number;completed:number;line:number;command:string}};
export interface ServiceFailure {role:RobotRole;line:number;time:number;reason:string;event?:ReplayEvent}
export interface ServiceResult {execution:SeedExecution;failure?:ServiceFailure;instructions:number}
const configFor=(level:LevelDefinition)=>level.service??{prepCapacity:1,floorCapacity:1,battery:false,clearing:true,objective:'serve' as const};
const sugarOf=(ticket:ReplayEvent['tickets'][number])=>ticket.sugar_count??(ticket.with_sugar?1:0);
/** Execute workers on a deterministic event clock; only completed actions mutate shared queues. */
export function simulateService(level:LevelDefinition,events:ReplayEvent[],programs:RobotPrograms,start=0):ServiceResult{
 const number=Number(level.id.slice(1)),config=configFor(level),seed=events[0]?.seed_id??level.seeds[0].id;
 const log:ExecutionEvent[]=[],jobs:Job[]=[],tableOwners=new Map<number,string>();let now=0,failure:ServiceFailure|undefined,nikoPosition:Point=number>=15?STARTS.floor:number>=3?STARTS.prep:MANUAL_INTAKE,nikoBusy:Worker|undefined;
 const workers:Worker[]=(['prep','floor'] as const).map(role=>({role,actor:number>=(role==='prep'?15:23)?role:'niko',program:compileRobot(number>=(role==='prep'?15:23)?programs[role]:role==='prep'?preparationSource(32):floorSource(32),role,number>=(role==='prep'?15:23)?number:32),pc:0,stack:[],position:STARTS[role],inventory:[],battery:80,count:0,charges:0,maxLoad:0,done:false}));
 let intakeFree=0,manualIndex=0;let manualIntake:{end:number;apply:()=>void}|undefined;
 let queryPosition:Point=STARTS.query;
 for(const [index,event] of events.entries()){
  const created=Math.max(intakeFree,event.customer.arrival)+(level.programming_enabled?Math.max(.1,event.trace.length*.1):9);intakeFree=created;
  event.table=event.tickets.length?index%level.active_tables+1:0;
  event.timing={arrival:event.customer.arrival,created,seated:created,ready:created,served:created,left:created,cleaned:created};
  event.trace.forEach((step,i)=>{
   const from=queryPosition;
   if(step.command==='MOVE RIGHT 1')queryPosition=[STARTS.query[0]+1,STARTS.query[1]];
   if(step.command==='MOVE LEFT 1')queryPosition=STARTS.query;
   log.push({seed_id:seed,actor:level.programming_enabled?'query':'niko',role:'query',start:created-(event.trace.length-i)*.1,end:created-(event.trace.length-i-1)*.1,line:step.line,command:step.command,from,to:queryPosition,inventory:[],battery:80,customerId:event.customer.customer_id});
  });
  const submitted=log.filter(e=>e.actor==='query'&&e.command==='SUBMIT'&&e.customerId===event.customer.customer_id);
  for(const [ticketIndex,ticket] of (event.passed?event.tickets:[]).entries()){
   const handoff=submitted[ticketIndex]?.end??created;
   ticket.table_id=`T${String(event.table).padStart(2,'0')}`;ticket.status='created';ticket.created_at=handoff;
   jobs.push({ticketId:ticket.ticket_id,table:event.table,item:ticket.item as 'coffee'|'tea',sugar:sugarOf(ticket),event,created:number<3?Infinity:handoff,status:'ticket',dirtyAt:Infinity});
  }
 }
 const queryFailure=events.find(e=>!e.passed);
 const fail=(w:Worker,reason:string,line=w.program.source_lines[w.pc]??-1)=>{
  failure={role:w.role,line,time:now,reason,event:w.job?.event??jobs.find(j=>j.ticketId===w.inventory[0]?.ticketId)?.event??events[0]};
  log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end:now,line,command:w.program.instructions[w.pc]??'END OF PROGRAM',from:w.position,to:w.position,inventory:structuredClone(w.inventory),battery:w.battery,error:reason});
 };
 const currentCargo=(w:Worker)=>w.role==='prep'?(w.inventory.find(c=>c.stage!=='brewed')??w.inventory[0]):w.inventory[0];
 const currentJob=(w:Worker)=>w.role==='floor'&&w.job?w.job:jobs.find(j=>j.ticketId===currentCargo(w)?.ticketId);
 const record=(w:Worker,command:string,line:number,from:Point,end:number,extra:Partial<ExecutionEvent>={})=>log.push({seed_id:seed,actor:w.actor,role:w.role,start:now,end,line,command,from,to:w.position,inventory:structuredClone(w.inventory),battery:w.battery,customerId:currentJob(w)?.event.customer.customer_id,...extra});
 const schedule=(w:Worker,seconds:number,command:string,line:number,apply:()=>void,extra:Partial<ExecutionEvent>={})=>{
  const actionJob=command==='DEPOSIT'||command==='ADD SUGAR'?jobs.find(j=>j.ticketId===w.inventory.find(c=>c.stage==='brewed')?.ticketId):currentJob(w)??(command.startsWith('WAIT ')?nextWork(command):undefined);
  const from=w.position,begin=now,end=Math.round((now+seconds)*10)/10;
  w.pending={end,apply:()=>{apply();log.push({seed_id:seed,actor:w.actor,role:w.role,start:begin,end,line,command,from,to:w.position,inventory:structuredClone(w.inventory),battery:w.battery,customerId:actionJob?.event.customer.customer_id,ticketId:actionJob?.ticketId,...extra});if(w.actor==='niko')nikoPosition=w.position;}};
  if(w.actor==='niko')nikoBusy=w;
 };
 const station=(w:Worker,p:Point,name:string)=>{if(!samePoint(w.position,p)){fail(w,`Move to the ${name} interaction tile (${p.join(', ')}) first.`);return false;}return true;};
 const capacity=(w:Worker)=>w.role==='prep'?config.prepCapacity:config.floorCapacity;
 const condition=(w:Worker,c:string)=>{const job=currentJob(w);return c==='coffee'?job?.item==='coffee':c==='tea'?job?.item==='tea':c==='sugar'?(job?.sugar??0)>0:c==='BATTERY < 40'?w.battery<40:c.startsWith('TABLE ')?job?.table===Number(c.slice(6)):false;};
 const canClaimDrink=(j:Job)=>j.status==='ready'&&(!tableOwners.has(j.table)||tableOwners.get(j.table)===j.event.customer.customer_id);
 const nextWork=(c:string)=>c==='WAIT TICKET'?jobs.find(j=>j.status==='ticket'&&j.created<=now):c==='WAIT DRINK'?jobs.find(canClaimDrink):jobs.find(j=>j.status==='dirty'&&j.dirtyAt<=now);
 const step=(w:Worker):boolean=>{
  if(w.done||w.pending||failure||manualIntake&&w.actor==='niko')return false;
  if(w.actor==='niko'&&nikoBusy&&nikoBusy!==w)return false;
  const p=w.program,c=p.instructions[w.pc],line=p.source_lines[w.pc]??-1;
  if(p.compile_error){fail(w,p.compile_error,p.error_line);return false;}
  if(c===undefined){w.done=true;return true;}
  if(c.startsWith('WAIT ')&&!nextWork(c)){if(nikoBusy===w)nikoBusy=undefined;return false;}
  if(w.actor==='niko')nikoBusy=w;
  if(w.actor==='niko'&&!samePoint(nikoPosition,w.position)){
   // One Niko travels between duties; he never appears in two areas at once.
   const path=gridRoute(nikoPosition,w.position);let t=now;
   path.slice(1).forEach((to,i)=>{log.push({seed_id:seed,actor:'niko',role:w.role,start:t,end:++t,line:-1,command:'WALK TO WORKSTATION',from:path[i],to,inventory:[],battery:80});});
   nikoBusy=w;w.pending={end:t,apply:()=>{nikoPosition=w.position;}};return true;
  }
  if(w.move){
   const move=w.move,next:Point=[w.position[0]+move.direction[0],w.position[1]+move.direction[1]];
   if(!move.remaining||!isWalkable(next,w.role)){
    record(w,move.command,move.line,move.from,now,{requested:move.requested,completed:move.completed,from:w.position});w.move=undefined;w.pc++;return true;
   }
   if(w.role==='floor'&&config.battery&&w.actor!=='niko'&&w.battery<1){fail(w,'Battery empty. Route to the dock and CHARGE before moving.');return false;}
   schedule(w,1,move.command,line,()=>{w.position=next;if(w.role==='floor'&&config.battery&&w.actor!=='niko')w.battery--;move.remaining--;move.completed++;},{requested:move.requested,completed:move.completed+1});return true;
  }
  if(++w.count>10000){fail(w,'Instruction limit reached (10,000 per robot).');return false;}
  if(c.startsWith('MOVE ')){
   const [,dir,n]=c.split(' '),direction:Point=dir==='UP'?[0,-1]:dir==='DOWN'?[0,1]:dir==='LEFT'?[-1,0]:[1,0];
   w.move={from:w.position,direction,remaining:Number(n),requested:Number(n),completed:0,line,command:c};return true;
  }
  if(c.startsWith('IF ')){record(w,c,line,w.position,now);w.pc=condition(w,c.slice(3))?w.pc+1:(p.alternatives[w.pc]??p.ends[w.pc])+1;return true;}
  if(c==='ELSE'){record(w,c,line,w.position,now);w.pc=p.ends[w.pc]+1;return true;}
  if(c.startsWith('FUNCTION ')){w.pc=p.ends[w.pc]+1;return true;}
  if(c.startsWith('CALL ')){if(w.stack.length){fail(w,'Recursive calls are not supported.');return false;}record(w,c,line,w.position,now);w.stack.push(w.pc+1);w.pc=p.functions[c.slice(5)]+1;return true;}
  if(c==='RETURN'||c==='END'&&p.instructions[p.ends[w.pc]]?.startsWith('FUNCTION ')){const back=w.stack.pop();if(back===undefined){fail(w,'RETURN requires an active function.');return false;}record(w,c,line,w.position,now);w.pc=back;return true;}
  if(c==='END'||c==='REPEAT'){record(w,c,line,w.position,now);w.pc=c==='REPEAT'?0:w.pc+1;if(c==='REPEAT'&&nikoBusy===w)nikoBusy=undefined;return true;}
  const cargo=currentCargo(w),job=currentJob(w);
  let apply:()=>void=()=>{},seconds=1;
  if(c==='WAIT TICKET'){
   if(!station(w,STATIONS.orders.prep,'order handoff'))return false;
   if(w.inventory.length>=capacity(w)){fail(w,'Carrying capacity reached. Deposit a drink before claiming another ticket.');return false;}
   const next=nextWork(c)!;apply=()=>{next.status='claimed';w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'claimed',sugar:0});};
  }else if(c==='WAIT DRINK'||c==='WAIT DIRTY'){
   if(w.job){fail(w,'Finish the claimed job before waiting for another.');return false;}
   const next=nextWork(c)!;apply=()=>{w.job=next;next.status='reserved';if(c==='WAIT DRINK')tableOwners.set(next.table,next.event.customer.customer_id);};
  }else if(c==='PICKUP'){
   if(!station(w,STATIONS.pickup.floor,'pickup'))return false;
   if(!w.job||w.job.status!=='reserved'||w.job.dirtyAt!==Infinity){fail(w,'WAIT DRINK before picking up a ready drink.');return false;}
   if(w.inventory.length>=capacity(w)){fail(w,'Tray is full. Serve a carried item first.');return false;}
   const next=w.job;apply=()=>{next.status='carried';w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'brewed',sugar:next.sugar});w.job=undefined;};
  }else if(c==='SERVE'){
   if(!cargo||cargo.stage!=='brewed'||!job){fail(w,'Carry a ready drink before serving.');return false;}
   if(!station(w,tableFront(cargo.table-1),`table ${cargo.table}`))return false;
   apply=()=>{w.inventory.shift();job.status='served';job.dirtyAt=now+5;job.event.timing.served=now;job.event.tickets.find(t=>t.ticket_id===job.ticketId)!.status='served';};
  }else if(c==='COLLECT'){
   if(!w.job||w.job.dirtyAt>now){fail(w,'WAIT DIRTY before collecting a used cup.');return false;}
   if(!station(w,tableFront(w.job.table-1),`table ${w.job.table}`))return false;
   if(w.inventory.length>=capacity(w)){fail(w,'Tray is full. Return cups before collecting another.');return false;}
   const next=w.job;apply=()=>{w.inventory.push({ticketId:next.ticketId,table:next.table,item:next.item,stage:'dirty',sugar:0});next.status='carried';w.job=undefined;};
  }else if(c==='RETURN CUPS'){
   if(!station(w,STATIONS.returns.floor,'cup return'))return false;
   if(!cargo||cargo.stage!=='dirty'||!job){fail(w,'Carry a used cup before returning it.');return false;}
   apply=()=>{w.inventory.shift();job.status='cleared';job.event.timing.cleaned=now;if(jobs.filter(j=>j.event===job.event).every(j=>j.status==='cleared'))tableOwners.delete(job.table);};
  }else if(c==='CHARGE'){
   if(!station(w,STATIONS.dock.floor,'charging dock'))return false;seconds=10;apply=()=>{w.battery=80;w.charges++;};
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
   const rule=rules[c];
   // Once brewed, sugar and deposit operate on the oldest finished drink.
   const finished=w.inventory.find(item=>item.stage==='brewed');
   if(c==='ADD SUGAR'||c==='DEPOSIT'){
    const ready=finished,readyJob=jobs.find(j=>j.ticketId===ready?.ticketId);
    if(!ready||!readyJob){fail(w,'Finish brewing before adding sugar or depositing.');return false;}
    if(!station(w,c==='ADD SUGAR'?STATIONS.sugar.prep:STATIONS.pickup.prep,c==='ADD SUGAR'?'sugar':'pickup'))return false;
    if(c==='ADD SUGAR')apply=()=>{ready.sugar=readyJob.sugar;};
    else {if(ready.sugar!==readyJob.sugar){fail(w,'The prepared drink has the wrong sugar amount.');return false;}apply=()=>{w.inventory.splice(w.inventory.indexOf(ready),1);readyJob.status='ready';readyJob.event.timing.ready=now;};}
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
  if(queryFailure&&now>=queryFailure.timing.created){failure={role:'query',line:queryFailure.failure_line??0,time:now,reason:queryFailure.reason??'Order program failed.',event:queryFailure};log.push({seed_id:seed,actor:'query',role:'query',start:now,end:now,line:failure.line,command:queryFailure.trace.at(-1)?.command??'COMPILE',from:STARTS.query,to:STARTS.query,inventory:[],battery:80,error:failure.reason,customerId:queryFailure.customer.customer_id});break;}
  for(const w of workers)if(w.pending&&w.pending.end<=now){const pending=w.pending;w.pending=undefined;pending.apply();}
  if(manualIntake&&manualIntake.end<=now){const intake=manualIntake;manualIntake=undefined;intake.apply();}
  if(number<3&&!manualIntake&&!nikoBusy&&manualIndex<events.length&&events[manualIndex].customer.arrival<=now){
   const event=events[manualIndex++],path=gridRoute(nikoPosition,MANUAL_INTAKE);let arrival=now;
   path.slice(1).forEach((to,i)=>log.push({seed_id:seed,actor:'niko',role:'query',start:arrival,end:++arrival,line:-1,command:'WALK TO ORDER COUNTER',from:path[i],to,inventory:[],battery:80}));
   const end=arrival+9;intakeFree=end;
   log.push({seed_id:seed,actor:'niko',role:'query',start:arrival,end,line:-1,command:'TAKE ORDER',from:MANUAL_INTAKE,to:MANUAL_INTAKE,inventory:[],battery:80,customerId:event.customer.customer_id});
   manualIntake={end,apply:()=>{nikoPosition=MANUAL_INTAKE;event.timing.created=end;event.timing.seated=end;for(const job of jobs.filter(j=>j.event===event)){job.created=end;event.tickets.find(t=>t.ticket_id===job.ticketId)!.created_at=end;}}};
  }
  for(const job of jobs)if(job.status==='served'&&job.dirtyAt<=now)job.status='dirty';
  for(const event of events){const group=jobs.filter(j=>j.event===event);if(group.length&&group.every(j=>['served','dirty','cleared'].includes(j.status))){const left=Math.max(...group.map(j=>j.event.timing.served))+5;event.timing.left=left;}}
  if(finished()&&workers.every(w=>!w.pending)&&workers.every(w=>!w.move)&&now>=intakeFree){
   const floor=workers[1],loadWorker=number<23?workers[0]:floor;
   if((config.minCharges??0)>floor.charges){if(floor.program.instructions.includes('CHARGE')&&!floor.done){/* let the final return/charge finish */}else{fail(floor,'This shift requires a visit to the charging dock.');break;}}
   else if((config.minLoad??0)>loadWorker.maxLoad){fail(loadWorker,`This shift requires carrying ${config.minLoad} items together.`);break;}
   else break;
  }
  let advanced=false;for(const w of workers){if(config.objective==='prepare'&&w.role==='floor')continue;advanced=step(w)||advanced;}
  if(failure)break;
  if(advanced)continue;
  const future=[...(queryFailure&&queryFailure.timing.created>now?[queryFailure.timing.created]:[]),...(manualIntake?[manualIntake.end]:[]),...(number<3&&manualIndex<events.length?[events[manualIndex].customer.arrival]:[]),...workers.flatMap(w=>w.pending?[w.pending.end]:[]),...jobs.filter(j=>j.status==='ticket'&&j.created>now).map(j=>j.created),...jobs.filter(j=>j.status==='served'&&j.dirtyAt>now).map(j=>j.dirtyAt)].filter(t=>Number.isFinite(t)&&t>now);
  if(!future.length){if(!finished())fail(workers.find(w=>!w.done)??workers[0],'Unfinished work: no worker can advance. Check event waits, routes, and repeat instructions.');break;}
  now=Math.min(...future);
 }
 if(!failure&&(now>3600||transitions>=200000))fail(workers[0],'Simulation limit reached (3,600 seconds).');
 for(const event of events)event.satisfaction=Math.round(Math.max(0,100-(event.timing.created-event.timing.arrival)*.6-(event.timing.served-event.timing.created)*.05)*10)/10;
 if(failure){for(let i=log.length-1;i>=0;i--)if(log[i].start>failure.time)log.splice(i,1);}
 log.sort((a,b)=>a.start-b.start||a.end-b.end);
 return {execution:{seed_id:seed,start,duration:failure?Math.max(.1,Math.min(failure.time,3600)):Math.max(1,Math.min(now,3600),...log.map(e=>e.end)),events:log},failure,instructions:workers.filter(w=>w.actor!=='niko').reduce((n,w)=>n+w.count,0)};
}
