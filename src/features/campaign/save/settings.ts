import type { ProgressSave, Settings } from '@/domain/types';

export const SAVE_KEY = 'caffeine-protocol.v1';
const defaultSettings: Settings = {
  volume: 0.6,
  music: 0.55,
  effects: 0.65,
  reduced_motion: false,
  pixel_art: true,
  fullscreen: false,
};
export const newSave = (settings: Settings = { ...defaultSettings }): ProgressSave => ({
  version: 3,
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
