import { UNLOCKS, type ProgressSave } from '@/domain';
import { isRated, levels } from '@/data';
import { acts } from './rail/acts';

export type KeepsakeId = 'order-pad' | 'recipe-card' | 'name-tags' | 'floor-plan' | 'closing-sign' | 'gold-star';

/** Something the café keeps on the shelf behind the counter, for a distinct thing it has done. */
export interface Keepsake {
  id: KeepsakeId;
  name: string;
  /** What earns it, read before it is on the shelf. */
  goal: string;
  /** What it marks, read once it is there. */
  story: string;
  /** Read from what the save already keeps, so nothing new has to be stored and an old save earns what it has done. */
  earned: (save: Pick<ProgressSave, 'stars'>) => boolean;
}

const served = (save: Pick<ProgressSave, 'stars'>, shift: number) => save.stars[shift] !== undefined;
const shiftsOf = (act: number) => Array.from({ length: acts[act].to - acts[act].from }, (_, i) => acts[act].from + i);
const actServed = (act: number) => (save: Pick<ProgressSave, 'stars'>) =>
  shiftsOf(act).every((shift) => served(save, shift));

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
    earned: actServed(1),
  },
  {
    id: 'recipe-card',
    name: 'Brew’s recipe card',
    goal: 'Serve every shift of Act II.',
    story: 'Brew made every recipe of Act II, and learned to keep one card for all of them.',
    earned: actServed(2),
  },
  {
    id: 'name-tags',
    name: 'Three name tags',
    goal: 'Serve a shift with all three robots at work.',
    story: 'Query, Brew and Porter served a shift together, each running a routine of its own.',
    earned: (save) => levels.some((_, shift) => shift >= UNLOCKS.floor - 1 && served(save, shift)),
  },
  {
    id: 'floor-plan',
    name: 'Porter’s floor plan',
    goal: 'Serve every shift of Act III.',
    story: 'Porter carried every cup of Act III to its table, then cleared the empties away.',
    earned: actServed(3),
  },
  {
    id: 'closing-sign',
    name: 'The closing sign',
    goal: 'Serve every shift of Act IV.',
    story: 'The whole crew saw out the busiest days, and turned the sign at closing time.',
    earned: actServed(4),
  },
  {
    id: 'gold-star',
    name: 'A gold star',
    goal: 'Earn three stars on every shift of one act.',
    story: 'Every shift of an act served on target, blocks and steps both.',
    earned: (save) =>
      acts.some((_, act) => {
        const rated = shiftsOf(act).filter(isRated);
        return rated.length > 0 && rated.every((shift) => save.stars[shift] === 3);
      }),
  },
];

/** The keepsakes on the shelf so far, in the shelf's order. */
export const shelved = (save: Pick<ProgressSave, 'stars'>) => keepsakes.filter((keepsake) => keepsake.earned(save));
