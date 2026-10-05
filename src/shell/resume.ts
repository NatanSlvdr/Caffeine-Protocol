import { lessons, levels } from '@/data';
import { waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import type { ProgressSave } from '@/domain';
import { changedRoles } from '@/features/campaign/save/progression';
import { untouched } from '@/features/campaign/save/settings';

/** Where a returning player left off, and what's waiting for them there. */
export interface ResumePoint {
  /** The shift to open, by index. */
  index: number;
  /** A scene that plays before the shift opens. */
  scene?: Cutscene;
  /** The stars it has earned; nothing while it's still to be served. */
  stars?: number;
  /** The routines differ from the served ones, or, on a shift still to serve, from how it opened. */
  edited: boolean;
}

/** Whether a shift's routines, as the workspace would open them, have changed since it was served or opened. */
const edited = (save: ProgressSave, index: number) => changedRoles(save, index, lessons).length > 0;

/**
 * The shift a returning player picks up: the one they last worked on, unless it's served and left as it was served,
 * in which case the next shift waiting to be served. Nothing for a café that hasn't opened yet.
 */
export function resumePoint(save: ProgressSave): ResumePoint | null {
  if (untouched(save)) return null;
  let index = Math.min(save.selected, levels.length - 1);
  const next = Math.min(save.unlocked, levels.length - 1);
  if (save.stars[index] !== undefined && !edited(save, index) && save.stars[next] === undefined) index = next;
  return { index, scene: waitingScene(save, index), stars: save.stars[index], edited: edited(save, index) };
}
