import { SAVE_KEY, newSave } from '../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../src/domain/types';
import { CAMPAIGN_LENGTH } from '../../src/data';
import { cutscenes } from '../../src/data/campaign/cutscenes';

/** Fresh save, with every pre-shift scene seen, and overrides applied on top. */
export function makeSave(overrides: Partial<ProgressSave> = {}): ProgressSave {
  return { ...newSave(), story: scenesSeen, ...overrides };
}

/** Every story scene before a shift already watched, so shift tests aren't held at a cutscene. Pass `story: {}` to test the scenes. */
export const scenesSeen: ProgressSave['story'] = Object.fromEntries(
  cutscenes.filter((scene) => scene.before < CAMPAIGN_LENGTH).map((scene) => [scene.before, true]),
);

/** Seed browser storage with a save. */
export function seedLocalStorage(save: ProgressSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
