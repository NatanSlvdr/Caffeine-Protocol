import type { ProgressSave, Settings } from '@/domain/types';

/**
 * Stable localStorage namespace, not a schema version.
 * The `v1` suffix names the storage slot so existing saves can be found;
 * the save schema version lives inside the JSON payload (`version: 1 | 2 | 3 | 4`)
 * and migrates via `parseSave`. Never rename this key for a schema bump —
 * renaming would orphan every existing café instead of migrating it.
 */
export const SAVE_KEY = 'caffeine-protocol.v1';
const defaultSettings: Settings = {
  music: 0.33,
  reduced_motion: false,
  pixel_art: true,
  text_editor: false,
  speed: 1,
  first_routine_tips: true,
  short_repeats: false,
};
export const newSave = (settings: Settings = { ...defaultSettings }): ProgressSave => ({
  version: 4,
  robotDrafts: {},
  robotSolutions: {},
  selected: 0,
  unlocked: 0,
  complete: false,
  drafts: {},
  solutions: {},
  stars: {},
  story: {},
  settings: { ...settings },
});
/** A café nobody has played in yet: nothing unlocked, served, written or seen. Its settings don't count. */
export const untouched = (save: ProgressSave): boolean =>
  save.unlocked === 0 &&
  !save.complete &&
  [save.robotDrafts, save.robotSolutions, save.drafts, save.solutions, save.stars, save.story].every(
    (map) => Object.keys(map).length === 0,
  );
