import { CAMPAIGN_LENGTH, levels } from '@/data';
import { referencePrograms } from '@/data/extension';
import { UNLOCKS, compileProgram, runLevel } from '@/domain';
import type { ProgressSave, RunResult } from '@/domain';

export const HOME_PREVIEW_LEVEL = UNLOCKS.floor;
let cachedPreview: RunResult | undefined;

/** Run one reference service so the landing scene replays real orders and robot work. */
export function homePreviewResult(): RunResult {
  if (cachedPreview) return cachedPreview;
  const level = levels[HOME_PREVIEW_LEVEL - 1];
  const programs = referencePrograms(HOME_PREVIEW_LEVEL);
  cachedPreview = runLevel(
    { ...level, seeds: [level.seeds[0]] },
    compileProgram(programs.query, HOME_PREVIEW_LEVEL),
    programs,
  );
  return cachedPreview;
}

/**
 * The shift whose café the shell's backdrops are dressed as: the furthest one opened, so what the story has put back
 * shows there too, and the whole of it once the campaign is served and Closing Time has played.
 */
export function restoredShift(save: Pick<ProgressSave, 'unlocked' | 'complete'>): number {
  return save.complete ? CAMPAIGN_LENGTH + 1 : Math.min(save.unlocked, CAMPAIGN_LENGTH - 1) + 1;
}
