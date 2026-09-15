import { describe, expect, it } from 'vitest';
import { createLiveRun } from '../src/domain/liveSimulation';
import { levels, lessons } from '../src/data';
import { referencePrograms } from '../src/data/extension';
import { sampleReplay } from '../src/domain/replay';

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
  const level={...levels[3],seeds:[{id:'wrong-drink',customers:[{...levels[3].seeds[0].customers[0],arrival:0,intent:{drink:'tea' as const},expected:{item:'tea' as const}}]}]};
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
