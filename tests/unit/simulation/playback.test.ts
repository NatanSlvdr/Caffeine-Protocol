import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { sampleReplay } from '../../../src/domain/replay';
import { referencePrograms } from '../../../src/data/extension';
import type { ActorId } from '../../../src/domain/types';

const base = runLevel(levels[1], compileProgram(lessons[1].solution, 2));
describe('Query paper handoff', () => {
  it('checks out automatically without a payment block after depositing paper', () => {
    const source = 'LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1';
    const result = runLevel(levels[1], compileProgram(source, 2));
    expect(result.passed).toBe(true);
    expect(result.events.every((e) => e.payment?.amount === 3)).toBe(true);
    expect(result.events.flatMap((e) => e.trace).some((e) => e.command === 'CHARGE ORDER')).toBe(false);
  });
  it('records Query moving to the counter before depositing', () => {
    expect(base.passed).toBe(true);
    const events = base.execution![0].events.filter((e) => e.actor === 'query');
    expect(events.map((e) => e.command)).toContain('TAKE UP');
    expect(events.map((e) => e.command)).toContain('DEPOSIT RIGHT');
    expect(events.find((e) => e.command === 'MOVE RIGHT 1')?.to).toEqual([-4, 5]);
    expect(events.find((e) => e.command === 'MOVE LEFT 1')?.to).toEqual([-5, 5]);
    const deposited = events.find((e) => e.command === 'DEPOSIT RIGHT')!;
    expect(deposited.from).toEqual([-4, 5]);
    expect(base.tickets[0].created_at).toBeCloseTo(deposited.end);
    expect(sampleReplay(base, deposited.end).waitingTickets.map((t) => t.ticket_id)).toContain(
      base.tickets[0].ticket_id,
    );
  });
});

describe('the station a hand action reaches', () => {
  const at = (result: typeof base, actor: ActorId, command: RegExp) =>
    result
      .execution![0].events.filter((e) => e.actor === actor && command.test(e.command) && e.end > e.start)
      .map((e) => sampleReplay(result, (e.start + e.end) / 2).actors[actor]?.action?.at);

  it('is named on the action while it runs, and only on a hand action', () => {
    expect(at(base, 'query', /^TAKE /)).toEqual(['paper']);
    expect(at(base, 'query', /^DEPOSIT /)).toEqual(['handoff']);
    expect(at(base, 'query', /^MOVE /).every((name) => name === undefined)).toBe(true);
  });

  it('tells Brew’s stations and Porter’s tables apart', () => {
    const shift = 17;
    const result = runLevel(
      levels[shift - 1],
      compileProgram(referencePrograms(shift).query, shift),
      referencePrograms(shift),
    );
    expect(new Set(at(result, 'prep', /^(TAKE|USE|DEPOSIT) /))).toEqual(
      new Set(['storage', 'machine', 'sink', 'sugar', 'lids', 'pickup']),
    );
    expect(at(result, 'floor', /^(TAKE|DEPOSIT) /).some((place) => typeof place === 'object' && place.table > 0)).toBe(
      true,
    );
  });
});
