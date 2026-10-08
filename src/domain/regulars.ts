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

const books = (customer: Customer) => customer.heard_orders.some((order) => order.tokens.includes('later'));
/** An order as heard, without its For later: what the guest asks for again once they're back. */
const heardKey = (customer: Customer) =>
  JSON.stringify(
    customer.heard_orders.map((order) => [order.tokens.filter((token) => token !== 'later'), order.number ?? null]),
  );

/**
 * Who comes back for a drink they booked for later, by customer id: the guest who booked it. A guest who books is back
 * as the next guest after them to ask for that very drink, and is the same person, so they look alike.
 */
export function bookingsOf(customers: readonly Customer[]): ReadonlyMap<string, string> {
  const known = lineBookings.get(customers);
  if (known) return known;
  const found = new Map<string, string>();
  const line = [...customers].sort((a, b) => a.arrival - b.arrival);
  line.forEach((booker, i) => {
    if (!books(booker)) return;
    const back = line
      .slice(i + 1)
      .find((guest) => !books(guest) && !found.has(guest.customer_id) && heardKey(guest) === heardKey(booker));
    if (back) found.set(back.customer_id, booker.customer_id);
  });
  lineBookings.set(customers, found);
  return found;
}

/**
 * Which guests of a round are regulars, by customer id. Guests are taken in the order they arrive, each regular at
 * most once a round, and only for an order that is their habit. A guest who needs help or calls closing time is
 * nobody's regular. A guest who books a drink for later is taken by the drink they come back for, and is the same
 * regular when they do.
 */
export function regularsOf(customers: readonly Customer[]): ReadonlyMap<string, Regular> {
  const known = lineRegulars.get(customers);
  if (known) return known;
  const found = new Map<string, Regular>();
  const taken = new Set<Regular>();
  const returns = new Map([...bookingsOf(customers)].map(([back, booker]) => [booker, back]));
  const byId = new Map(customers.map((customer) => [customer.customer_id, customer]));
  const settled = new Set<string>();
  for (const customer of [...customers].sort((a, b) => a.arrival - b.arrival)) {
    if (settled.has(customer.customer_id)) continue;
    const back = returns.get(customer.customer_id);
    // Their return visit is settled with them: the same regular, or nobody's.
    if (back) settled.add(back);
    const order = back ? byId.get(back)!.expected : customer.expected;
    if (order.ask_help || order.closing || (books(customer) && !back)) continue;
    const match = HABITS.find(([regular, habit]) => !taken.has(regular) && habit(order));
    if (!match) continue;
    found.set(customer.customer_id, match[0]);
    if (back) found.set(back, match[0]);
    taken.add(match[0]);
  }
  lineRegulars.set(customers, found);
  return found;
}

const lineRegulars = new WeakMap<readonly Customer[], ReadonlyMap<string, Regular>>();
const lineBookings = new WeakMap<readonly Customer[], ReadonlyMap<string, string>>();

/** The guests of one round of a run, the same array each time it's asked, so what's worked out from it is kept. */
function roundGuests(result: RunResult, seedId: string): readonly Customer[] {
  let rounds = runGuests.get(result);
  if (!rounds) runGuests.set(result, (rounds = new Map()));
  let guests = rounds.get(seedId);
  if (!guests) {
    guests = result.events.filter((e) => e.seed_id === seedId).map((e) => e.customer);
    rounds.set(seedId, guests);
  }
  return guests;
}

const runGuests = new WeakMap<RunResult, Map<string, readonly Customer[]>>();

/** The regulars of one round of a run, worked out once per run and round. */
export const roundRegulars = (result: RunResult, seedId: string): ReadonlyMap<string, Regular> =>
  regularsOf(roundGuests(result, seedId));

/** Who comes back for a drink booked for later in one round of a run, by the guest who booked it. */
export const roundBookings = (result: RunResult, seedId: string): ReadonlyMap<string, string> =>
  bookingsOf(roundGuests(result, seedId));

/** The regular a guest of a run is, if they are one. */
export function guestRegular(result: RunResult, guest: ReplayEvent): Regular | undefined {
  return roundRegulars(result, guest.seed_id).get(guest.customer.customer_id);
}
