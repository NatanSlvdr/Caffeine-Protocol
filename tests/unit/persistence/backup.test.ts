import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import {
  backupKey,
  SAVE_KEY,
  backupSave,
  newSave,
  readBackup,
  storedIsOlder,
  untouched,
} from '../../../src/features/campaign/save/persistence';
import saveV1 from '../../fixtures/save-v1.json';

const storage = (entries: Record<string, string> = {}) => {
  const map = new Map(Object.entries(entries));
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map };
};
const played = { ...newSave(), unlocked: 3, stars: { 0: 0, 1: 3, 2: 2 } };
const now = new Date('2026-10-04T16:00:00Z');

describe('the kept copy of a café', () => {
  it('keeps the stored café, reads it back, and says what replaced it and when', () => {
    const store = storage({ [SAVE_KEY]: JSON.stringify(played) });
    expect(backupSave(store, 'import', lessons, now)).toBe(true);
    expect(readBackup(store, lessons)).toEqual({ reason: 'import', saved_at: now.toISOString(), save: played });
  });

  it('keeps one copy only, the latest', () => {
    const store = storage({ [SAVE_KEY]: JSON.stringify(played) });
    backupSave(store, 'import', lessons, now);
    store.setItem(SAVE_KEY, JSON.stringify({ ...played, unlocked: 4 }));
    backupSave(store, 'reset', lessons, now);
    expect(readBackup(store, lessons)?.reason).toBe('reset');
    expect(readBackup(store, lessons)?.save.unlocked).toBe(4);
    expect([...store.map.keys()].sort()).toEqual([backupKey(), SAVE_KEY].sort());
  });

  it('never pushes out a good copy with a damaged or untouched café', () => {
    const store = storage({ [SAVE_KEY]: JSON.stringify(played) });
    backupSave(store, 'import', lessons, now);
    store.setItem(SAVE_KEY, '{broken');
    expect(backupSave(store, 'reset', lessons, now)).toBe(false);
    store.setItem(SAVE_KEY, JSON.stringify({ ...newSave(), settings: { ...newSave().settings, music: 0 } }));
    expect(backupSave(store, 'reset', lessons, now)).toBe(false);
    expect(readBackup(store, lessons)?.save).toEqual(played);
  });

  it('keeps nothing when there is nothing stored, and a full storage just means no copy', () => {
    expect(backupSave(storage(), 'reset', lessons, now)).toBe(false);
    const full = {
      getItem: () => JSON.stringify(played),
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(backupSave(full, 'reset', lessons, now)).toBe(false);
  });

  it('reads a damaged or foreign copy as none', () => {
    for (const kept of ['{broken', '42', JSON.stringify({ reason: 'whim', saved_at: now.toISOString(), raw: '{}' })])
      expect(readBackup(storage({ [backupKey()]: kept }), lessons)).toBeNull();
    const damaged = JSON.stringify({ reason: 'import', saved_at: now.toISOString(), raw: '{broken' });
    expect(readBackup(storage({ [backupKey()]: damaged }), lessons)).toBeNull();
  });

  it('migrates an old copy as it reads it', () => {
    const store = storage({ [SAVE_KEY]: JSON.stringify(saveV1) });
    expect(storedIsOlder(store)).toBe(true);
    backupSave(store, 'migration', lessons, now);
    expect(readBackup(store, lessons)?.save.version).toBe(4);
    expect(storedIsOlder(storage({ [SAVE_KEY]: JSON.stringify(played) }))).toBe(false);
    expect(storedIsOlder(storage({ [SAVE_KEY]: '{broken' }))).toBe(false);
  });

  it('counts a café nobody has played in as untouched, whatever its settings', () => {
    expect(untouched(newSave({ ...newSave().settings, music: 0 }))).toBe(true);
    expect(untouched(played)).toBe(false);
    expect(untouched({ ...newSave(), story: { 0: true } })).toBe(false);
    expect(untouched({ ...newSave(), robotDrafts: { 0: { prep: '', floor: '' } } } as never)).toBe(false);
  });
});
