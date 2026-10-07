import {
  REGULAR_NAMES,
  ROBOT_DISPLAY_NAMES,
  regularsOf,
  robotActorName,
  type Leg,
  type LevelDefinition,
  type ReplayEvent,
  type RunResult,
} from '@/domain';
import { ROUTE_WORDS, type RouteWords } from './routeWords';

/** Who did a leg of an order, as the café names them: a stand-in by its own name. */
export function actorName(leg: Leg, level: number): string {
  if (leg.actor === 'niko') return 'Niko';
  if (leg.role === 'prep' || leg.role === 'floor') return robotActorName(leg.role, level);
  return ROBOT_DISPLAY_NAMES.query;
}

/** A leg of an order's way, in a few words: "Brew makes the tea", "Porter serves it at table 2". */
export function legWords(leg: Leg, guest: ReplayEvent, level: number, say: RouteWords = ROUTE_WORDS.en): string {
  const who = actorName(leg, level);
  if (leg.stage === 'slip') return say.stopped(who) + (leg.error ?? '').replace(/\.$/, '');
  // The one drink of a single-cup order is named once, where it is made.
  return say.leg({ ...leg, stage: leg.stage, who, drink: guest.tickets[0]?.item, table: guest.table });
}

/** A regular's name, "Mr. Albert"; nothing for a guest the café doesn't know by name. */
export function regularCalled(level: LevelDefinition, seedId: string, customerId: string): string | undefined {
  const seed = level.seeds.find((s) => s.id === seedId);
  const regular = seed && regularsOf(seed.customers).get(customerId);
  return regular && REGULAR_NAMES[regular];
}

/**
 * A guest as the café knows them: a regular by name, "Mr. Albert", anyone else by their place in their round's line,
 * "Guest 3". The failure card, the comparison and the order card all call a guest the same.
 */
export function guestCalled(
  level: LevelDefinition,
  seedId: string,
  customerId: string,
  guest = (n: number) => `Guest ${n}`,
): string {
  const seed = level.seeds.find((s) => s.id === seedId);
  return (
    regularCalled(level, seedId, customerId) ??
    guest((seed?.customers.findIndex((c) => c.customer_id === customerId) ?? -1) + 1)
  );
}

/** A guest of a run, as the café knows them; `called` numbers anyone else, "Guest 3". */
export function guestName(level: LevelDefinition, guest: ReplayEvent, called?: (n: number) => string): string {
  return guestCalled(level, guest.seed_id, guest.customer.customer_id, called);
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
export function followable(
  level: LevelDefinition,
  result: RunResult,
  head: number,
  called?: (n: number) => string,
): Followable[] {
  return (result.execution ?? []).flatMap((round) => {
    const index = level.seeds.findIndex((seed) => seed.id === round.seed_id);
    return result.events
      .filter((e) => e.seed_id === round.seed_id && round.start + e.timing.arrival <= head)
      .sort((a, b) => a.timing.arrival - b.timing.arrival)
      .map((e) => ({
        seed: e.seed_id,
        guest: e.customer.customer_id,
        round: index + 1,
        label: `${guestName(level, e, called)} · “${e.customer.phrase}”`,
      }));
  });
}
