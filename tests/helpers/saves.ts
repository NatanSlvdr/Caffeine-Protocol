import { SAVE_KEY, newSave } from '../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../src/domain/types';

/** Fresh save with overrides applied on top of the defaults. */
export function makeSave(overrides: Partial<ProgressSave> = {}): ProgressSave {
  return { ...newSave(), ...overrides };
}

/** Seed browser storage with a save. */
export function seedLocalStorage(save: ProgressSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
