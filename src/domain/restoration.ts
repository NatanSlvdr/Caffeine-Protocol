import { UNLOCKS } from './unlocks';

/**
 * The café put back together as the story goes, one authored change at a time. Each is dressing only, on the walls,
 * the sills and the sidewalk, so no station, tile or route moves.
 */
export type Restoration =
  /** A chalk board out on the sidewalk: the sign said CLOSED on the first morning. */
  | 'open-sign'
  /** Query's Employee of the Month photo, from A Second Pair of Hands. */
  | 'employee-photo'
  /** Moka's apron on a hook, with its 92° note, from Ninety-Two Degrees. */
  | 'moka-apron'
  /** Every light on, strung along the back wall, from The Floor Robot. */
  | 'string-lights'
  /** Niko's apron on the hook beside Moka's, from Back to School. */
  | 'niko-apron'
  /** The group photo, and Lou's postcard pinned beside it, from Closing Time. */
  | 'lou-postcard';

/** The 1-based shift each change is first seen on: the shift its scene opens, or for the sign, the second morning. */
export const RESTORATIONS: Readonly<Record<Restoration, number>> = {
  'open-sign': 2,
  'employee-photo': UNLOCKS.prep,
  'moka-apron': 13,
  'string-lights': UNLOCKS.floor,
  'niko-apron': UNLOCKS.toGo,
  /** Closing Time plays after the last shift, so the postcard goes up once the campaign is served. */
  'lou-postcard': UNLOCKS.closing + 2,
};

/** How the café looks on a shift: the changes made by then, each kept from then on. */
export function restoredBy(shift: number): ReadonlySet<Restoration> {
  return new Set(
    (Object.entries(RESTORATIONS) as [Restoration, number][]).filter(([, from]) => shift >= from).map(([id]) => id),
  );
}

export type SillGrowth = 0 | 1 | 2 | 3;

/**
 * How far the herbs on the window sills have come back: dry stalks on the first morning after years shut, new shoots
 * with Query, full pots with Brew, and flowering from Porter on.
 */
export function sillGrowth(shift: number): SillGrowth {
  return shift >= UNLOCKS.floor ? 3 : shift >= UNLOCKS.prep ? 2 : shift >= UNLOCKS.query ? 1 : 0;
}
