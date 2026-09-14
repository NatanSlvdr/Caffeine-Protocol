import { describe, it, expect } from 'vitest';
import { buildPlayback, samplePlayback, playbackClock } from '../src/domain/playback';
import { levels, lessons } from '../src/data';
import { compileProgram } from '../src/domain/program';
import { runLevel } from '../src/domain/simulation';
import { sampleReplay } from '../src/domain/replay';
import type { ExecutionEvent, RunResult } from '../src/domain/types';

const base = runLevel(levels[2], compileProgram(lessons[2].solution,3));
function event(patch: Partial<ExecutionEvent>): ExecutionEvent {
 return {seed_id:'test',actor:'query',role:'query',start:0,end:.1,line:0,command:'TICKET',from:[0,0],to:[0,0],inventory:[],battery:80,...patch};
}
function playback(events: ExecutionEvent[], duration=10) {
 const result:RunResult={...base,execution:[{seed_id:'test',start:0,duration,events}]};
 return buildPlayback(result);
}
describe('instruction-paced playback',()=>{
 it('gives short Query actions exactly two seconds at base speed',()=>{
  const frames=playback([event({}),event({start:.1,end:.2,line:1,command:'ITEM coffee'})]);
  for(const line of [0,1]) expect(frames.filter(f=>f.actions.some(e=>e.line===line)).reduce((n,f)=>n+f.end-f.start,0)).toBeCloseTo(2);
 });
 it('keeps automatic service fast and never exposes Niko instructions',()=>{
  const frames=playback([event({actor:'niko',start:0,end:10})]);
  expect(frames.at(-1)!.end).toBeCloseTo(2+10/12);
  expect(frames.flatMap(f=>f.actions)).toEqual([]);
 });
 it('holds instantaneous visible controls but skips hidden structural syntax',()=>{
  const frames=playback([event({end:0,command:'IF tea'}),event({end:0,line:1,command:'END'})]);
  const held=frames.find(f=>f.actions.length)!;
  expect(held.end-held.start).toBe(2);
  expect(samplePlayback(frames,held.start+1).actions[0].command).toBe('IF tea');
  expect(samplePlayback(frames,held.start+1).time).toBe(0);
 });
 it('paces a multi-tile MOVE as one block and preserves interpolated motion',()=>{
  const frames=playback([event({actor:'prep',role:'prep',command:'MOVE RIGHT 2',start:0,end:1,requested:2,completed:1}),event({actor:'prep',role:'prep',command:'MOVE RIGHT 2',start:1,end:2,requested:2,completed:2}),event({actor:'prep',role:'prep',command:'MOVE RIGHT 2',start:2,end:2,requested:2,completed:2})]);
  expect(frames.filter(f=>f.actions.length).reduce((n,f)=>n+f.end-f.start,0)).toBeCloseTo(2);
  expect(samplePlayback(frames,3).time).toBeCloseTo(1);
 });
 it('does not serialize concurrent robots and supports simulation-clock seeking',()=>{
  const frames=playback([event({}),event({actor:'prep',role:'prep',command:'BREW'})]);
  expect(frames.filter(f=>f.actions.length).reduce((n,f)=>n+f.end-f.start,0)).toBeCloseTo(2);
  expect(samplePlayback(frames,playbackClock(frames,.05)).time).toBeCloseTo(.05);
 });
});
describe('Query paper handoff',()=>{
 it('checks out automatically without a payment block after depositing paper',()=>{
  const source='LISTEN\nPICKUP UP\nITEM coffee\nDEPOSIT RIGHT';
  const result=runLevel(levels[2],compileProgram(source,3));
  expect(result.passed).toBe(true);
  expect(result.events.every(e=>e.payment?.amount===3)).toBe(true);
  expect(result.events.flatMap(e=>e.trace).some(e=>e.command==='CHARGE ORDER')).toBe(false);
 });
 it('records pickup and deposit without counter movement',()=>{
  expect(base.passed).toBe(true);
  const events=base.execution![0].events.filter(e=>e.actor==='query');
  expect(events.map(e=>e.command)).toContain('PICKUP UP');
  expect(events.map(e=>e.command)).toContain('DEPOSIT RIGHT');
  expect(events.some(e=>e.command.startsWith('MOVE '))).toBe(false);
  const deposited=events.find(e=>e.command==='DEPOSIT RIGHT')!;
  expect(deposited.from).toEqual([-5,5]);
  expect(base.tickets[0].created_at).toBeCloseTo(deposited.end);
  expect(sampleReplay(base,deposited.end).waitingTickets.map(t=>t.ticket_id)).toContain(base.tickets[0].ticket_id);
 });
});
