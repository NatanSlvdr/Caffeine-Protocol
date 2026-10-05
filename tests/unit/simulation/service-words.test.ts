import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram, runLevel, sampleReplay, type RobotPrograms } from '../../../src/domain';
import { guestDoing, happenings, summarize } from '../../../src/features/workspace/serviceWords';

const served = (shift: number, programs: RobotPrograms = referencePrograms(shift)) =>
  runLevel(levels[shift - 1], compileProgram(programs.query, shift), programs);

describe('the café told in words', () => {
  it('follows a guest from walking up to heading out', () => {
    const run = served(14);
    // Dot, third in, comes in while both tables are taken, so waits for one before sitting down.
    const guest = run.events.find((e) => e.seed_id === 'L14_A' && e.customer.customer_id === 'C3')!;
    const { arrival, created, seating, seated, served: out, left } = guest.timing;
    const at = [arrival - 1, arrival, created, seating!, seated, out, left].map((t) => guestDoing(guest, t, false));
    expect(at).toEqual([
      'Walking up to the café',
      'In line to order',
      'Waiting for a table',
      `Walking to table ${guest.table}`,
      `At table ${guest.table}, waiting for their coffee`,
      `Drinking their coffee at table ${guest.table}`,
      'Heading out, served',
    ]);
    expect(guestDoing(guest, arrival, true)).toBe('Ordering at the register');
  });

  it('says every guest in the café, the crew, and what waits on the counters', () => {
    const run = served(14);
    const summary = summarize(run, sampleReplay(run, 30), levels[13], 14);
    expect(summary.guests).toEqual([
      { who: 'Mr. Albert · “coffee, 0 sugars”', what: 'At table 1, waiting for their coffee' },
      { who: 'Guest 2 · “tea, 1 sugar”', what: 'At table 2, waiting for their tea' },
      { who: 'Dot · “coffee, 2 sugars”', what: 'Waiting for a table' },
      { who: 'Juno · “tea, 0 sugars”', what: 'Ordering at the register' },
    ]);
    expect([summary.served, summary.total]).toEqual([0, 4]);
    expect(summary.crew.map((line) => line.who)).toEqual(['Query', 'Brew', 'Porter']);
    expect(summary.crew[0].what).toBe('Waiting for orders');
    expect(summary.crew[1].what).toMatch(/; carrying .*Tea order ticket · Table 2$/);
    expect(summary.counters).toEqual([
      { who: 'Tickets for Brew', what: 'tea, coffee' },
      { who: 'Ready at pickup', what: 'None' },
    ]);
    expect(summary.stopped).toBeUndefined();
    // Where the café clears its tables, the cups left on them are counted too.
    const cleared = served(18);
    expect(summarize(cleared, sampleReplay(cleared, 75), levels[17], 18).counters.slice(1)).toEqual([
      { who: 'Ready at pickup', what: 'tea' },
      { who: 'Left on the tables', what: 'coffee at table 1' },
    ]);
    // Two of the same are counted together, and the stand-in is named as the café names it.
    expect(summarize(run, sampleReplay(run, 90), levels[13], 14).counters[0].what).toBe('2 tea');
    const early = served(3, { query: lessons[2].solution, prep: '', floor: '' });
    expect(summarize(early, sampleReplay(early, 5), levels[2], 3).counters[0].who).toBe('Tickets for Moka');
  });

  it('names what stopped the run, from the moment it did', () => {
    const run = served(3, { query: lessons[2].solution.replace('DEPOSIT RIGHT', 'DEPOSIT DOWN'), prep: '', floor: '' });
    const slip = run.execution![0].events.find((e) => e.error)!;
    expect(summarize(run, sampleReplay(run, slip.start - 0.1), levels[2], 3).stopped).toBeUndefined();
    expect(summarize(run, sampleReplay(run, slip.start), levels[2], 3).stopped).toBe(
      `Query stopped: ${slip.error!.replace(/\.$/, '')}.`,
    );
  });

  it('says what happened between two moments, and nothing of the steps between', () => {
    const run = served(14);
    const say = (from: number, to: number) => happenings(run, levels[13], 14, from, to);
    const guest = (id: string) => run.events.find((e) => e.seed_id === 'L14_A' && e.customer.customer_id === id)!;
    expect(say(-5, 0.5)).toBe('Mr. Albert walks in.');
    expect(say(0.5, 9)).toBe('');
    const first = guest('C1').timing;
    expect(say(first.served - 1, first.served)).toBe('Mr. Albert is served at table 1.');
    expect(say(first.left - 1, first.left)).toBe('Mr. Albert leaves.');
    const second = run.execution![1].start;
    expect(say(second - 1, second + 0.5)).toBe('Round 2 of 3 begins. Guest 1 walks in.');
    // A long stretch is cut short, but always says how much more happened.
    expect(say(-5, 60)).toBe('Mr. Albert walks in. Guest 2 walks in. Dot walks in. Juno walks in.');
    expect(say(-5, 80)).toBe('Mr. Albert walks in. Guest 2 walks in. Dot walks in. And 3 more.');
  });

  it('never leaves a robot stopping uncounted', () => {
    const programs = { query: lessons[2].solution.replace('DEPOSIT RIGHT', 'DEPOSIT DOWN'), prep: '', floor: '' };
    const run = served(3, programs);
    const words = happenings(run, levels[2], 3, -5, 1000);
    expect(words).toMatch(/ Query stopped: .+\.( And \d+ more\.)?$/);
  });
});
