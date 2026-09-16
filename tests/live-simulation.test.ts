import { describe, expect, it } from 'vitest';
import { createLiveRun } from '../src/domain/liveSimulation';
import { levels, lessons } from '../src/data';
import { referencePrograms } from '../src/data/extension';
import { sampleReplay } from '../src/domain/replay';
import { STATIONS, tableSeat } from '../src/domain/layout';
import { DRINK_SECONDS, SIT_SECONDS } from '../src/domain/street';

function programs(index: number) {
 return index >= 14 ? referencePrograms(index+1) : {query:lessons[index].solution,prep:'',floor:''};
}
function finish(run: ReturnType<typeof createLiveRun>) {
 let frame=run.snapshot();
 for(let i=0;i<10000&&!frame.done;i++)frame=run.advance(.5);
 expect(frame.done).toBe(true);
 return frame;
}
describe('live service',()=>{
 it('does no execution on creation and advances only as time passes',()=>{
  const run=createLiveRun(levels[2],programs(2));
  expect(run.snapshot().result.execution).toEqual([]);
  expect(run.snapshot().result.tickets).toEqual([]);
  expect(run.snapshot().result.stars).toBe(0);
  const first=run.advance(2+levels[2].seeds[0].customers[0].arrival);
  expect(first.done).toBe(false);
  expect(first.result.events[0].trace.map(t=>t.command)).toEqual(['LISTEN']);
  expect(first.result.tickets).toEqual([]);
  expect(run.advance(1).result.events[0].trace).toHaveLength(1);
  expect(run.advance(.5).result.events[0].trace).toHaveLength(2);
 });
 it('records paper pickup, writing and deposit without changing earlier snapshots',()=>{
  const run=createLiveRun(levels[2],programs(2));
  const {result}=finish(run);
  const events=result.execution![0].events.filter(event=>event.actor==='query');
  const take=events.find(event=>event.command==='TAKE UP')!;
  const write=events.find(event=>event.command==='ITEM coffee')!;
  const deposit=events.find(event=>event.command==='DEPOSIT RIGHT')!;
  expect(take.heldPaper?.item).toBe('');
  expect(write.heldPaper?.item).toBe('coffee');
  expect(deposit.heldPaper).toBeUndefined();
  expect(sampleReplay(result,take.end+.01).actors.query?.heldPaper?.item).toBe('');
  expect(sampleReplay(result,write.end+.01).actors.query?.heldPaper?.item).toBe('coffee');
  expect(sampleReplay(result,deposit.end+.01).actors.query?.heldPaper).toBeUndefined();
 });
 it('waits for seating, keeps customers in their chairs while drinking, and stands before leaving',()=>{
  const {result}=finish(createLiveRun(levels[2],programs(2)));
  const event=result.events[0], timing=event.timing;
  const customer=(time:number)=>sampleReplay(result,time).customers.find(customer=>customer.id===event.customer.customer_id)!;
  expect(customer(timing.arrival+.01).position).toEqual(STATIONS.orders.floor);
  expect(timing.seated).toBeGreaterThan(timing.created);
  expect(customer(timing.seated).position).toEqual(tableSeat(event.table-1,0));
  expect(customer(timing.seated).seated).toBe(true);
  const claims=result.execution![0].events.filter(log=>log.command==='WAIT DRINK'&&log.ticketId===event.tickets[0].ticket_id&&log.end>log.start);
  expect(claims.length).toBeGreaterThan(0);
  expect(claims.every(log=>log.start>=timing.seated)).toBe(true);
  expect(timing.served).toBeGreaterThanOrEqual(timing.seated);
  expect(timing.left-timing.served).toBeCloseTo(DRINK_SECONDS);
  expect(customer(timing.served+.1).drinking).toBe(true);
  expect(customer(timing.left+SIT_SECONDS/2).sit).toBeCloseTo(.5);
  expect(customer(timing.left+SIT_SECONDS/2).position).toEqual(tableSeat(event.table-1,0));
  expect(customer(timing.left+SIT_SECONDS+.1).walking).toBe(true);
 });
 it('turns Query toward paper pickup and movement and only walks during movement',()=>{
  const {result}=finish(createLiveRun(levels[2],programs(2)));
  const logs=result.execution![0].events.filter(event=>event.actor==='query');
  const take=logs.find(event=>event.command==='TAKE UP')!;
  const move=logs.find(event=>event.command==='MOVE RIGHT 1')!;
  const atTake=sampleReplay(result,(take.start+take.end)/2).actors.query!;
  expect(atTake.facing).toBe(Math.PI);
  expect(atTake.walking).toBe(false);
  expect(atTake.reach).toBeCloseTo(1);
  const atMove=sampleReplay(result,(move.start+move.end)/2).actors.query!;
  expect(atMove.facing).toBe(Math.PI/2);
  expect(atMove.walking).toBe(true);
 });
 it('records a zero-duration wait while an automatic worker is idle',()=>{
  const run=createLiveRun(levels[2],programs(2));
  const frame=run.advance(2+levels[2].seeds[0].customers[0].arrival);
  expect(frame.result.execution?.[0].events.some(e=>e.actor==='prep'&&e.command==='WAIT TICKET'&&e.start===e.end)).toBe(true);
 });
 it('reaches a bad instruction after the preceding blocks instead of jumping to failure',()=>{
  const run=createLiveRun(levels[2],{query:'LISTEN\nITEM coffee',prep:'',floor:''});
  const first=run.advance(2+levels[2].seeds[0].customers[0].arrival);
  expect(first.result.first_failure).toBeNull();
  expect(run.advance(1.5).done).toBe(false);
  const failed=run.advance(1.5);
  expect(failed.done).toBe(true);
  expect(failed.result.first_failure?.error_line).toBe(1);
  expect(failed.result.stars).toBe(0);
  expect(failed.result.execution![0].events.filter(e=>e.actor==='query').map(e=>e.command)).toEqual(['LISTEN','ITEM coffee','ITEM coffee']);
 });
 it('flags a wrong drink on the write instruction before moving or submitting it',()=>{
  const level={...levels[3],seeds:[{id:'wrong-drink',customers:[{...levels[3].seeds[0].customers[0],arrival:0,heard_orders:[{tokens:['tea']}],intent:{drink:'tea' as const},expected:{item:'tea' as const}}]}]};
  const run=createLiveRun(level,{query:'LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT',prep:'',floor:''});
  const failed=finish(run);
  expect(failed.result.first_failure?.error_line).toBe(2);
  expect(failed.result.events[0].trace.map(e=>e.command)).toEqual(['LISTEN','TAKE UP','ITEM coffee']);
  expect(failed.result.tickets).toEqual([]);
  expect(Number.isFinite(failed.result.average_satisfaction)).toBe(true);
 });
 it('uses one scenario and produces the same outcome regardless of playback speed',()=>{
  const slow=createLiveRun(levels[4],programs(4)),fast=createLiveRun(levels[4],programs(4));
  const a=finish(slow);let b=fast.snapshot();while(!b.done)b=fast.advance(12);
  expect(a.result.passed).toBe(true);expect(b.result).toEqual(a.result);
  expect(a.result.required_seeds).toBe(1);
  expect(a.result.events).toHaveLength(levels[4].seeds[0].customers.length);
 });
 for(const [index,level] of levels.entries())it(`completes ${level.id} live with its reference program`,()=>{
  const frame=finish(createLiveRun(level,programs(index)));
  expect(frame.result.first_failure).toBeNull();
  expect(frame.result.passed).toBe(true);
  expect(frame.result.average_satisfaction).toBeGreaterThanOrEqual(0);
  expect(Number.isFinite(frame.result.average_satisfaction)).toBe(true);
 });
 it('runs the automatic kitchen and floor concurrently and animates pending movement',()=>{
  const run=createLiveRun(levels[4],programs(4));
  const result=finish(run).result;
  const log=result.execution![0].events;
  expect(log.some(a=>a.actor==='prep'&&log.some(b=>b.actor==='floor'&&a.start<b.end&&b.start<a.end))).toBe(true);
  expect(log.some(e=>e.actor==='niko')).toBe(false);
  const move=log.find(e=>e.actor==='prep'&&e.from[0]!==e.to[0])!;
  const actor=sampleReplay(result,(move.start+move.end)/2).actors.prep!;
  expect(actor.position[0]).toBeCloseTo((move.from[0]+move.to[0])/2);
 });
});
