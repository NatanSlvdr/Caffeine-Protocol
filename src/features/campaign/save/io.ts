import type { ProgressSave } from '@/domain/types';
import { SAVE_KEY, newSave } from './settings';
import { parseSave } from './migration';
import type { LessonCatalog } from './migration';

export function readSave(
  storage: Pick<Storage, 'getItem'>,
  lessons: LessonCatalog,
): { save: ProgressSave; error: string } {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return { save: raw ? parseSave(raw, lessons) : newSave(), error: '' };
  } catch {
    return {
      save: newSave(),
      error:
        'Saved progress could not be read. The original data is untouched; export a recovery copy in Settings before saving a new café.',
    };
  }
}
export function writeSave(storage: Pick<Storage, 'setItem'>, save: ProgressSave): string {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return '';
  } catch {
    return 'Progress could not be saved. Export your café from Settings to keep it.';
  }
}
