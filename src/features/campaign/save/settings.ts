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
  fullscreen: false,
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
