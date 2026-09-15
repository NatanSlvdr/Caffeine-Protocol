import { describe,it,expect } from 'vitest';
import { levels,lessons } from '../src/data';
import { referencePrograms } from '../src/data/extension';
import { compileProgram } from '../src/domain/program';
import { runLevel } from '../src/domain/simulation';

describe('complete campaign reference programs',()=>{
 for(const [i,level] of levels.entries())it(`${level.id} completes all seeds`,()=>{
  const programs=i>=14?referencePrograms(i+1):undefined;
  const result=runLevel(level,compileProgram(lessons[i].solution,Math.min(i+1,14)),programs);
  expect(result.first_failure).toBeNull();expect(result.passed).toBe(true);expect(result.passed_seeds).toBe(level.seeds.length);if(i>=2)expect(result.stars).toBe(3);
 });
});

import { compileRobot } from '../src/domain/robotProgram';
import { sampleReplay } from '../src/domain/replay';
import { simulateService } from '../src/domain/service';
import { isWalkable,samePoint,STARTS,STATIONS } from '../src/domain/layout';
import { movementSource } from '../src/domain/routines';
import type { LevelDefinition,ReplayEvent,RobotPrograms } from '../src/domain/types';

/** Small seeded services expose errors without relying on rendered graphics. */
function service(overrides:Partial<RobotPrograms>,shift=32,patch:Partial<LevelDefinition>={}){
 const level={...levels[shift-1],seeds:[levels[shift-1].seeds[0]],...patch};
 const programs={...referencePrograms(shift),...overrides};
 return runLevel(level,compileProgram(programs.query),programs);
}
function physical(source:string,role:'prep'|'floor'='prep'){
 const event:ReplayEvent={seed_id:'test',customer:{customer_id:'C1',arrival:0,phrase:'coffee',intent:{drink:'coffee'},expected:{item:'coffee'}},tickets:[{ticket_id:'one',customer_id:'C1',table_id:'T01',source_phrase:'coffee',source_intent:{drink:'coffee'},item:'coffee',with_sugar:false,sugar_count:0,status:'created',created_at:0,due_at:30,debug_notes:''}],asked_help:false,passed:true,trace:[],timing:{arrival:0,created:0,seated:0,ready:0,served:0,left:0,cleaned:0},table:1,satisfaction:100};
 const level={...levels[31],service:{...levels[31].service!,prepCapacity:1,floorCapacity:1,minLoad:0,minCharges:0}};
 return simulateService(level,[event],{...referencePrograms(32),prep:referencePrograms(20).prep,floor:referencePrograms(27).floor,[role]:source});
}

describe('movement language and execution',()=>{
 for(const command of ['MOVE UP 0','MOVE LEFT -1','MOVE DOWN 1.5','MOVE RIGHT 20','MOVE DIAGONAL 2'])it(`rejects ${command}`,()=>expect(compileRobot(command,'prep').compile_error).toContain('Unknown'));
 it('allows Query movement and gates station actions by role',()=>{
  expect(compileRobot('LISTEN\nMOVE UP 1','query').compile_error).toBe('');
  expect(compileRobot('BREW','floor').compile_error).not.toBe('');expect(compileRobot('CHARGE','prep').compile_error).not.toBe('');expect(compileRobot('CHARGE','floor',23).compile_error).not.toBe('');
 });
 it('stops before furniture and continues with the next command',()=>{
  const r=physical('MOVE LEFT 19\nMOVE RIGHT 1');const log=r.execution.events.filter(e=>e.actor==='prep');
  const stopped=log.find(e=>e.command==='MOVE LEFT 19'&&e.start===e.end);expect(stopped?.completed).toBe(0);expect(stopped?.to).toEqual(STARTS.prep);
  expect(log.some(e=>e.command==='MOVE RIGHT 1'&&samePoint(e.to,[STARTS.prep[0]+1,STARTS.prep[1]]))).toBe(true);expect(r.failure?.reason).toContain('Unfinished work');
 });
 it('does not enter another worker area or leave the room',()=>{
  const r=physical('MOVE RIGHT 19\nMOVE DOWN 19');const log=r.execution.events.filter(e=>e.actor==='prep');expect(log.find(e=>e.command==='MOVE RIGHT 19'&&e.start===e.end)?.to).toEqual([7,5]);expect(log.find(e=>e.command==='MOVE DOWN 19'&&e.start===e.end)?.to).toEqual([7,5]);expect(log.every(e=>isWalkable(e.to,'prep'))).toBe(true);
 });
 it('records one-second cardinal tile edges without customer collisions',()=>{
  const r=service({},31);for(const seed of r.execution??[])for(const e of seed.events.filter(e=>e.actor==='prep'||e.actor==='floor')){
   if(!samePoint(e.from,e.to)){expect(e.end-e.start).toBeCloseTo(1);expect(Math.abs(e.to[0]-e.from[0])+Math.abs(e.to[1]-e.from[1])).toBe(1);expect(isWalkable(e.to,e.role)).toBe(true);}
  }
 });
 it('bounds programs that cannot reach a wait',()=>{expect(physical('REPEAT').failure?.reason).toContain('10,000');});
});

describe('recipes, handoffs, and capacities',()=>{
 it('requires a claimed ticket and the correct station',()=>{
  expect(physical('GRIND').failure?.reason).toContain('WAIT TICKET');
  expect(physical('WAIT TICKET\nGRIND').failure?.reason).toContain('interaction tile');
 });
 it('claims tickets at the shared order counter, separately from drink pickup',()=>{
  const atPickup=[...movementSource(STARTS.prep,STATIONS.pickup.prep,'prep'),'WAIT TICKET'].join('\n');
  expect(physical(atPickup).failure?.reason).toContain('order handoff');
  const result=service({},20);
  expect(result.first_failure).toBeNull();
  const seed=result.execution![0];
  const claim=seed.events.find(e=>e.command==='WAIT TICKET')!;
  expect(claim.from).toEqual(STATIONS.orders.prep);
  const before=sampleReplay(result,seed.start+claim.start);
  expect(before.waitingTickets.some(t=>t.ticket_id===claim.ticketId)).toBe(true);
  const after=sampleReplay(result,seed.start+claim.end);
  expect(after.waitingTickets.some(t=>t.ticket_id===claim.ticketId)).toBe(false);
  expect(seed.events.filter(e=>e.command==='DEPOSIT').every(e=>samePoint(e.from,STATIONS.pickup.prep))).toBe(true);
 });
 it('rejects invalid recipe order',()=>{const commands=['WAIT TICKET',...movementSource(STARTS.prep,STATIONS.ingredients.prep,'prep'),'TAKE BEANS',...movementSource(STATIONS.ingredients.prep,STATIONS.water.prep,'prep'),'FILL WATER'];expect(physical(commands.join('\n')).failure?.reason).toContain('Invalid recipe');});
 it('validates sugar on deposited drinks',()=>{const r=service({prep:referencePrograms(32).prep.replace('ADD SUGAR','# omitted')});expect(r.first_failure?.reason).toContain('sugar');expect(r.first_failure?.role).toBe('prep');});
 it('rejects claiming beyond capacity',()=>{expect(service({prep:'WAIT TICKET\nWAIT TICKET'},15).first_failure?.reason).toContain('capacity');});
 it('rejects pickup without a claimed ready drink',()=>{expect(physical('PICKUP','floor').failure?.reason).toContain('WAIT DRINK');});
 it('rejects delivering at the wrong table',()=>{expect(physical('WAIT DRINK\nPICKUP\nSERVE','floor').failure?.reason).toContain('table 1 interaction tile');});
 it('supports grouped tickets and preserves carried item identity',()=>{
  const r=service({},32);expect(r.first_failure).toBeNull();for(const e of r.events)expect(e.tickets.every(t=>t.status==='served')).toBe(true);
  const logs=r.execution?.flatMap(s=>s.events)??[];expect(logs.some(e=>e.actor==='prep'&&e.inventory.length===2)).toBe(true);expect(logs.some(e=>e.actor==='floor'&&e.inventory.length===2)).toBe(true);
  for(const e of logs)for(const item of e.inventory)expect(r.tickets.some(t=>t.ticket_id===item.ticketId&&t.table_id===`T${String(item.table).padStart(2,'0')}`)).toBe(true);
 });
 it('clears only collected cups at the return station',()=>{expect(physical('RETURN CUPS','floor').failure?.reason).toContain('cup return interaction tile');const r=service({},30);expect(r.events.every(e=>e.timing.cleaned>e.timing.served)).toBe(true);});
});

describe('battery, concurrency, and replay',()=>{
 it('spends battery per completed tile and charges for ten seconds',()=>{
  const r=service({},29),log=r.execution![0].events.filter(e=>e.actor==='floor');let battery=80;
  for(const e of log){if(e.command==='CHARGE'){expect(e.end-e.start).toBeCloseTo(10);expect(e.battery).toBe(80);battery=80;}else if(!samePoint(e.from,e.to)){expect(e.battery).toBe(battery-1);battery=e.battery;}}
 });
 it('requires the dock and fails before movement at zero battery',()=>{
  expect(physical('CHARGE','floor').failure?.reason).toContain('charging dock');
  const route=[...movementSource(STARTS.floor,[3,-6],'floor'),...movementSource([3,-6],STARTS.floor,'floor'),'REPEAT'];const r=physical(route.join('\n'),'floor');expect(r.failure?.reason).toContain('Battery empty');expect(r.execution.events.filter(e=>e.actor==='floor').at(-1)?.battery).toBe(0);
 });
 it('runs the kitchen and floor concurrently while queues wait independently',()=>{
  const r=service({},31),log=r.execution![0].events;expect(log.some(a=>a.actor==='prep'&&a.end>a.start&&log.some(b=>b.actor==='floor'&&b.start<a.end&&b.end>a.start))).toBe(true);
 });
 it('has one Niko with no overlapping duties and no fallback after unlock',()=>{
  for(const shift of [2,14,15,23]){const r=shift<15?runLevel(levels[shift-1],compileProgram(lessons[shift-1].solution,shift)):service({},shift);for(const seed of r.execution??[]){const log=seed.events.filter(e=>e.actor==='niko'&&e.end>e.start);for(let i=1;i<log.length;i++)expect(log[i].start).toBeGreaterThanOrEqual(log[i-1].end);if(shift>=15)expect(log.every(e=>e.role==='floor')).toBe(true);if(shift>=23)expect(log).toHaveLength(0);}}
 });
 it('samples smooth movement from the execution log',()=>{
  const r=service({},31),seed=r.execution![0],edge=seed.events.find(e=>e.actor==='floor'&&!samePoint(e.from,e.to))!;
  const sample=sampleReplay(r,seed.start+(edge.start+edge.end)/2);expect(sample.actors.floor?.position).toEqual([(edge.from[0]+edge.to[0])/2,(edge.from[1]+edge.to[1])/2]);
 });
 it('returns the identical log on repeated runs without mutating campaign data',()=>{const before=JSON.stringify(levels[30]);const a=service({},31),b=service({},31);expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(JSON.stringify(levels[30])).toBe(before);});
 it('reports a blocked queue instead of hanging and identifies the robot and line',()=>{const r=service({prep:'WAIT TICKET\nMOVE LEFT 19'});expect(r.first_failure?.reason).toContain('Unfinished work');expect(r.first_failure?.role).toBeDefined();});
 it('freezes replay at the failure clock',()=>{const r=service({floor:'SERVE'},31);expect(r.first_failure?.role).toBe('floor');expect(r.execution![0].events.every(e=>e.start<=r.first_failure!.event_time)).toBe(true);});
});
