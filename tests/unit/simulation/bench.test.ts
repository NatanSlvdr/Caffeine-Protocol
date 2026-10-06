import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import {
  BENCH_GUESTS,
  benchGuests,
  benchKit,
  benchProblems,
  benchSays,
  benchSeed,
  benchTicket,
  freshGuest,
  isBenchSeed,
  type BenchGuest,
  type BenchKit,
} from '../../../src/domain';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { LevelDefinition } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { referenceProgramsFor } from '../../helpers/run';

const shifts = levels.map((level, i) => ({ level, n: i + 1 })).filter(({ level }) => level.programming_enabled);

/** Serve a bench with a shift's reference routines. */
function serve(n: number, guests: BenchGuest[], level: LevelDefinition = levels[n - 1]) {
  const programs = referenceProgramsFor(n - 1);
  const bench = { ...level, seeds: [benchSeed(benchKit(level), guests)] };
  return runLevel(bench, compileProgram(programs.query, n), n >= UNLOCKS.prep ? programs : undefined);
}

describe('a bench written from a shift’s own round', () => {
  it.each(shifts)('hears and expects every guest of Shift $n as the shift does', ({ level }) => {
    const kit = benchKit(level);
    for (const seed of level.seeds) {
      const guests = benchGuests(seed.customers);
      expect(benchProblems(kit, guests)).toEqual([]);
      const own = seed.customers.filter((customer) => !customer.expected.closing);
      const bench = benchSeed(kit, guests).customers;
      expect(bench.map((c) => c.arrival)).toEqual(own.map((c) => c.arrival));
      expect(bench.map((c) => c.heard_orders)).toEqual(own.map((c) => c.heard_orders));
      expect(bench.map((c) => c.clarification_heard_orders)).toEqual(own.map((c) => c.clarification_heard_orders));
      expect(bench.map((c) => c.expected)).toEqual(own.map((c) => c.expected));
    }
  });

  it.each(shifts)('is served by Shift $n’s reference routines', ({ n, level }) => {
    for (const seed of level.seeds) expect(serve(n, benchGuests(seed.customers)).passed).toBe(true);
  });
});

describe('a bench of guests the shift never sent', () => {
  /** One guest for every drink and every way of asking for sugar the shift has, a mark on every other one. */
  function everyKind(kit: BenchKit): BenchGuest[] {
    const guests = kit.drinks.flatMap((drink) => kit.sugars.map((sugar) => ({ drink, sugar })));
    return guests.slice(0, BENCH_GUESTS).map((order, i) => ({
      orders: [{ ...order, ...(kit.toGo && i % 2 && { toGo: true }), ...(kit.rush && i % 3 === 2 && { rush: true }) }],
      ...(kit.mumble && i === 1 && { mumbles: true }),
      after: i ? Math.max(kit.gap, 8) : 0,
    }));
  }

  it.each(shifts)('is served by Shift $n’s reference routines, every kind of order in it', ({ n, level }) => {
    const result = serve(n, everyKind(benchKit(level)));
    expect(result.first_failure?.reason).toBeUndefined();
  });

  it('turns away a routine the bench catches out, as the service would', () => {
    // Shift 3's routine writes coffee for every guest: Shift 4's reference serves a bench of teas, and it doesn't.
    const n = 4,
      kit = benchKit(levels[n - 1]);
    const teas = [freshGuest(kit, true), freshGuest(kit)].map((guest) => ({
      ...guest,
      orders: [{ drink: 'tea' as const, sugar: kit.sugars[0] }],
    }));
    expect(serve(n, teas).passed).toBe(true);
    const coffeeOnly = referenceProgramsFor(2);
    const bench = { ...levels[n - 1], seeds: [benchSeed(kit, teas)] };
    const result = runLevel(bench, compileProgram(coffeeOnly.query, n));
    expect(result.passed).toBe(false);
    expect(result.first_failure).toMatchObject({ seed_id: 'BENCH', customer_id: 'B1' });
  });
});

describe('what a bench takes', () => {
  const act1 = benchKit(levels[2]); // Shift 3: coffee, one at a time
  const finale = benchKit(levels[20]);

  it('offers only what the shift’s guests ask for', () => {
    expect(act1).toMatchObject({ drinks: ['coffee'], sugars: ['plain'], most: 1, mumble: false, toGo: false });
    expect(finale).toMatchObject({ drinks: ['coffee', 'tea'], sugars: [0, 1, 2], most: 2, mumble: true, toGo: true });
    expect(finale.rush).toBe(true);
    expect(benchKit(levels[6]).sugars).toEqual(['with', 'without', 0, 1, 2]);
  });

  it('comes in at the shift’s own pace', () => {
    expect(act1.gap).toBe(8);
    expect(benchKit(levels[8]).gap).toBe(10);
    expect(finale.gap).toBe(4);
  });

  it('names every guest asking for something the shift hasn’t taught', () => {
    const guest = (orders: BenchGuest['orders'], rest: Partial<BenchGuest> = {}): BenchGuest => ({
      orders,
      after: 8,
      ...rest,
    });
    const first = freshGuest(act1, true);
    expect(benchProblems(act1, [])).toEqual(['The bench has no guests yet.']);
    expect(benchProblems(act1, [first])).toEqual([]);
    expect(
      benchProblems(act1, [
        first,
        guest([{ drink: 'tea', sugar: 'plain' }]),
        guest([{ drink: 'coffee', sugar: 2 }]),
        guest([{ drink: 'coffee', sugar: 'plain', toGo: true, rush: true }]),
        guest([{ drink: 'coffee', sugar: 'plain' }], { mumbles: true }),
        guest([
          { drink: 'coffee', sugar: 'plain' },
          { drink: 'coffee', sugar: 'plain' },
        ]),
        guest([]),
      ]),
    ).toEqual([
      'Guest 2 asks for tea, not on this shift.',
      'Guest 3 asks for sugar a way nobody on this shift does.',
      'Guest 4 takes a drink to go, not on this shift.',
      'Guest 4 is in a rush, not on this shift.',
      'Guest 5 mumbles, and nobody mumbles on this shift.',
      'Guest 6 asks for 2 drinks; guests on this shift ask for 1 at most.',
      'Guest 7 doesn’t ask for anything.',
    ]);
  });

  it('keeps arrivals in order, and to the bench’s size', () => {
    const first = freshGuest(act1, true);
    expect(benchProblems(act1, [{ ...first, after: 4 }])).toEqual(['Guest 1 comes in as the café opens.']);
    expect(
      benchProblems(act1, [first, { ...first, after: 0 }, { ...first, after: 61 }, { ...first, after: 2.5 }]),
    ).toEqual([2, 3, 4].map((n) => `Guest ${n} has to come in between 1 and 60 s after the guest before.`));
    expect(
      benchProblems(
        act1,
        Array.from({ length: BENCH_GUESTS + 1 }, (_, i) => freshGuest(act1, !i)),
      ),
    ).toEqual([`The bench takes ${BENCH_GUESTS} guests at most.`]);
    const mumbling = { ...first, mumbles: true, orders: [...first.orders, ...first.orders] };
    expect(
      benchProblems(finale, [
        {
          ...mumbling,
          orders: [
            { drink: 'tea', sugar: 1 },
            { drink: 'tea', sugar: 1 },
          ],
        },
      ]),
    ).toEqual(['Guest 1 mumbles, so asks for one drink.']);
  });

  it('never runs a bench with a problem', () => {
    expect(() => benchSeed(act1, [])).toThrow('The bench has no guests yet.');
  });
});

describe('a bench guest', () => {
  const finale = benchKit(levels[20]);

  it('says their order the way the shift’s guests do', () => {
    expect(benchSays([{ drink: 'coffee', sugar: 'plain' }])).toBe('Coffee');
    expect(benchSays([{ drink: 'tea', sugar: 'without' }])).toBe('Tea without sugar');
    expect(benchSays([{ drink: 'coffee', sugar: 1, toGo: true }])).toBe('Coffee, 1 sugar, to go');
    expect(benchSays([{ drink: 'tea', sugar: 2, rush: true }])).toBe('A quick tea, 2 sugars. I’m in a rush!');
    expect(
      benchSays([
        { drink: 'coffee', sugar: 0 },
        { drink: 'tea', sugar: 2 },
      ]),
    ).toBe('Coffee, 0 sugars and tea, 2 sugars');
  });

  it('expects what a guest of the shift asking the same way gets', () => {
    expect(benchTicket(benchKit(levels[3]), { drink: 'tea', sugar: 'plain' })).toEqual({ item: 'tea' });
    expect(benchTicket(benchKit(levels[5]), { drink: 'tea', sugar: 'plain' })).toEqual({
      item: 'tea',
      with_sugar: false,
    });
    expect(benchTicket(benchKit(levels[6]), { drink: 'tea', sugar: 'without' })).toEqual({
      item: 'tea',
      with_sugar: false,
    });
    expect(benchTicket(finale, { drink: 'coffee', sugar: 2, toGo: true, rush: true })).toEqual({
      item: 'coffee',
      sugar_count: 2,
      to_go: true,
      rush: true,
    });
  });

  it('who mumbles is asked again, and has to be helped', () => {
    const [guest] = benchSeed(finale, [{ orders: [{ drink: 'tea', sugar: 1 }], mumbles: true, after: 0 }]).customers;
    expect(guest).toMatchObject({
      phrase: 'The usual, please.',
      heard_orders: [{ tokens: ['ambiguous'] }],
      clarification: 'Tea, 1 sugar',
      clarification_heard_orders: [{ tokens: ['tea', 'sugar', 'number'], number: 1 }],
      expected: { item: 'tea', sugar_count: 1, ask_help: true },
    });
  });

  it('comes in the seconds after the guest before that the bench says', () => {
    const kit = benchKit(levels[2]);
    const guests = [freshGuest(kit, true), { ...freshGuest(kit), after: 3 }, { ...freshGuest(kit), after: 20 }];
    expect(benchSeed(kit, guests).customers.map((c) => [c.customer_id, c.arrival])).toEqual([
      ['B1', 0],
      ['B2', 3],
      ['B3', 23],
    ]);
  });

  it('belongs to a round the café can tell from the shift’s own', () => {
    expect(isBenchSeed('BENCH_2')).toBe(true);
    expect(levels.flatMap((level) => level.seeds).some((seed) => isBenchSeed(seed.id))).toBe(false);
  });
});
