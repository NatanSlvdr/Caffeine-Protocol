import type { ProgressSave } from './types';
import { UNLOCKS } from './unlocks';

/** A place in the café whose look the player picks. Only looks: no service, score or star ever reads them. */
export type DecorSpot = 'cushions' | 'print';
export type CushionId = 'clay-sage' | 'mustard-teal' | 'berry-oat';
export type PrintId = 'hills' | 'harbour' | 'coffee-branch';

/** The café's looks, one for each spot. */
export interface Decor {
  cushions: CushionId;
  print: PrintId;
}

/** What earning a look reads from the save: the stars each shift earned, and whether the campaign is finished. */
type Earnings = Pick<ProgressSave, 'stars' | 'complete'>;

export interface DecorOption<Id extends string = string> {
  id: Id;
  name: string;
  /** What earns it, read before it can be picked. */
  goal: string;
  earned: (save: Earnings) => boolean;
}

/** Every shift of an act served: the acts run between the shifts that bring in each robot. */
const actServed = (from: number, to: number) => (save: Earnings) =>
  Array.from({ length: to - from }, (_, i) => from - 1 + i).every((shift) => save.stars[shift] !== undefined);
const always = () => true;

/**
 * A few looks for two spots, one earned by each act, so the café changes as it comes back without anything to buy or
 * place. The first of each is Lou's, there from the start.
 */
export const DECOR_OPTIONS: { [Spot in DecorSpot]: readonly DecorOption<Decor[Spot]>[] } = {
  cushions: [
    { id: 'clay-sage', name: 'Clay and sage', goal: 'Lou’s, there from the start.', earned: always },
    {
      id: 'mustard-teal',
      name: 'Mustard and teal',
      goal: 'Serve every shift of Act II.',
      earned: actServed(UNLOCKS.prep, UNLOCKS.floor),
    },
    { id: 'berry-oat', name: 'Berry and oat', goal: 'Finish the campaign.', earned: (save) => save.complete },
  ],
  print: [
    { id: 'hills', name: 'Hills at noon', goal: 'Lou’s, there from the start.', earned: always },
    {
      id: 'harbour',
      name: 'The harbour',
      goal: 'Serve every shift of Act I.',
      earned: actServed(UNLOCKS.query, UNLOCKS.prep),
    },
    {
      id: 'coffee-branch',
      name: 'A coffee branch',
      goal: 'Serve every shift of Act III.',
      earned: actServed(UNLOCKS.floor, UNLOCKS.toGo),
    },
  ],
};

/** Lou's looks, the café's before anything is picked. */
export const LOUS_DECOR: Decor = { cushions: 'clay-sage', print: 'hills' };

/** The looks the café shows: each spot's pick if it is one the café has earned, and Lou's otherwise. */
export function decorOf(save: Earnings & Pick<ProgressSave, 'decor'>): Decor {
  const pick = <Spot extends DecorSpot>(spot: Spot): Decor[Spot] => {
    const option = DECOR_OPTIONS[spot].find(({ id }) => id === save.decor?.[spot]);
    return option?.earned(save) ? option.id : LOUS_DECOR[spot];
  };
  return { cushions: pick('cushions'), print: pick('print') };
}
