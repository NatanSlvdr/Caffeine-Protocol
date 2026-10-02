import { describe, it, expect } from 'vitest';
import {
  completeLevel,
  incomingRobotPrograms,
  newSave,
  parseSave,
  readSave,
  resetRobotPrograms,
  saveRobotDraft,
  writeSave,
} from '../../../src/features/campaign/save/persistence';
import { lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { UNLOCKS } from '../../../src/domain/unlocks';

/** Zero-based index of the shift where each robot arrives. */
const BREW = UNLOCKS.prep - 1,
  PORTER = UNLOCKS.floor - 1,
  FINAL = lessons.length - 1;

describe('version 4 campaign saves', () => {
  it.each([1, 2])(
    'resets incompatible Query programs from version %i while preserving unlocks and settings',
    (version) => {
      // The old eleventh shift ("the usual") is the new eighth.
      const source = 'LISTEN\nEACH\nITEM heard\nSUGAR heard\nEND';
      const save = {
        ...newSave(),
        version,
        selected: 10,
        unlocked: 10,
        drafts: { 10: source },
        solutions: { 10: source },
        stars: { 10: 2 },
        story: { 10: true },
        robotDrafts: { 10: { query: source, prep: '', floor: '' } },
        robotSolutions: { 10: { query: source, prep: '', floor: '' } },
      };
      const migrated = parseSave(JSON.stringify(save), lessons);
      expect(migrated.version).toBe(4);
      expect(migrated.unlocked).toBe(7);
      expect(migrated.selected).toBe(7);
      expect(migrated.drafts).toEqual({});
      expect(migrated.solutions).toEqual({});
      expect(migrated.robotSolutions).toEqual({});
      expect(migrated.robotDrafts[7].query).toBe(lessons[7].starter);
      expect(migrated.stars).toEqual({});
      expect(migrated.story).toEqual({});
      expect(migrated.settings).toEqual(save.settings);
    },
  );
  it('keeps kitchen and floor routines, in the shared words, when resetting Query in later acts', () => {
    const programs = { query: 'LISTEN\nITEM heard', prep: 'WAIT TICKET\nCALL recipe', floor: 'WAIT DRINK\nTAKE DOWN' };
    const current = { prep: 'LISTEN\nCALL recipe', floor: 'LISTEN\nTAKE DOWN' };
    // The old 24th shift is Porter's first in the 21-shift campaign; 22 opened The Floor Robot.
    const save = {
      ...newSave(),
      version: 2,
      selected: 23,
      unlocked: 23,
      robotDrafts: { 23: programs },
      robotSolutions: { 23: programs },
      stars: { 13: 3, 23: 2 },
      story: { 7: true, 22: true },
    };
    const migrated = parseSave(JSON.stringify(save), lessons);
    expect(migrated.robotDrafts[PORTER]).toEqual({ ...current, query: lessons[PORTER].starter });
    expect(migrated.robotSolutions[PORTER].prep).toBe(current.prep);
    expect(migrated.robotSolutions[PORTER].floor).toBe(current.floor);
    expect(migrated.stars).toEqual({ [PORTER]: 2 });
    expect(migrated.story).toEqual({ [PORTER]: true });
    expect(parseSave(JSON.stringify(migrated), lessons)).toEqual(migrated);
  });
  it('moves a 32-shift save onto the 21 shifts, keeping only work on shifts that play the same', () => {
    const programs = { query: 'LISTEN', prep: 'LISTEN\nCALL recipe', floor: 'LISTEN\nTAKE DOWN' };
    const save = {
      ...newSave(),
      version: 3,
      selected: 24,
      unlocked: 25,
      // Old shifts 6 (sugar) and 13 (the lunch crunch) were merged away.
      stars: { 0: 0, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 8: 3, 9: 3, 10: 3, 13: 3, 16: 1, 20: 3, 23: 3, 24: 3 },
      story: { 0: true, 2: true, 14: true, 21: true, 22: true },
      robotSolutions: { 20: programs, 21: programs },
      robotDrafts: { 25: programs },
    };
    const migrated = parseSave(JSON.stringify(save), lessons);
    expect(migrated.version).toBe(4);
    // Porter's clearing shift (old 26) is next; the old 25th was merged into Porter's first.
    expect(migrated.unlocked).toBe(PORTER + 1);
    expect(migrated.selected).toBe(PORTER + 1);
    expect(migrated.stars).toEqual({ 0: 0, 1: 3, 2: 3, 3: 3, 4: 2, 5: 3, 6: 3, 7: 3, 8: 1, 12: 3, 13: 3 });
    expect(migrated.story).toEqual({ 0: true, 1: true, [BREW]: true, 12: true, 13: true });
    expect(Object.keys(migrated.robotSolutions)).toEqual(['12']);
    expect(Object.keys(migrated.robotDrafts)).toEqual([String(PORTER + 1)]);
    expect(migrated.robotSolutions[12].query).toBe('LISTEN');
    expect(parseSave(JSON.stringify(migrated), lessons)).toEqual(migrated);
  });
  it('opens the new Act IV for a save that finished the 32-shift campaign', () => {
    const stars = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, 3]));
    const save = { ...newSave(), version: 3, selected: 31, unlocked: 31, complete: true, stars };
    const migrated = parseSave(JSON.stringify(save), lessons);
    expect(migrated.unlocked).toBe(UNLOCKS.floor + 2);
    expect(migrated.selected).toBe(UNLOCKS.floor + 2);
    expect(migrated.complete).toBe(false);
    expect(Object.keys(migrated.stars)).toHaveLength(UNLOCKS.floor + 2);
  });
  it('keeps the non-charging path when importing an old Porter routine', () => {
    const source =
      '# my route\nWAIT DRINK\nIF BATTERY < 40\nMOVE LEFT 2\nCHARGE\nMOVE RIGHT 2\nELSE\nTAKE DOWN\nEND\nSERVE';
    const save = { ...newSave(), robotDrafts: { 0: { query: 'LISTEN', prep: '', floor: source } } };
    const restored = parseSave(JSON.stringify(save), lessons);
    expect(restored.robotDrafts[0].floor).toBe('# my route\nLISTEN\nTAKE DOWN\nDEPOSIT UP');
  });
  it('keeps Act II unlocked for completed legacy Act I', () => {
    const legacy = {
      ...newSave(),
      version: 1,
      selected: 13,
      unlocked: 13,
      complete: true,
      solutions: { 13: 'ITEM heard' },
    };
    const migrated = parseSave(JSON.stringify(legacy), lessons);
    expect(migrated.unlocked).toBe(BREW);
    expect(migrated.complete).toBe(false);
    expect(migrated.solutions).toEqual({});
    expect(incomingRobotPrograms(migrated, BREW, lessons).prep).toContain('TODO');
  });
  it('keeps independent role drafts and solutions across reload', () => {
    let save = completeLevel(newSave(), PORTER, 3, '', lessons);
    const programs = { query: 'LISTEN', prep: 'MOVE UP 2', floor: 'MOVE DOWN 3' };
    save = saveRobotDraft(save, PORTER, programs);
    save.robotSolutions[PORTER] = referencePrograms(PORTER + 1);
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    expect(writeSave(adapter, save)).toBe('');
    const restored = readSave(adapter, lessons).save;
    expect(restored).toEqual(save);
    expect(incomingRobotPrograms(restored, PORTER + 1, lessons)).toEqual(save.robotSolutions[PORTER]);
  });
  it('remembers the text editor choice and keeps blocks for saves made before it', () => {
    const oldSave = newSave();
    delete (oldSave.settings as Partial<typeof oldSave.settings>).text_editor;
    expect(parseSave(JSON.stringify(oldSave), lessons).settings.text_editor).toBe(false);
    const textSave = { ...newSave(), settings: { ...newSave().settings, text_editor: true } };
    expect(parseSave(JSON.stringify(textSave), lessons).settings.text_editor).toBe(true);
  });
  it('keeps the playback speed, opening older saves at 1×', () => {
    const oldSave = newSave();
    delete (oldSave.settings as Partial<typeof oldSave.settings>).speed;
    expect(parseSave(JSON.stringify(oldSave), lessons).settings.speed).toBe(1);
    const fast = { ...newSave(), settings: { ...newSave().settings, speed: 4.5 } };
    expect(parseSave(JSON.stringify(fast), lessons).settings.speed).toBe(4.5);
    for (const speed of [0, 99, '4'])
      expect(() =>
        parseSave(JSON.stringify({ ...newSave(), settings: { ...newSave().settings, speed } }), lessons),
      ).toThrow('Invalid playback speed.');
  });
  it('enables pixel art when loading saves created before the display option existed', () => {
    const oldSave = newSave();
    delete (oldSave.settings as Partial<typeof oldSave.settings>).pixel_art;
    expect(parseSave(JSON.stringify(oldSave), lessons).settings.pixel_art).toBe(true);
    expect(() =>
      parseSave(JSON.stringify({ ...newSave(), settings: { ...newSave().settings, pixel_art: 'yes' } }), lessons),
    ).toThrow('Invalid display setting.');
  });
  it('introduces Porter with a starter while preserving Query and Brew', () => {
    const save = completeLevel(newSave(), PORTER - 1, 3, '', lessons);
    save.robotSolutions[PORTER - 1] = { ...referencePrograms(PORTER), query: '# custom Query', prep: '# custom Brew' };
    const next = incomingRobotPrograms(save, PORTER, lessons);
    expect(next.query).toBe('# custom Query');
    expect(next.prep).toBe('# custom Brew');
    expect(next.floor).toContain('TODO');
  });
  it('resets the Query program past its own draft to the incoming one', () => {
    const save = saveRobotDraft(newSave(), PORTER, { query: '# edited', prep: '# edited', floor: '# edited' });
    const fresh = incomingRobotPrograms(newSave(), PORTER, lessons);
    expect(incomingRobotPrograms(save, PORTER, lessons).query).toBe('# edited');
    expect(resetRobotPrograms(save, PORTER, lessons)).toEqual(fresh);
  });
  it(`unlocks the new acts and completes only at shift ${lessons.length}`, () => {
    expect(completeLevel(newSave(), BREW - 1, 3, '', lessons).complete).toBe(false);
    const end = completeLevel(newSave(), FINAL, 3, '', lessons);
    expect(end.complete).toBe(true);
    expect(end.unlocked).toBe(FINAL);
    expect(parseSave(JSON.stringify(end), lessons)).toEqual(end);
  });
  it('keeps a finished save readable after a shift is appended', () => {
    const expandedLessons = [...lessons, lessons[FINAL]];
    const completed = completeLevel(newSave(), FINAL, 3, '', lessons);
    const migrated = parseSave(JSON.stringify(completed), expandedLessons);
    expect(migrated.unlocked).toBe(FINAL + 1);
    expect(migrated.complete).toBe(false);
    expect(migrated.stars[FINAL]).toBe(3);
    expect(parseSave(JSON.stringify(migrated), expandedLessons)).toEqual(migrated);
    const completedNewShift = completeLevel(migrated, FINAL + 1, 3, '', expandedLessons);
    expect(completedNewShift.complete).toBe(true);
    expect(parseSave(JSON.stringify(completedNewShift), expandedLessons)).toEqual(completedNewShift);
  });
  it('rejects malformed role data and out-of-range shifts without replacing storage', () => {
    for (const value of [
      { ...newSave(), robotDrafts: { [BREW]: { query: 'LISTEN', prep: 2, floor: '' } } },
      { ...newSave(), robotSolutions: { [lessons.length]: referencePrograms(lessons.length) } },
      { ...newSave(), complete: true },
      { ...newSave(), version: 3, unlocked: 32, selected: 0 },
    ])
      expect(() => parseSave(JSON.stringify(value), lessons)).toThrow();
  });
});
