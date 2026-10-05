import {
  ROBOT_DISPLAY_NAMES,
  robotActorName,
  type Leg,
  type LevelDefinition,
  type ReplayEvent,
  type RunResult,
} from '@/domain';

/** Who did a leg of an order, as the café names them: a stand-in by its own name. */
function actorName(leg: Leg, level: number): string {
  if (leg.actor === 'niko') return 'Niko';
  if (leg.role === 'prep' || leg.role === 'floor') return robotActorName(leg.role, level);
  return ROBOT_DISPLAY_NAMES.query;
}

/** A leg of an order's way, in a few words: "Brew makes the tea", "Porter serves it at table 2". */
export function legWords(leg: Leg, guest: ReplayEvent, level: number): string {
  const who = actorName(leg, level);
  const it = leg.cup ? `the ${leg.cup}` : 'it';
  switch (leg.stage) {
    case 'arrive':
      return 'Walks in';
    case 'order':
      return `${who} takes the order`;
    case 'write':
      return `${who} writes ${leg.cup ? `the ${leg.cup} ticket` : 'the ticket'}`;
    case 'claim':
      return `${who} takes ${leg.cup ? `the ${leg.cup} ticket` : 'the ticket'}`;
    case 'make':
      // The one drink of a single-cup order is named once, where it is made.
      return `${who} makes ${leg.cup || !guest.tickets[0] ? it : `the ${guest.tickets[0].item}`}`;
    case 'ready':
      return `${who} puts ${it} out for pickup`;
    case 'pickup':
      return `${who} picks ${it} up`;
    case 'serve':
      return leg.toGo ? `${who} hands ${it} over to go` : `${who} serves ${it} at table ${guest.table}`;
    case 'leave':
      return 'Leaves';
    case 'clear':
      return `${who} clears ${leg.cup ? `the ${leg.cup} cup` : 'the cup'}`;
    case 'slip':
      return `${who} stopped: ${leg.error?.replace(/\.$/, '')}`;
  }
}

/** A guest by their place in their round's line, as the failure card counts them: "Guest 3". */
export function guestName(level: LevelDefinition, guest: ReplayEvent): string {
  const seed = level.seeds.find((s) => s.id === guest.seed_id);
  return `Guest ${(seed?.customers.findIndex((c) => c.customer_id === guest.customer.customer_id) ?? -1) + 1}`;
}

/**
 * Whether an order has gone all the way, so nothing more is coming: it slipped, its round is over, or its guest has
 * left and every cup set down at a table has been cleared, where the café clears them.
 */
export function routeDone(route: readonly Leg[], clearing: boolean, roundOver: boolean): boolean {
  if (roundOver || route.some((leg) => leg.stage === 'slip')) return true;
  if (!route.some((leg) => leg.stage === 'leave')) return false;
  const tabled = route.filter((leg) => leg.stage === 'serve' && !leg.toGo);
  return !clearing || tabled.every((served) => route.some((leg) => leg.stage === 'clear' && leg.unit === served.unit));
}

/** A guest whose order can be followed, by round and id. */
export interface Followable {
  seed: string;
  guest: string;
  /** Their round, counting from 1. */
  round: number;
  /** "Guest 2 · “a tea, please”" */
  label: string;
}

/** The guests who have walked in by a time, round by round in the order they came, whose orders can be followed. */
export function followable(level: LevelDefinition, result: RunResult, head: number): Followable[] {
  return (result.execution ?? []).flatMap((round) => {
    const index = level.seeds.findIndex((seed) => seed.id === round.seed_id);
    return result.events
      .filter((e) => e.seed_id === round.seed_id && round.start + e.timing.arrival <= head)
      .sort((a, b) => a.timing.arrival - b.timing.arrival)
      .map((e) => ({
        seed: e.seed_id,
        guest: e.customer.customer_id,
        round: index + 1,
        label: `${guestName(level, e)} · “${e.customer.phrase}”`,
      }));
  });
}
