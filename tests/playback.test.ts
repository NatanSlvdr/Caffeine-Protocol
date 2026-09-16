import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../src/data';
import { compileProgram } from '../src/domain/program';
import { runLevel } from '../src/domain/simulation';
import { sampleReplay } from '../src/domain/replay';

const base = runLevel(levels[2], compileProgram(lessons[2].solution,3));
describe('Query paper handoff',()=>{
 it('checks out automatically without a payment block after depositing paper',()=>{
  const source='LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
  const result=runLevel(levels[2],compileProgram(source,3));
  expect(result.passed).toBe(true);
  expect(result.events.every(e=>e.payment?.amount===3)).toBe(true);
  expect(result.events.flatMap(e=>e.trace).some(e=>e.command==='CHARGE ORDER')).toBe(false);
 });
 it('records Query moving to the counter before depositing',()=>{
  expect(base.passed).toBe(true);
  const events=base.execution![0].events.filter(e=>e.actor==='query');
  expect(events.map(e=>e.command)).toContain('TAKE UP');
  expect(events.map(e=>e.command)).toContain('DEPOSIT RIGHT');
  expect(events.find(e=>e.command==='MOVE RIGHT 1')?.to).toEqual([-4,5]);
  expect(events.find(e=>e.command==='MOVE LEFT 1')?.to).toEqual([-5,5]);
  const deposited=events.find(e=>e.command==='DEPOSIT RIGHT')!;
  expect(deposited.from).toEqual([-4,5]);
  expect(base.tickets[0].created_at).toBeCloseTo(deposited.end);
  expect(sampleReplay(base,deposited.end).waitingTickets.map(t=>t.ticket_id)).toContain(base.tickets[0].ticket_id);
 });
});
