import { UNLOCKS } from '@/domain';
import { levels } from '@/data';

export interface Act {
  kicker: string;
  /** Who the act belongs to, printed large on its ticket. */
  crew: string;
  from: number;
  to: number;
}

/** The campaign as orders on the kitchen rail: one ticket per act, one line per shift. Its words are in `railWords`. */
export const acts: Act[] = [
  { kicker: 'Prologue', crew: 'Niko', from: 0, to: UNLOCKS.query - 1 },
  {
    kicker: 'Act I',
    crew: 'Query',
    from: UNLOCKS.query - 1,
    to: UNLOCKS.prep - 1,
  },
  {
    kicker: 'Act II',
    crew: 'Brew',
    from: UNLOCKS.prep - 1,
    to: UNLOCKS.floor - 1,
  },
  {
    kicker: 'Act III',
    crew: 'Porter',
    from: UNLOCKS.floor - 1,
    to: UNLOCKS.toGo - 1,
  },
  {
    kicker: 'Act IV',
    crew: 'The whole crew',
    from: UNLOCKS.toGo - 1,
    to: levels.length,
  },
];

export const actIndexFor = (shift: number) =>
  Math.max(
    0,
    acts.findIndex((act) => shift >= act.from && shift < act.to),
  );
