import { count, type ProgressSave } from '@/domain';
import { starTotal } from '@/state/GameStore';

export const FRESH = 'a fresh café, with no shifts served yet';

/** What a café holds, counted as the fresh-start window counts what it clears; empty for a café never opened. */
export function holds(save: ProgressSave): string {
  const done = Object.keys(save.stars).length;
  return done ? `${count(done, 'served shift')} and ${count(starTotal(save.stars), 'star')}` : '';
}
