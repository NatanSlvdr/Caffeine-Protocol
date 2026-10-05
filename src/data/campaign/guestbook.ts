import type { CastId } from '../../domain/dialogue';
import type { ProgressSave } from '../../domain/types';

/** A note a regular leaves in the café's guestbook after a shift they were part of. */
export interface GuestbookNote {
  /** The 1-based shift it was written after: the regular is in that shift's scenes, and it has to have been served. */
  shift: number;
  who: CastId;
  text: string;
  /** How they sign it. */
  sign: string;
}

/**
 * The guestbook by the till. Each note is about something that happened in the shift it follows, so it only appears
 * once that shift has been served. Notes thank the café for what went right; none counts stars, hints or tries.
 */
export const guestbook: readonly GuestbookNote[] = [
  {
    shift: 4,
    who: 'juno',
    text: 'Tea. Real tea, in a real cup. Three chapters written at the window table. I’ll be back tomorrow.',
    sign: 'J.',
  },
  {
    shift: 5,
    who: 'dot',
    text: 'To the little robot at the counter: thank you for hearing every word, dear. The “without” and the “with”.',
    sign: 'Dot x',
  },
  {
    shift: 6,
    who: 'rosa',
    text: 'Two coffees, two tickets, and my brother’s was still hot when he’d locked up the bike. He never says anything nice about coffee. He said something nice.',
    sign: 'Rosa',
  },
  {
    shift: 7,
    who: 'dot',
    text: 'Two sugars. Not one, not three. Somebody here finally counts as carefully as I do.',
    sign: 'Dot x',
  },
  {
    shift: 8,
    who: 'albert',
    text: 'A machine that rings for help instead of guessing. Wiser than half the people on this street.',
    sign: 'Mr. Albert',
  },
  {
    shift: 10,
    who: 'juno',
    text: 'Whole leaves, steeped properly. I take back what I said about the new robot. Most of it.',
    sign: 'J.',
  },
  {
    shift: 11,
    who: 'dot',
    text: 'My two sugars, made exactly as written. I’ve told the whole knitting circle about your kitchen.',
    sign: 'Dot x',
  },
  {
    shift: 15,
    who: 'albert',
    text: 'My cup was cleared before I’d folded my newspaper. Lou kept a tidy room. So do you.',
    sign: 'Mr. Albert',
  },
  {
    shift: 19,
    who: 'rosa',
    text: 'Tea in hand with four minutes to spare, and I still made it up the stairs before the meeting. The tip is under the saucer.',
    sign: 'Rosa',
  },
  {
    shift: 21,
    who: 'albert',
    text: 'The busiest day this street has seen, and I still got the usual without asking twice. And Niko finished a whole coffee. Lou would have liked that most of all.',
    sign: 'Mr. Albert',
  },
];

/** The notes left so far, oldest first: one for each shift served that a regular wrote about. */
export function guestbookNotes(save: Pick<ProgressSave, 'stars'>): GuestbookNote[] {
  return guestbook.filter((note) => save.stars[note.shift - 1] !== undefined);
}
