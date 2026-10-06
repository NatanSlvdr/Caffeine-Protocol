import type {
  Customer,
  Drink,
  ExpectedTicket,
  HeardOrder,
  LevelDefinition,
  SpeechIntent,
  ValidationSeed,
} from './types';

/**
 * The test bench: guests the player writes for a shift, to run their routines on away from the service. The player
 * only says what each guest asks for and when they come in; what each one should get is worked out here, the way the
 * shift's own guests are, so a bench guest can never be told to want the wrong thing. A bench run never counts toward
 * stars.
 */

/** How a guest asks about sugar: not at all, yes or no, or a number of cubes. */
export type BenchSugar = 'plain' | 'with' | 'without' | number;

/** One drink a bench guest asks for. */
export interface BenchOrder {
  drink: Drink;
  sugar: BenchSugar;
  toGo?: boolean;
  rush?: boolean;
}

/** A bench guest: what they ask for, whether they mumble it first, and how long after the guest before they come in. */
export interface BenchGuest {
  orders: BenchOrder[];
  mumbles?: boolean;
  /** A table that orders together: its drinks come on one visit. Only a guest asking for two or more can. */
  together?: boolean;
  /** Seconds after the guest before; the first guest comes in as the café opens, so theirs is 0. */
  after: number;
}

/** What a shift's own guests ask for, and so what its bench offers: nothing the shift hasn't taught. */
export interface BenchKit {
  drinks: Drink[];
  sugars: BenchSugar[];
  /** The most drinks one guest orders. */
  most: number;
  mumble: boolean;
  toGo: boolean;
  rush: boolean;
  /** Whether a table orders together. */
  together: boolean;
  /** How far apart the shift's guests come in, at the closest. */
  gap: number;
  /** What a ticket says about each way of asking for sugar, copied from a guest of the shift who asked that way. */
  tickets: Partial<Record<string, ExpectedTicket>>;
}

/** The most guests a bench takes: the busiest round of the campaign, and a few more. */
export const BENCH_GUESTS = 16;
/** The arrival gaps the bench offers, in seconds, besides the shift's own. */
export const BENCH_GAPS = [1, 2, 4, 8, 12, 20, 30];
/** The longest a bench guest comes in after the one before, in seconds. */
const BENCH_LATEST = 60;

const SUGAR_ORDER = (sugar: BenchSugar) =>
  typeof sugar === 'number' ? 3 + sugar : ['plain', 'with', 'without'].indexOf(sugar);
const sugarKey = (sugar: BenchSugar) => String(sugar);

/** How one heard order asks about sugar. */
function sugarOf(order: HeardOrder): BenchSugar {
  if (order.tokens.includes('number')) return order.number ?? 0;
  if (order.tokens.includes('negation')) return 'without';
  return order.tokens.includes('sugar') ? 'with' : 'plain';
}

/** A customer's orders as heard, each with the ticket it should come out as. */
function ordersOf(customer: Customer): { heard: HeardOrder; ticket: ExpectedTicket }[] {
  const heard = customer.clarification_heard_orders ?? customer.heard_orders;
  if (heard.some((order) => order.tokens.includes('closed'))) return [];
  const { tickets, ...single } = customer.expected;
  delete single.ask_help;
  delete single.closing;
  return heard.map((order, i) => ({ heard: order, ticket: tickets?.[i] ?? single }));
}

/** Read what a shift's guests ask for, so the bench offers the same. */
export function benchKit(level: LevelDefinition): BenchKit {
  const customers = level.seeds.flatMap((seed) => seed.customers);
  const orders = customers.flatMap(ordersOf);
  const tickets: BenchKit['tickets'] = {};
  for (const { heard, ticket } of orders) {
    const key = sugarKey(sugarOf(heard));
    tickets[key] ??= { with_sugar: ticket.with_sugar, sugar_count: ticket.sugar_count };
  }
  const gaps = level.seeds.flatMap((seed) =>
    seed.customers.slice(1).map((customer, i) => customer.arrival - seed.customers[i].arrival),
  );
  const drinks = (['coffee', 'tea'] as const).filter((drink) =>
    orders.some(({ heard }) => heard.tokens.includes(drink)),
  );
  return {
    drinks,
    sugars: [...new Set(orders.map(({ heard }) => sugarOf(heard)))].sort((a, b) => SUGAR_ORDER(a) - SUGAR_ORDER(b)),
    most: Math.max(1, ...customers.map((customer) => ordersOf(customer).length)),
    mumble: customers.some((customer) => customer.expected.ask_help),
    toGo: orders.some(({ heard }) => heard.tokens.includes('togo')),
    rush: orders.some(({ heard }) => heard.tokens.includes('rush')),
    together: orders.some(({ heard }) => heard.tokens.includes('together')),
    gap: gaps.length ? Math.max(1, Math.min(...gaps)) : 8,
    tickets,
  };
}

/** A round of the shift as bench guests, to start a bench from: the closing call is left out, as the café adds it. */
export function benchGuests(customers: readonly Customer[]): BenchGuest[] {
  const guests = customers.filter((customer) => !customer.expected.closing);
  return guests.map((customer, i) => ({
    orders: ordersOf(customer).map(({ heard }) => ({
      drink: heard.tokens.includes('tea') ? 'tea' : 'coffee',
      sugar: sugarOf(heard),
      ...(heard.tokens.includes('togo') && { toGo: true }),
      ...(heard.tokens.includes('rush') && { rush: true }),
    })),
    ...(customer.expected.ask_help && { mumbles: true }),
    ...(ordersOf(customer).some(({ heard }) => heard.tokens.includes('together')) && { together: true }),
    after: i === 0 ? customer.arrival : customer.arrival - guests[i - 1].arrival,
  }));
}

/** A guest the bench starts a new one as: the shift's first drink, asked for its first way. */
export const freshGuest = (kit: BenchKit, first = false): BenchGuest => ({
  orders: [{ drink: kit.drinks[0], sugar: kit.sugars[0] }],
  after: first ? 0 : kit.gap,
});

/**
 * Everything wrong with a bench, in the café's words, each naming its guest: an empty bench, a guest asking for
 * something the shift hasn't taught, or a bench changed by hand. A bench with any of these is never run.
 */
export function benchProblems(kit: BenchKit, guests: readonly BenchGuest[]): string[] {
  const problems: string[] = [];
  if (!guests.length) problems.push('The bench has no guests yet.');
  if (guests.length > BENCH_GUESTS) problems.push(`The bench takes ${BENCH_GUESTS} guests at most.`);
  guests.forEach((guest, i) => {
    const who = `Guest ${i + 1}`;
    if (i === 0 && guest.after !== 0) problems.push(`${who} comes in as the café opens.`);
    if (i > 0 && !(Number.isInteger(guest.after) && guest.after >= 1 && guest.after <= BENCH_LATEST))
      problems.push(`${who} has to come in between 1 and ${BENCH_LATEST} s after the guest before.`);
    if (!guest.orders.length) problems.push(`${who} doesn’t ask for anything.`);
    if (guest.orders.length > kit.most)
      problems.push(`${who} asks for ${guest.orders.length} drinks; guests on this shift ask for ${kit.most} at most.`);
    if (guest.mumbles && !kit.mumble) problems.push(`${who} mumbles, and nobody mumbles on this shift.`);
    if (guest.mumbles && guest.orders.length > 1) problems.push(`${who} mumbles, so asks for one drink.`);
    for (const order of guest.orders) {
      if (!kit.drinks.includes(order.drink)) problems.push(`${who} asks for ${order.drink}, not on this shift.`);
      if (!kit.sugars.includes(order.sugar)) problems.push(`${who} asks for sugar a way nobody on this shift does.`);
      if (order.toGo && !kit.toGo) problems.push(`${who} takes a drink to go, not on this shift.`);
      if (order.rush && !kit.rush) problems.push(`${who} is in a rush, not on this shift.`);
    }
    if (guest.together && !kit.together) problems.push(`${who} orders together, and nobody does on this shift.`);
  });
  return problems;
}

/** One order in words, the way the shift's own guests say theirs. */
function benchPhrase(order: BenchOrder): string {
  const { drink, sugar } = order;
  const sweet =
    typeof sugar === 'number'
      ? `, ${sugar} sugar${sugar === 1 ? '' : 's'}`
      : sugar === 'plain'
        ? ''
        : ` ${sugar} sugar`;
  return `${order.rush ? 'a quick ' : ''}${drink}${sweet}${order.toGo ? ', to go' : ''}`;
}

/** A guest's whole order in words, as they say it at the register, or once asked again after mumbling. */
export function benchSays(orders: readonly BenchOrder[], together = false): string {
  const said = orders.map(benchPhrase).join(' and ') + (together ? ', together please' : '');
  // One guest in a rush says so; in a group, “a quick” says which of the drinks is.
  const hurry = orders.length === 1 && orders[0].rush ? '. I’m in a rush!' : '';
  return said[0].toUpperCase() + said.slice(1) + hurry;
}

/** What one order should come out as, the way the shift's guests who asked like that get it. */
export function benchTicket(kit: BenchKit, order: BenchOrder, together = false): ExpectedTicket {
  const sugar = kit.tickets[sugarKey(order.sugar)] ?? {};
  return {
    item: order.drink,
    ...(sugar.with_sugar !== undefined && { with_sugar: sugar.with_sugar }),
    ...(sugar.sugar_count !== undefined && { sugar_count: order.sugar as number }),
    ...(order.toGo && { to_go: true }),
    ...(order.rush && { rush: true }),
    ...(together && { together: true }),
  };
}

function heardOf(order: BenchOrder, together = false): HeardOrder {
  const { sugar } = order;
  return {
    tokens: [
      order.drink,
      ...(sugar === 'plain' ? [] : ['sugar']),
      ...(sugar === 'without' ? ['negation'] : []),
      ...(typeof sugar === 'number' ? ['number'] : []),
      ...(order.toGo ? ['togo'] : []),
      ...(order.rush ? ['rush'] : []),
      ...(together ? ['together'] : []),
    ],
    ...(typeof sugar === 'number' && { number: sugar }),
  };
}

const intentOf = (ticket: ExpectedTicket): SpeechIntent => ({
  confidence: 'clear',
  drink: ticket.item,
  ...(ticket.with_sugar !== undefined && { with_sugar: ticket.with_sugar }),
  ...(ticket.sugar_count !== undefined && { sugar_count: ticket.sugar_count }),
  ...(ticket.to_go && { to_go: true }),
  ...(ticket.rush && { rush: true }),
  ...(ticket.together && { together: true }),
});

/** The bench as a round of the shift: its guests as the café hears them, each with what they should get. */
export function benchSeed(kit: BenchKit, guests: readonly BenchGuest[]): ValidationSeed {
  const problems = benchProblems(kit, guests);
  if (problems.length) throw new Error(problems[0]);
  let arrival = 0;
  const customers = guests.map((guest, i): Customer => {
    arrival += guest.after;
    const together = !!guest.together && guest.orders.length > 1;
    const tickets = guest.orders.map((order) => benchTicket(kit, order, together));
    const heard = guest.orders.map((order) => heardOf(order, together));
    const said = benchSays(guest.orders, together);
    const base = { customer_id: `B${i + 1}`, arrival };
    if (guest.mumbles)
      return {
        ...base,
        phrase: 'The usual, please.',
        heard_orders: [{ tokens: ['ambiguous'] }],
        intent: { confidence: 'ambiguous' },
        clarification: said,
        clarification_heard_orders: heard,
        clarification_intent: intentOf(tickets[0]),
        expected: { ...tickets[0], ask_help: true },
      };
    return {
      ...base,
      phrase: said,
      heard_orders: heard,
      intent: tickets.length > 1 ? { orders: tickets.map(intentOf) } : intentOf(tickets[0]),
      expected: tickets.length > 1 ? { tickets } : tickets[0],
    };
  });
  return { id: 'BENCH', customers };
}

/**
 * A rule of the shift a bench can ease, for practice: twice the cups, carrying one at a time where the shift asks for
 * a full load, or no closing time. Eased, a bench can check one part of a routine while another still falls short;
 * what goes right there says less about the shift, which keeps its own rules.
 */
export type BenchEase = 'cups' | 'load' | 'closing';

/** The rules of a shift its bench can ease, in the order they're offered. */
export function benchEases(level: LevelDefinition): BenchEase[] {
  const service = level.service;
  return [
    ...(service?.cups ? (['cups'] as const) : []),
    ...(service?.minLoad ? (['load'] as const) : []),
    ...(service?.closing && level.programming_enabled ? (['closing'] as const) : []),
  ];
}

/** Only the eases the shift has, once each, in the order they're offered: a bench kept from before may ask for more. */
export const keptEases = (level: LevelDefinition, eased: readonly unknown[]): BenchEase[] =>
  benchEases(level).filter((ease) => eased.includes(ease));

/** The shift as a bench plays it with its rules eased; the shift itself when none are. */
export function easedShift(level: LevelDefinition, eased: readonly BenchEase[] = []): LevelDefinition {
  if (!level.service || !eased.length) return level;
  const service = { ...level.service };
  if (eased.includes('cups') && service.cups) service.cups *= 2;
  if (eased.includes('load')) service.minLoad = 0;
  if (eased.includes('closing')) service.closing = false;
  return { ...level, service };
}

/** Whether a round is a bench the player wrote, rather than one of the shift's own. */
export const isBenchSeed = (id: string) => id.startsWith('BENCH');
