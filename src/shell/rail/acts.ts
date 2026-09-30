import { UNLOCKS } from '@/domain';

export interface Act {
  kicker: string;
  /** Who the act belongs to, printed large on its ticket. */
  crew: string;
  tagline: string;
  from: number;
  to: number;
}

/** The campaign as orders on the kitchen rail: one ticket per act, one line per shift. */
export const acts: Act[] = [
  { kicker: 'Prologue', crew: 'Niko', tagline: 'Watch a service run by hand.', from: 0, to: UNLOCKS.query - 1 },
  {
    kicker: 'Act I',
    crew: 'Query',
    tagline: 'Teach the counter robot to take orders.',
    from: UNLOCKS.query - 1,
    to: UNLOCKS.prep - 1,
  },
  {
    kicker: 'Act II',
    crew: 'Brew',
    tagline: 'Teach the kitchen robot every recipe.',
    from: UNLOCKS.prep - 1,
    to: UNLOCKS.floor - 1,
  },
  { kicker: 'Act III', crew: 'Porter', tagline: 'Teach the floor robot the room.', from: UNLOCKS.floor - 1, to: 16 },
  {
    kicker: 'Act IV',
    crew: 'The whole crew',
    tagline: 'Three robots, one café, and some very odd days.',
    from: 16,
    to: 21,
  },
];

export const actIndexFor = (shift: number) =>
  Math.max(
    0,
    acts.findIndex((act) => shift >= act.from && shift < act.to),
  );
