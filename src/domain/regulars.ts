import type { Customer, ReplayEvent, RunResult } from './types';

/** The café's four regulars, each known by what they order. */
export type Regular = 'albert' | 'juno' | 'dot' | 'rosa';

/** What the café calls each regular, over their lines and wherever the service is told in words. */
export const REGULAR_NAMES: Readonly<Record<Regular, string>> = {
  albert: 'Mr. Albert',
  juno: 'Juno',
  dot: 'Dot',
  rosa: 'Rosa',
};

type Order = Customer['expected'];
const single = (order: Order) => !order.tickets?.length;
/** One cup, and time to drink it: only Rosa is ever in a rush. */
const unhurried = (order: Order) => single(order) && !order.rush;
const unsweetened = (order: Order) => !order.with_sugar && !order.sugar_count;

/**
 * What each regular orders, in the order a guest is matched against them. The order the guest speaks is the puzzle
 * and stays authoritative; a guest is only taken for a regular when what they ask for is that regular's habit, so a
 * regular is never seen ordering against it.
 */
const HABITS: readonly [Regular, (order: Order) => boolean][] = [
  /** Rosa orders for her table, her brother's cup included; on her own, it's a tea in a rush before a meeting. */
  ['rosa', (order) => (order.tickets?.length ?? 0) >= 2 || (single(order) && order.item === 'tea' && !!order.rush)],
  /** Dot takes sugar, and counts it: exactly two, once the café counts. */
  [
    'dot',
    (order) => unhurried(order) && (order.sugar_count === 2 || (!!order.with_sugar && order.sugar_count === undefined)),
  ],
  /** Juno: tea, never sugar, at the window table with her laptop. */
  ['juno', (order) => unhurried(order) && order.item === 'tea' && unsweetened(order) && !order.to_go],
  /** Mr. Albert: “the usual”, a plain coffee, with his newspaper; to go, on a day with no table free. */
  ['albert', (order) => unhurried(order) && order.item === 'coffee' && unsweetened(order)],
];

/**
 * Which guests of a round are regulars, by customer id. Guests are taken in the order they arrive, each regular at
 * most once a round, and only for an order that is their habit. A guest who needs help or calls closing time is
 * nobody's regular.
 */
export function regularsOf(customers: readonly Customer[]): ReadonlyMap<string, Regular> {
  const known = lineRegulars.get(customers);
  if (known) return known;
  const found = new Map<string, Regular>();
  const taken = new Set<Regular>();
  for (const customer of [...customers].sort((a, b) => a.arrival - b.arrival)) {
    const order = customer.expected;
    if (order.ask_help || order.closing) continue;
    const match = HABITS.find(([regular, habit]) => !taken.has(regular) && habit(order));
    if (!match) continue;
    found.set(customer.customer_id, match[0]);
    taken.add(match[0]);
  }
  lineRegulars.set(customers, found);
  return found;
}

const lineRegulars = new WeakMap<readonly Customer[], ReadonlyMap<string, Regular>>();

const runRegulars = new WeakMap<RunResult, Map<string, ReadonlyMap<string, Regular>>>();

/** The regulars of one round of a run, worked out once per run and round. */
export function roundRegulars(result: RunResult, seedId: string): ReadonlyMap<string, Regular> {
  let rounds = runRegulars.get(result);
  if (!rounds) runRegulars.set(result, (rounds = new Map()));
  let regulars = rounds.get(seedId);
  if (!regulars) {
    regulars = regularsOf(result.events.filter((e) => e.seed_id === seedId).map((e) => e.customer));
    rounds.set(seedId, regulars);
  }
  return regulars;
}

/** The regular a guest of a run is, if they are one. */
export function guestRegular(result: RunResult, guest: ReplayEvent): Regular | undefined {
  return roundRegulars(result, guest.seed_id).get(guest.customer.customer_id);
}
