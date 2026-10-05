import { belongsToPaper, ticketUnits } from './tickets';
import type { sampleReplay } from './replay';
import type { ActorId, ExecutionEvent, OrderTicket, ReplayEvent, RobotRole, RunResult } from './types';

/** A part of an order's way through the café, from the guest walking in to their cup going back to be washed. */
export type LegStage =
  'arrive' | 'order' | 'write' | 'claim' | 'make' | 'ready' | 'pickup' | 'serve' | 'leave' | 'clear' | 'slip';

export interface Leg {
  stage: LegStage;
  /** When it began and ended, on the service clock. */
  at: number;
  end: number;
  /** Who did it; nothing for what the guest does. */
  actor?: ActorId;
  role?: RobotRole;
  /** The block it began on, in the robot's routine. */
  line?: number;
  /** The ticket, or one cup of it, a leg belongs to; nothing for what is the whole order's. */
  unit?: string;
  /** What the cup or ticket is, like "tea", or "second tea" when the order has two; only when it has several. */
  cup?: string;
  /** For a serve: handed over to go rather than set down at a table. */
  toGo?: boolean;
  /** For a slip: what went wrong. */
  error?: string;
}

/** What a robot does to a cup while making it, from taking the cup to putting its lid on. */
const MAKING = new Set(['TAKE', 'GRIND', 'FILL WATER', 'BREW', 'STEEP', 'ADD SUGAR', 'LID']);

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

/** Things named by what they are, told apart by order when there are two of one: "tea", or "first tea". */
function named(items: readonly string[]): string[] {
  return items.map((item, i) => {
    const same = items.flatMap((other, j) => (other === item ? [j] : []));
    return same.length > 1 ? `${ORDINALS[same.indexOf(i)] ?? `#${same.indexOf(i) + 1}`} ${item}` : item;
  });
}

/** The guest's cups, each named by its drink, and told apart when the order has two of one. */
function cupsOf(tickets: readonly OrderTicket[]) {
  const units = tickets.flatMap(ticketUnits);
  const names = named(units.map((unit) => unit.item));
  return units.map((unit, i) => ({ id: unit.ticket_id, name: names[i] }));
}

/**
 * One guest's order on its way through the café, read off the run's records up to a time, in time order: walking in,
 * Query taking the order and writing each ticket, and for each cup Brew taking its ticket, making it and putting it
 * out, Porter picking it up and serving it, and once the guest has left, clearing the cup. Each cup keeps its own
 * identity, so an order of two drinks shows both on their separate ways. A slip on the order ends it there.
 */
export function orderRoute(result: RunResult, guest: ReplayEvent, until = Infinity): Leg[] {
  const round = result.execution?.find((r) => r.seed_id === guest.seed_id);
  if (!round) return [];
  const id = guest.customer.customer_id;
  const cups = cupsOf(guest.tickets);
  const cupOf = (unit: string) => cups.find((cup) => cup.id === unit)?.name;
  const several = cups.length > 1;
  const at = (seconds: number) => round.start + seconds;
  const legs: Leg[] = [];
  const by = (event: ExecutionEvent, stage: LegStage, end = event.end, unit?: string): Leg => ({
    stage,
    at: at(event.start),
    end: at(end),
    actor: event.actor,
    role: event.role,
    line: event.line,
    ...(unit && { unit, ...(several && { cup: cupOf(unit) }) }),
  });
  const { arrival, left } = guest.timing;
  if (Number.isFinite(arrival)) legs.push({ stage: 'arrive', at: at(arrival), end: at(arrival) });
  const events = round.events.filter((e) => e.customerId === id);
  const heard = events.find((e) => e.role === 'query' && e.command === 'LISTEN' && !e.waiting && !e.error);
  if (heard) legs.push(by(heard, 'order'));
  // Each ticket Query writes, from picking up the paper to handing it in.
  const papers = named(guest.tickets.map((paper) => paper.item));
  for (const [i, paper] of guest.tickets.entries()) {
    const writing = events.filter((e) => e.role === 'query' && e.heldPaper?.ticket_id === paper.ticket_id);
    if (!writing.length) continue;
    const after = events.find((e) => e.role === 'query' && e.start >= writing.at(-1)!.end);
    const handed = after?.command.startsWith('DEPOSIT') && !after.error ? after : undefined;
    legs.push({
      ...by(writing[0], 'write', (handed ?? writing.at(-1)!).end),
      unit: paper.ticket_id,
      ...(guest.tickets.length > 1 && { cup: papers[i] }),
    });
  }
  // Each cup on its own way, by the ticket or cup id every robot's record carries.
  for (const cup of cups) {
    const own = round.events.filter((e) => e.ticketId === cup.id && !e.error);
    const claim = own.find((e) => e.role === 'prep' && e.command === 'LISTEN' && !e.waiting);
    if (claim) legs.push(by(claim, 'claim', claim.end, cup.id));
    const making = own.filter((e) => e.role === 'prep' && MAKING.has(e.action ?? ''));
    if (making.length) legs.push(by(making[0], 'make', making.at(-1)!.end, cup.id));
    for (const [action, stage] of [
      ['DEPOSIT', 'ready'],
      ['PICKUP', 'pickup'],
      ['SERVE', 'serve'],
      ['HAND OVER', 'serve'],
    ] as const) {
      const done = own.find((e) => e.action === action);
      if (done) legs.push({ ...by(done, stage, done.end, cup.id), ...(action === 'HAND OVER' && { toGo: true }) });
    }
    const collected = own.find((e) => e.action === 'COLLECT');
    if (collected) {
      const returned = own.find((e) => e.action === 'RETURN CUPS' && e.start >= collected.start);
      legs.push(by(collected, 'clear', (returned ?? collected).end, cup.id));
    }
  }
  if (Number.isFinite(left)) legs.push({ stage: 'leave', at: at(left), end: at(left) });
  // A slip on this order, by anyone, is where its way ends.
  const slip = round.events.find(
    (e) =>
      e.error && (e.customerId === id || (e.ticketId && guest.tickets.some((p) => belongsToPaper(e.ticketId!, p)))),
  );
  if (slip) legs.push({ ...by(slip, 'slip'), error: slip.error });
  return legs.filter((leg) => leg.at <= until).sort((a, b) => a.at - b.at || legs.indexOf(a) - legs.indexOf(b));
}

/** Where a guest's order is at a sampled moment: who holds its ticket or a cup of it, and what counter it waits on. */
export interface Whereabouts {
  /** The robots holding the order's paper or one of its cups. */
  holders: ActorId[];
  /** A ticket of it waits on the order counter for Brew. */
  counter: boolean;
  /** A cup of it waits at pickup for Porter. */
  pickup: boolean;
}

export function orderWhereabouts(sampled: ReturnType<typeof sampleReplay>, guest: ReplayEvent): Whereabouts {
  const ours = (unit: string) => guest.tickets.some((paper) => belongsToPaper(unit, paper));
  const holders = (Object.entries(sampled.actors) as [ActorId, (typeof sampled.actors)[ActorId]][])
    .filter(
      ([, actor]) =>
        actor &&
        (actor.heldPaper?.customer_id === guest.customer.customer_id ||
          actor.inventory.some((cargo) => ours(cargo.ticketId))),
    )
    .map(([id]) => id);
  return {
    holders,
    counter: sampled.waitingTickets.some((ticket) => ticket.customer_id === guest.customer.customer_id),
    pickup: sampled.pickup.some(([unit]) => ours(unit)),
  };
}
