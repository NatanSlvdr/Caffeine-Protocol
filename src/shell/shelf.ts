import { UNLOCKS, type ProgressSave } from '@/domain';
import { isRated, levels } from '@/data';
import { acts } from './rail/acts';

export type KeepsakeId =
  'order-pad' | 'recipe-card' | 'name-tags' | 'floor-plan' | 'closing-sign' | 'gold-star' | 'stopwatch';

/** What the shelf reads from the save: the stars each shift earned, and the optional challenges met. */
type Earnings = Pick<ProgressSave, 'stars' | 'challenges'>;

/** Something the café keeps on the shelf behind the counter, for a distinct thing it has done. */
export interface Keepsake {
  id: KeepsakeId;
  name: string;
  /** What earns it, read before it is on the shelf. */
  goal: string;
  /** What it marks, read once it is there. */
  story: string;
  /** The act that brings it into the story. Until that act's ticket opens, the shelf keeps it under wraps. */
  act: number;
  /** Read from what the save already keeps, so nothing new has to be stored and an old save earns what it has done. */
  earned: (save: Earnings) => boolean;
}

const served = (save: Earnings, shift: number) => save.stars[shift] !== undefined;
const shiftsOf = (act: number) => Array.from({ length: acts[act].to - acts[act].from }, (_, i) => acts[act].from + i);
const actServed = (act: number) => (save: Earnings) => shiftsOf(act).every((shift) => served(save, shift));

/**
 * The shelf: a few keepsakes, each for a different milestone. None asks for a streak, a replay of a shift already
 * served, or a setting left off; the one about stars asks for a single act, so it marks a goal met, not a grind.
 */
export const keepsakes: readonly Keepsake[] = [
  {
    id: 'order-pad',
    name: 'Query’s order pad',
    goal: 'Serve every shift of Act I.',
    story: 'Query took every order of Act I, from the first coffee to the orders nobody could make out.',
    act: 1,
    earned: actServed(1),
  },
  {
    id: 'recipe-card',
    name: 'Brew’s recipe card',
    goal: 'Serve every shift of Act II.',
    story: 'Brew made every recipe of Act II, and learned to keep one card for all of them.',
    act: 2,
    earned: actServed(2),
  },
  {
    id: 'name-tags',
    name: 'Three name tags',
    goal: 'Serve a shift with all three robots at work.',
    story: 'Query, Brew and Porter served a shift together, each running a routine of its own.',
    act: 3,
    earned: (save) => levels.some((_, shift) => shift >= UNLOCKS.floor - 1 && served(save, shift)),
  },
  {
    id: 'floor-plan',
    name: 'Porter’s floor plan',
    goal: 'Serve every shift of Act III.',
    story: 'Porter carried every cup of Act III to its table, then cleared the empties away.',
    act: 3,
    earned: actServed(3),
  },
  {
    id: 'closing-sign',
    name: 'The closing sign',
    goal: 'Serve every shift of Act IV.',
    story: 'The whole crew saw out the busiest days, and turned the sign at closing time.',
    act: 4,
    earned: actServed(4),
  },
  {
    id: 'gold-star',
    name: 'A gold star',
    goal: 'Earn three stars on every shift of one act.',
    story: 'Every shift of an act served on target, blocks and steps both.',
    act: 1,
    earned: (save) =>
      acts.some((_, act) => {
        const rated = shiftsOf(act).filter(isRated);
        return rated.length > 0 && rated.every((shift) => save.stars[shift] === 3);
      }),
  },
  {
    id: 'stopwatch',
    name: 'A stopwatch',
    goal: 'Meet one of the optional challenges on any shift.',
    story: 'A service measured past the stars: a shorter walk, a shorter wait or an earlier night.',
    act: 3,
    earned: (save) => Object.values(save.challenges ?? {}).some((met) => met.length > 0),
  },
];

/**
 * Whether a keepsake not yet earned is still under wraps: its act is sealed on the rail (no shift of it unlocked yet),
 * so naming it or what earns it would give away who joins the crew, as the sealed ticket never does.
 */
export const veiled = (keepsake: Keepsake, save: Earnings & Pick<ProgressSave, 'unlocked'>) =>
  !keepsake.earned(save) && acts[keepsake.act].from > save.unlocked;

/** The keepsakes on the shelf so far, in the shelf's order. */
export const shelved = (save: Earnings) => keepsakes.filter((keepsake) => keepsake.earned(save));
