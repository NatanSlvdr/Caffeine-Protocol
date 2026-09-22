import { levels } from '@/data';
import { referencePrograms } from '@/data/extension';
import { compileProgram, runLevel } from '@/domain';
import type { RunResult } from '@/domain';

export const HOME_PREVIEW_LEVEL = 23;
let cachedPreview: RunResult | undefined;

/** Run one reference service so the landing scene replays real orders and robot work. */
export function homePreviewResult(): RunResult {
  if (cachedPreview) return cachedPreview;
  const level = levels[HOME_PREVIEW_LEVEL - 1];
  const programs = referencePrograms(HOME_PREVIEW_LEVEL);
  cachedPreview = runLevel(
    { ...level, seeds: [level.seeds[0]] },
    compileProgram(programs.query, Math.min(HOME_PREVIEW_LEVEL, 14)),
    programs,
  );
  return cachedPreview;
}
