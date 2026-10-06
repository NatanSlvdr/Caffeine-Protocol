import type { ProgressSave } from '@/domain/types';
import { newSave, untouched } from './settings';
import { cafeKey } from './cafes';
import { migrationChanges, parseSave } from './migration';
import type { LessonCatalog } from './migration';

export function readSave(
  storage: Pick<Storage, 'getItem'>,
  lessons: LessonCatalog,
): { save: ProgressSave; error: string } {
  try {
    const raw = storage.getItem(cafeKey());
    return { save: raw ? parseSave(raw, lessons) : newSave(), error: '' };
  } catch {
    return {
      save: newSave(),
      error:
        'Saved progress could not be read, so new progress isn’t being saved. The original data is untouched: export a recovery copy from Settings.',
    };
  }
}
export function writeSave(storage: Pick<Storage, 'setItem'>, save: ProgressSave): string {
  try {
    storage.setItem(cafeKey(), JSON.stringify(save));
    return '';
  } catch {
    return 'Progress could not be saved. Export your café from Settings to keep it.';
  }
}

/** Where the open café keeps one copy of itself from before the last time it was replaced, so a slip can be taken back. */
export const backupKey = () => `${cafeKey()}.backup`;
/** What replaced the café the backup was taken from. */
export type BackupReason = 'import' | 'reset' | 'restore' | 'migration';
export interface SaveBackup {
  reason: BackupReason;
  /** ISO time the copy was taken. */
  saved_at: string;
  save: ProgressSave;
  /** For a copy kept ahead of a save update, what the update changed: see migrationChanges. */
  changes?: string[];
}

/**
 * Copy the stored café into the backup slot before it is replaced. Only a café that reads back is copied: a
 * damaged one would push out the last good copy, and it has its own recovery export. Returns whether a copy was kept.
 */
export function backupSave(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  reason: BackupReason,
  lessons: LessonCatalog,
  now = new Date(),
): boolean {
  try {
    const raw = storage.getItem(cafeKey());
    if (!raw) return false;
    // A café with nothing in it yet isn't worth pushing out the last copy for.
    if (untouched(parseSave(raw, lessons))) return false;
    storage.setItem(backupKey(), JSON.stringify({ reason, saved_at: now.toISOString(), raw }));
    return true;
  } catch {
    return false;
  }
}

/** The kept copy, read and migrated like any save, or null when there is none or it no longer reads. */
export function readBackup(storage: Pick<Storage, 'getItem'>, lessons: LessonCatalog): SaveBackup | null {
  try {
    const kept: unknown = JSON.parse(storage.getItem(backupKey()) ?? 'null');
    if (typeof kept !== 'object' || kept === null) return null;
    const { reason, saved_at, raw } = kept as Record<string, unknown>;
    if (!REASONS.includes(reason as BackupReason) || typeof saved_at !== 'string' || typeof raw !== 'string')
      return null;
    if (Number.isNaN(Date.parse(saved_at))) return null;
    const backup: SaveBackup = { reason: reason as BackupReason, saved_at, save: parseSave(raw, lessons) };
    if (reason === 'migration') backup.changes = migrationChanges(raw, lessons);
    return backup;
  } catch {
    return null;
  }
}
const REASONS: BackupReason[] = ['import', 'reset', 'restore', 'migration'];

/** Whether the stored café is from an older save version, and will be rewritten in the new one on its next save. */
export function storedIsOlder(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    const stored: unknown = JSON.parse(storage.getItem(cafeKey()) ?? 'null');
    const version = (stored as { version?: unknown } | null)?.version;
    return typeof version === 'number' && version < newSave().version;
  } catch {
    return false;
  }
}
