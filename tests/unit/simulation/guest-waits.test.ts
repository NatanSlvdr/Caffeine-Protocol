import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { ReplayEvent, Timing } from '../../../src/domain/types';
import { guestWaits } from '../../../src/features/workspace/waits';
import { referenceProgramsFor } from '../../helpers/run';

/** A guest at a table (0 for take-away) with these timestamps, and a ticket unless told otherwise. */
const guest = (table: number, timing: Partial<Timing>, seed = 'A', tickets = 1) =>
  ({
    seed_id: seed,
    table,
    tickets: Array.from({ length: tickets }, () => ({})),
    timing: { arrival: 0, created: 0, seated: 0, ready: 0, served: 0, left: 0, cleaned: 0, ...timing },
  }) as unknown as ReplayEvent;
const seconds = (events: ReplayEvent[]) =>
  Object.fromEntries(guestWaits(events).map(({ stage, seconds }) => [stage, seconds]));
const reference = (shift: number) => {
  const programs = referenceProgramsFor(shift - 1);
  return runLevel(levels[shift - 1], compileProgram(programs.query, shift), programs);
};

describe('where the guests’ wait went', () => {
  it('splits a seated guest’s wait into ordering, the drink, and carrying it out', () => {
    expect(seconds([guest(1, { arrival: 0, created: 4, seating: 4, seated: 10, ready: 30, served: 45 })])).toEqual({
      making: 26,
      delivery: 15,
      ordering: 4,
    });
  });

  it('blames the table, not the drink, when the drink was ready before the guest sat', () => {
    const first = guest(1, { created: 2, seating: 2, seated: 8, ready: 20, served: 30, left: 40, cleaned: 70 });
    // Waits for table 1 from 12: taken until 40, then being cleared until 70, then a 6-second walk.
    const second = guest(1, { arrival: 10, created: 12, seating: 70, seated: 76, ready: 50, served: 80 });
    expect(seconds([first, second])).toEqual({
      making: 18,
      seating: 34,
      clearing: 30,
      delivery: 14,
      ordering: 4,
    });
  });

  it('reads the table queue per round, and counts nobody who ordered nothing or never got served', () => {
    // Table 1 in another round emptied at 15, which says nothing about why this guest waited until 20.
    const elsewhere = guest(1, { created: 0, seating: 0, seated: 5, ready: 5, served: 5, left: 15 }, 'B');
    const waiting = guest(1, { arrival: 0, created: 0, seating: 20, seated: 20, ready: 10, served: 20 });
    expect(seconds([elsewhere, waiting])).toEqual({ seating: 20, making: 5 });
    expect(
      guestWaits([
        guest(1, { arrival: 0, created: 50, ready: 60, served: 70 }, 'A', 0),
        guest(1, { arrival: 0, created: 5, ready: 60, served: Infinity }),
      ]),
    ).toEqual([]);
  });

  it('gives whole percents that add up to 100, largest first', () => {
    const shares = guestWaits([guest(0, { arrival: 0, created: 1, seated: 1, ready: 2, served: 3 })]);
    expect(shares.map(({ stage, percent }) => [stage, percent])).toEqual([
      ['ordering', 34],
      ['making', 33],
      ['delivery', 33],
    ]);
  });

  it('finds the one table of shifts 09–13 is what guests wait for, and its clearing after shift 14 drops it', () => {
    const single = guestWaits(reference(9).events);
    expect(single[0].stage).toBe('seating');
    expect(single.map((share) => share.stage)).toContain('clearing');
    // Shift 14's guests leave their cups behind: a table is free the moment its guest leaves.
    expect(guestWaits(reference(14).events).map((share) => share.stage)).not.toContain('clearing');
  });
});
