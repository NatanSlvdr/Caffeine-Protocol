import { UNLOCKS, regularsOf, type Customer, type LevelDefinition, type Regular } from '@/domain';

type Order = Customer['expected'];

/**
 * What the counter says back to a regular, under what they ordered. It recognises them and their habit, and gets more
 * familiar as the shifts go, but only ever repeats the order they spoke: the puzzle is still what was said.
 */
const LINES: Record<Regular, (order: Order, shift: number) => string> = {
  albert: (_, shift) =>
    shift < UNLOCKS.help
      ? '*bip* Mister Albert. Coffee.'
      : shift < UNLOCKS.floor
        ? '*bip* Mister Albert. The usual.'
        : '*bip* Mister Albert. The usual. Newspaper detected.',
  juno: (_, shift) =>
    shift < UNLOCKS.prepTea
      ? '*bip* Juno. Tea. No sugar. Noted.'
      : shift < UNLOCKS.floor
        ? '*bip* Juno. Tea, never sugar.'
        : '*bip* Juno. Tea, never sugar. Never ever.',
  dot: (order) => (order.sugar_count === 2 ? '*bip* Dot. Two sugars. Counting: one. Two.' : '*bip* Dot. Sugar: yes.'),
  rosa: (order, shift) =>
    !order.tickets?.length
      ? '*bip* Rosa. Tea. In a hurry.'
      : shift < UNLOCKS.rush
        ? '*bip* Rosa. One order. A ticket per cup.'
        : '*bip* Rosa. Whole table again. A ticket per cup.',
};

/** Before Query takes orders, Niko is at the counter, and only Mr. Albert, who knew Lou, comes in. */
const NIKO_LINES: Partial<Record<Regular, string>> = { albert: 'Morning, Mr. Albert. Coffee, the way Lou made it?' };

/** The line said back to a regular at the counter, with who says it: "Query: *bip* Juno. Tea, never sugar." */
export function counterLine(regular: Regular, order: Order, shift: number): string | undefined {
  if (shift >= UNLOCKS.query) return `Query: ${LINES[regular](order, shift)}`;
  const niko = NIKO_LINES[regular];
  return niko && `Niko: ${niko}`;
}

/** Every counter line of a shift, by round and guest: `"L06_B/C1"`. */
export function counterLines(level: LevelDefinition, shift: number): ReadonlyMap<string, string> {
  const lines = new Map<string, string>();
  for (const seed of level.seeds)
    for (const [id, regular] of regularsOf(seed.customers)) {
      const customer = seed.customers.find((c) => c.customer_id === id)!;
      const line = counterLine(regular, customer.expected, shift);
      if (line) lines.set(`${seed.id}/${id}`, line);
    }
  return lines;
}
