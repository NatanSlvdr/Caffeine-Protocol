import type { RunResult } from './types';

/**
 * What an optional challenge weighs in a served service: the tiles Porter walked, the longest any guest waited for
 * their drinks, the longest a rush order waited, or how long the longest round ran until the whole crew had stopped.
 * None of them is a star target, and none says which routine is best: each looks at the service from one side.
 */
export type ChallengeMeasure = 'walk' | 'wait' | 'rush' | 'close';
export const CHALLENGE_MEASURES: readonly ChallengeMeasure[] = ['walk', 'wait', 'rush', 'close'];

/** One optional challenge on a shift: a measure, at most one challenge each, and the most it may come to. */
export interface Challenge {
  /** What's weighed; a shift has one challenge per measure, so this names it in the save once met. */
  measure: ChallengeMeasure;
  /** The most the measure may come to: tiles for a walk, whole seconds for the rest. */
  target: number;
}

const longest = (values: readonly number[]) => (values.length ? Math.max(...values) : 0);

/**
 * A served service's measure, in the unit its target is set in, rounded as the receipt shows it: what the player
 * reads is what's judged.
 */
export function measureService(measure: ChallengeMeasure, result: RunResult): number {
  const rounds = result.execution ?? [];
  const guests = result.events.filter((event) => event.tickets.length);
  const waited = (events: typeof guests) => events.map((event) => event.timing.served - event.timing.arrival);
  switch (measure) {
    case 'walk':
      // Moves are recorded a tile at a time.
      return rounds
        .flatMap((round) => round.events)
        .filter((event) => event.role === 'floor' && (event.from[0] !== event.to[0] || event.from[1] !== event.to[1]))
        .length;
    case 'wait':
      return Math.round(longest(waited(guests)));
    case 'rush':
      return Math.round(longest(waited(guests.filter((event) => event.tickets.some((ticket) => ticket.rush)))));
    case 'close':
      return Math.round(longest(rounds.map((round) => round.duration)));
  }
}

/** Whether a run meets a challenge: only a full service that served every guest counts, as it does for stars. */
export const meetsChallenge = (challenge: Challenge, result: RunResult) =>
  result.passed &&
  !result.practice &&
  !result.observation &&
  measureService(challenge.measure, result) <= challenge.target;
