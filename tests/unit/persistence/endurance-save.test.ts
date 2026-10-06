import { describe, expect, it } from 'vitest';
import { lessons, CAMPAIGN_LENGTH } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { longDay } from '../../../src/data/longDay';
import {
  completeLevel,
  incomingRobotPrograms,
  keepEndurance,
  newSave,
  parseSave,
  projectEndurance,
  saveRobotDraft,
  servedWave,
  startDay,
  waveOpen,
} from '../../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../../src/domain/types';

const SLOT = CAMPAIGN_LENGTH;
const { version } = longDay;
const last = referencePrograms(CAMPAIGN_LENGTH);

function finished(): ProgressSave {
  const all = Array.from({ length: CAMPAIGN_LENGTH }, (_, index) => index);
  return {
    ...newSave(),
    selected: CAMPAIGN_LENGTH - 1,
    unlocked: CAMPAIGN_LENGTH - 1,
    complete: true,
    stars: Object.fromEntries(all.map((index) => [index, 2])),
    robotSolutions: { [CAMPAIGN_LENGTH - 1]: { ...last, floor: `# Mine\n${last.floor}` } },
    specials: { together: { stars: 1 } },
  };
}

/** What the workspace does through a wave's update: project, change, keep. */
const through = (save: ProgressSave, wave: number, change: (save: ProgressSave) => ProgressSave) =>
  keepEndurance(change(projectEndurance(save, wave, SLOT)), save, wave, SLOT);
const serve = (save: ProgressSave, wave: number, stars: number) => {
  const { lesson } = longDay.waves[wave - 1];
  const catalog = [...lessons, lesson];
  const kept = through(save, wave, (s) => ({
    ...completeLevel(s, SLOT, stars, lesson.solution, catalog),
    robotSolutions: { ...s.robotSolutions, [SLOT]: lesson.robotSolution },
  }));
  return servedWave(kept, wave, longDay.waves.length);
};

describe('the Long Day in the save', () => {
  it('opens a day on its first wave, on the routines the campaign’s last shift was served with', () => {
    const save = startDay(finished(), version);
    expect(save.endurance).toEqual({ version, wave: 1 });
    const catalog = [...lessons, longDay.waves[0].lesson];
    const programs = incomingRobotPrograms(projectEndurance(save, 1, SLOT), SLOT, catalog);
    expect(programs.floor).toBe(save.robotSolutions[CAMPAIGN_LENGTH - 1].floor);
  });

  it('keeps one set of routines for the day, and each wave’s stars apart', () => {
    let save = startDay(finished(), version);
    const draft = { ...last, query: `# All day\n${last.query}` };
    save = through(save, 1, (s) => saveRobotDraft(s, SLOT, draft));
    expect(save.endurance?.draft).toEqual(draft);
    // The next wave opens on the same draft.
    expect(projectEndurance(save, 2, SLOT).robotDrafts[SLOT]).toEqual(draft);

    save = serve(save, 1, 3);
    expect(save.endurance).toMatchObject({ wave: 2, best: 1, stars: { 1: 3 } });
    save = serve(save, 2, 2);
    expect(save.endurance).toMatchObject({ wave: 3, best: 2, stars: { 1: 3, 2: 2 } });
    expect(projectEndurance(save, 2, SLOT).stars[SLOT]).toBe(2);
    expect(projectEndurance(save, 3, SLOT).stars[SLOT]).toBeUndefined();

    // The campaign and the specials are as they were.
    const before = finished();
    expect({ ...save, endurance: undefined }).toEqual({ ...before, endurance: undefined });
  });

  it('moves the day on only from the wave it is on, and closes it after the last', () => {
    let save = startDay(finished(), version);
    save = serve(save, 1, 3);
    // Wave 1 again, from behind the day, moves nothing.
    expect(serve(save, 1, 1).endurance).toMatchObject({ wave: 2, best: 1, stars: { 1: 3 } });
    save = { ...save, endurance: { ...save.endurance!, wave: 6 } };
    save = serve(save, 6, 2);
    expect(save.endurance?.wave).toBeUndefined();
    expect(save.endurance?.best).toBe(6);
  });

  it('starts over from the first wave with the stars kept, unless the waves have changed', () => {
    const played: ProgressSave = {
      ...finished(),
      endurance: { version, wave: 4, best: 3, stars: { 1: 3, 2: 2, 3: 1 }, draft: last, solution: last },
    };
    expect(startDay(played, version).endurance).toEqual({ ...played.endurance, wave: 1 });
    expect(startDay(played, version + 1).endurance).toEqual({
      version: version + 1,
      wave: 1,
      draft: last,
      solution: last,
    });
  });

  it('opens the day’s wave and any served before, on the waves as they are', () => {
    const save = { endurance: { version, wave: 4, best: 3 } };
    expect([1, 3, 4, 5].map((wave) => waveOpen(save, wave, version))).toEqual([true, true, true, false]);
    expect(waveOpen(save, 4, version + 1)).toBe(false);
    expect(waveOpen(save, Number.NaN, version)).toBe(false);
    expect(waveOpen({}, 1, version)).toBe(false);
  });

  it('comes back through an export, and turns a damaged one away', () => {
    const save: ProgressSave = {
      ...finished(),
      endurance: { version, wave: 2, best: 1, stars: { 1: 3 }, draft: last },
    };
    expect(parseSave(JSON.stringify(save), lessons).endurance).toEqual(save.endurance);
    for (const endurance of [
      { version: 0 },
      { version, wave: 0 },
      { version, best: 1.5 },
      { version, stars: { 1: 4 } },
      { version, stars: { first: 1 } },
      { version, draft: { query: 1 } },
    ])
      expect(() => parseSave(JSON.stringify({ ...save, endurance }), lessons)).toThrow();
  });
});
