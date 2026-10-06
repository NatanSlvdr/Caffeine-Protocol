import { count, measureService, meetsChallenge, type Challenge, type ChallengeMeasure, type RunResult } from '@/domain';

interface ChallengeWords {
  name: string;
  /** What meeting it takes. */
  goal: (target: number) => string;
  /** A service's measure, as the receipt reads it. */
  amount: (value: number) => string;
  /** The café fact the challenge turns on, or what it pulls against: never which blocks to write. */
  note: string;
}

/**
 * Each challenge in the café's words. The notes are claims about the café, and tests/unit/data/challenges.test.ts runs
 * routines that bear each one out.
 */
export const CHALLENGE_WORDS: Record<ChallengeMeasure, ChallengeWords> = {
  walk: {
    name: 'Short legs',
    goal: (target) => `Porter walks ${count(target, 'tile')} or fewer over the whole service.`,
    amount: (value) => count(value, 'tile'),
    note: 'A guest drinks up in 12 s, sooner than Porter can walk back to the counter and out to the table again.',
  },
  wait: {
    name: 'No long waits',
    goal: (target) => `No guest waits more than ${target} s from walking in to their last drink.`,
    amount: (value) => `${value} s`,
    note: 'Fewer steps aren’t a quicker service: Brew claiming two tickets before making either runs fewer steps, but keeps the first guest waiting on the second order.',
  },
  rush: {
    name: 'Rush first',
    goal: (target) => `Every guest in a rush has their drinks within ${target} s of walking in.`,
    amount: (value) => `${value} s`,
    note: 'A rush order jumps the queue, but not the robot: it waits on whatever its robot is in the middle of. Brew claiming two tickets before making either holds rush orders up, even making each one first.',
  },
  close: {
    name: 'Early night',
    goal: (target) => `Every round is over within ${target} s, from opening to the whole crew stopped.`,
    amount: (value) => `${value} s`,
    note: 'Stopping at the closing call is the easy part. How soon the night ends is every walk and wait of the service added up, and fewer steps don’t bring it in: Brew claiming two tickets at a time runs fewer, and closes later.',
  },
};

/** One challenge as a run left it. */
export interface ChallengeOutcome {
  challenge: Challenge;
  words: ChallengeWords;
  /** This run's measure, as the receipt reads it. */
  value: number;
  met: boolean;
  /** Met on an earlier service, as the save had it before this one. */
  before: boolean;
}

export function challengeOutcomes(
  challenges: readonly Challenge[],
  result: RunResult,
  metBefore: readonly ChallengeMeasure[] = [],
): ChallengeOutcome[] {
  return challenges.map((challenge) => ({
    challenge,
    words: CHALLENGE_WORDS[challenge.measure],
    value: measureService(challenge.measure, result),
    met: meetsChallenge(challenge, result),
    before: metBefore.includes(challenge.measure),
  }));
}

/** The challenges a run meets, by the names the save keeps them under. */
export const challengesMet = (challenges: readonly Challenge[] | undefined, result: RunResult): ChallengeMeasure[] =>
  (challenges ?? []).filter((challenge) => meetsChallenge(challenge, result)).map((challenge) => challenge.measure);
