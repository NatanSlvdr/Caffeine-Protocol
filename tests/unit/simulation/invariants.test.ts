import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { ExecutionEvent, LevelDefinition, RunResult } from '../../../src/domain/types';
import { referenceProgramsFor } from '../../helpers/run';

const run = (i: number): RunResult => {
  const programs = referenceProgramsFor(i);
  return runLevel(levels[i], compileProgram(programs.query, i + 1), programs);
};
const results = levels.map((_, i) => run(i));
const shifts = levels.map((level, i) => [level.id, level, results[i]] as [string, LevelDefinition, RunResult]);
/** Every robot's events in a round, by what they did with a cup. */
const acts = (events: ExecutionEvent[], action: string) => events.filter((e) => e.action === action);
const count = (events: ExecutionEvent[]) => {
  const by = new Map<string, number>();
  for (const e of events) by.set(e.ticketId!, (by.get(e.ticketId!) ?? 0) + 1);
  return by;
};

describe('every reference service keeps the café’s books', () => {
  it('covers shifts that clear cups and shifts with only four of them', () => {
    expect(levels.filter((level) => level.service?.clearing).length).toBeGreaterThan(0);
    expect(levels.filter((level) => level.service?.cups).length).toBeGreaterThan(0);
  });

  it.each(shifts)('%s plays the same way twice', (_, __, result) => {
    expect(run(levels.findIndex((l) => l.id === result.level_id))).toEqual(result);
  });

  it.each(shifts)('%s serves every cup it was asked for exactly once, in order', (_, level, result) => {
    expect(result.passed).toBe(true);
    // Every round leaves a record of what each robot did; a missing one would make the checks below pass on nothing.
    expect(result.execution?.map((round) => round.seed_id)).toEqual(level.seeds.map((seed) => seed.id));
    // Before Brew, Moka makes the drinks; before Porter, Pip carries them. Either way each cup is made once.
    for (const round of result.execution ?? []) {
      const tickets = result.events.filter((e) => e.seed_id === round.seed_id).flatMap((e) => e.tickets);
      const asked = new Map(tickets.map((t) => [t.ticket_id, t.quantity ?? 1]));
      const made = acts(round.events, 'DEPOSIT').filter((e) => e.role === 'prep');
      const given = [...acts(round.events, 'SERVE'), ...acts(round.events, 'HAND OVER')];
      expect(count(made)).toEqual(asked);
      expect(count(acts(round.events, 'PICKUP'))).toEqual(asked);
      expect(count(given)).toEqual(asked);
      // A cup is made before it is picked up, and picked up before it reaches the customer.
      for (const [id] of asked) {
        const at = (events: ExecutionEvent[]) => events.filter((e) => e.ticketId === id).map((e) => e.start);
        expect(Math.max(...at(made))).toBeLessThanOrEqual(Math.max(...at(acts(round.events, 'PICKUP'))));
        expect(Math.min(...at(acts(round.events, 'PICKUP')))).toBeLessThanOrEqual(Math.min(...at(given)));
      }
    }
  });

  it.each(shifts)('%s keeps each customer’s visit in order', (_, __, result) => {
    for (const { timing } of result.events) {
      expect(timing.arrival).toBeLessThanOrEqual(timing.created);
      expect(timing.ready).toBeLessThanOrEqual(timing.served);
      expect(timing.served).toBeLessThanOrEqual(timing.left);
      if (timing.cleaned !== null) expect(timing.left).toBeLessThanOrEqual(timing.cleaned);
    }
  });

  it.each(shifts)('%s has each robot do one thing at a time and carry no more than it can', (_, level, result) => {
    const capacity = { query: 1, prep: level.service?.prepCapacity ?? 1, floor: level.service?.floorCapacity ?? 1 };
    for (const round of result.execution ?? [])
      for (const role of ['query', 'prep', 'floor'] as const) {
        const own = round.events.filter((e) => e.actor === role);
        for (const [k, e] of own.entries()) {
          expect(e.start).toBeLessThanOrEqual(e.end);
          if (k) expect(e.start).toBeGreaterThanOrEqual(own[k - 1].end - 1e-9);
          expect(e.inventory.length).toBeLessThanOrEqual(capacity[role]);
        }
      }
  });

  it.each(shifts.filter(([, level]) => level.service?.clearing))(
    '%s brings back every café cup it served, and never has more out than it owns',
    (_, level, result) => {
      for (const round of result.execution ?? []) {
        const served = acts(round.events, 'SERVE');
        expect(acts(round.events, 'COLLECT')).toHaveLength(served.length);
        expect(acts(round.events, 'RETURN CUPS')).toHaveLength(served.length);
        const cups = level.service?.cups;
        if (!cups) continue;
        for (const { end } of served) {
          const out =
            served.filter((e) => e.end <= end).length -
            acts(round.events, 'RETURN CUPS').filter((e) => e.end <= end).length;
          expect(out).toBeLessThanOrEqual(cups);
        }
      }
    },
  );
});
