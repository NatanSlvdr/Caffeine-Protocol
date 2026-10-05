import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { cast } from '../../../src/data/campaign/cast';
import { guestbook } from '../../../src/data/campaign/guestbook';
import { counterLine, counterLines } from '../../../src/features/workspace/counterLines';
import {
  UNLOCKS,
  compileProgram,
  guestRegular,
  regularsOf,
  roundRegulars,
  runLevel,
  type Customer,
  type Regular,
} from '../../../src/domain';
import { guestCalled } from '../../../src/features/workspace/route';

const guest = (id: string, arrival: number, expected: Customer['expected']): Customer => ({
  customer_id: id,
  arrival,
  phrase: '',
  heard_orders: [],
  intent: {},
  expected,
});

/** Every round of the campaign, with the shift it belongs to. */
const rounds = levels.flatMap((level, i) => level.seeds.map((seed) => ({ shift: i + 1, seed })));
const sweet = (order: Customer['expected']) => !!order.with_sugar || !!order.sugar_count;

describe('the regulars', () => {
  it('knows a regular by their habit, once a round, in the order guests come in', () => {
    const line = [
      guest('C3', 3, { item: 'coffee' }),
      guest('C1', 1, { item: 'coffee', with_sugar: true }),
      guest('C2', 2, { item: 'coffee' }),
      guest('C4', 4, { item: 'tea', with_sugar: false }),
      guest('C5', 5, { item: 'tea', to_go: true }),
      guest('C6', 6, { item: 'coffee', ask_help: true }),
    ];
    expect(Object.fromEntries(regularsOf(line))).toEqual({ C1: 'dot', C2: 'albert', C4: 'juno' });
    expect(regularsOf(line)).toBe(regularsOf(line));
    const table = guest('C1', 0, {
      tickets: [
        { item: 'coffee', with_sugar: false },
        { item: 'tea', with_sugar: false },
      ],
    });
    expect(regularsOf([table]).get('C1')).toBe('rosa');
    expect(regularsOf([guest('C1', 0, { item: 'tea', sugar_count: 1, rush: true })]).get('C1')).toBe('rosa');
    expect(regularsOf([guest('C1', 0, { item: 'coffee', rush: true })]).size).toBe(0);
  });

  it('never has a regular order against their habit, anywhere in the campaign', () => {
    for (const { seed } of rounds) {
      const found = regularsOf(seed.customers);
      expect(new Set(found.values()).size, seed.id).toBe(found.size);
      for (const customer of seed.customers) {
        const order = customer.expected;
        const regular = found.get(customer.customer_id);
        if (!regular) continue;
        expect(order.ask_help || order.closing, seed.id).toBeFalsy();
        if (regular === 'albert') expect([order.item, sweet(order), !!order.rush]).toEqual(['coffee', false, false]);
        if (regular === 'juno')
          expect([order.item, sweet(order), !!order.to_go, !!order.rush]).toEqual(['tea', false, false, false]);
        if (regular === 'dot') expect(sweet(order) && !order.tickets?.length && !order.rush).toBe(true);
        if (regular === 'rosa')
          expect((order.tickets?.length ?? 0) >= 2 || (order.item === 'tea' && order.rush), seed.id).toBe(true);
      }
    }
  });

  it('brings every regular in, and Mr. Albert first of all', () => {
    const seen = new Set(rounds.flatMap(({ seed }) => [...regularsOf(seed.customers).values()]));
    expect([...seen].sort()).toEqual(['albert', 'dot', 'juno', 'rosa']);
    expect([...regularsOf(levels[0].seeds[0].customers).values()]).toEqual(['albert']);
  });

  it('has each regular in the shift they write about in the guestbook, ordering what they wrote', () => {
    for (const note of guestbook) {
      const shift = rounds.filter((r) => r.shift === note.shift);
      const orders = shift.flatMap(({ seed }) =>
        seed.customers.filter((c) => regularsOf(seed.customers).get(c.customer_id) === note.who).map((c) => c.expected),
      );
      expect(orders.length, `${note.who} on shift ${note.shift}`).toBeGreaterThan(0);
    }
    const rosa = (shift: number) =>
      rounds
        .filter((r) => r.shift === shift)
        .flatMap(({ seed }) =>
          seed.customers.filter((c) => regularsOf(seed.customers).get(c.customer_id) === 'rosa').map((c) => c.expected),
        );
    // "Two coffees, two tickets", and "tea in hand" before her meeting.
    expect(rosa(6).some((order) => order.tickets?.every((t) => t.item === 'coffee'))).toBe(true);
    expect(rosa(19).every((order) => order.item === 'tea' && order.rush)).toBe(true);
  });

  it('greets a regular at the counter, Niko on the first morning and Query after, as familiar as the shift', () => {
    const coffee = { item: 'coffee' } as const;
    expect(counterLine('albert', coffee, 1)).toMatch(/^Niko: Morning, Mr\. Albert\./);
    expect(counterLine('juno', { item: 'tea' }, 1)).toBeUndefined();
    expect(counterLine('albert', coffee, UNLOCKS.query)).toBe('Query: *bip* Mister Albert. Coffee.');
    expect(counterLine('albert', coffee, UNLOCKS.help)).toBe('Query: *bip* Mister Albert. The usual.');
    expect(counterLine('dot', { item: 'coffee', with_sugar: true }, UNLOCKS.sugar)).toBe(
      'Query: *bip* Dot. Sugar: yes.',
    );
    expect(counterLine('dot', { item: 'tea', sugar_count: 2 }, UNLOCKS.numbers)).toMatch(/Two sugars/);
    const table = { tickets: [coffee, coffee] };
    expect(counterLine('rosa', table, UNLOCKS.forEach)).not.toMatch(/again/);
    expect(counterLine('rosa', table, UNLOCKS.closing + 1)).toMatch(/again/);
  });

  it('only ever says back what the regular asked for', () => {
    for (const { shift, seed } of rounds) {
      const lines = counterLines(levels[shift - 1], shift);
      for (const [id, regular] of regularsOf(seed.customers)) {
        const order = seed.customers.find((c) => c.customer_id === id)!.expected;
        const line = lines.get(`${seed.id}/${id}`);
        if (shift < UNLOCKS.query) continue;
        expect(line, `${seed.id}/${id}`).toMatch(/^Query: \*bip\* /);
        if (/\bTea\b/.test(line!)) expect(order.item).toBe('tea');
        if (/\bCoffee\b/.test(line!)) expect(order.item).toBe('coffee');
        if (/Two sugars/.test(line!)) expect(order.sugar_count).toBe(2);
        if (/no sugar|never sugar/i.test(line!)) expect(sweet(order)).toBe(false);
        expect(regular).toBeDefined();
      }
    }
  });

  it('agrees on who is who in the café and in the words beside it', () => {
    const shift = UNLOCKS.floor;
    const level = levels[shift - 1];
    const programs = referencePrograms(shift);
    const result = runLevel(level, compileProgram(programs.query, shift), programs);
    for (const seed of level.seeds) expect(roundRegulars(result, seed.id)).toEqual(regularsOf(seed.customers));
    for (const event of result.events) {
      const regular: Regular | undefined = guestRegular(result, event);
      const name = guestCalled(level, event.seed_id, event.customer.customer_id);
      expect(name).toEqual(regular ? cast[regular].name : expect.stringMatching(/^Guest \d+$/));
    }
  });
});
