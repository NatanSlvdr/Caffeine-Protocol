import { describe, expect, it } from 'vitest';
import { lessons, CAMPAIGN_LENGTH } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { specialById } from '../../../src/data/specials';
import { starTotal } from '../../../src/state/GameStore';
import {
  completeLevel,
  incomingRobotPrograms,
  keepSpecial,
  newSave,
  parseSave,
  projectSpecial,
  saveRobotDraft,
} from '../../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../../src/domain/types';

const SLOT = CAMPAIGN_LENGTH;
const special = specialById('together')!;
const catalog = [...lessons, special.lesson];
const last = referencePrograms(CAMPAIGN_LENGTH);

/** A café that has served the whole campaign, with its own routines on the last shift. */
function finished(): ProgressSave {
  const save = newSave();
  const all = Array.from({ length: CAMPAIGN_LENGTH }, (_, index) => index);
  return {
    ...save,
    selected: CAMPAIGN_LENGTH - 1,
    unlocked: CAMPAIGN_LENGTH - 1,
    complete: true,
    stars: Object.fromEntries(all.map((index) => [index, 2])),
    robotSolutions: { [CAMPAIGN_LENGTH - 1]: { ...last, floor: `# Mine\n${last.floor}` } },
  };
}

/** What the workspace does through the special's update: project, change, keep. */
const through = (save: ProgressSave, change: (save: ProgressSave) => ProgressSave) =>
  keepSpecial(change(projectSpecial(save, special.id, SLOT)), save, special.id, SLOT);

describe('a special’s progress in the save', () => {
  it('opens on the routines the campaign’s last shift was served with', () => {
    const save = finished();
    const programs = incomingRobotPrograms(projectSpecial(save, special.id, SLOT), SLOT, catalog);
    expect(programs.floor).toBe(save.robotSolutions[CAMPAIGN_LENGTH - 1].floor);
    expect(programs.query).toBe(last.query);
  });

  it('keeps a draft with the special, and none in the campaign’s maps', () => {
    const save = finished();
    const draft = { ...last, query: `# Reading group\n${last.query}` };
    const kept = through(save, (s) => saveRobotDraft(s, SLOT, draft));
    expect(kept.specials).toEqual({ together: { draft } });
    expect(kept.selected).toBe(save.selected);
    expect({ ...kept, specials: undefined }).toEqual({ ...save, specials: undefined });
    expect(projectSpecial(kept, special.id, SLOT).robotDrafts[SLOT]).toEqual(draft);
  });

  it('keeps a served special’s stars apart from the campaign’s, unlocking nothing', () => {
    const save = finished();
    const programs = special.lesson.robotSolution;
    const served = through(save, (s) => ({
      ...completeLevel(s, SLOT, 3, programs.query, catalog, ['wait']),
      robotSolutions: { ...s.robotSolutions, [SLOT]: programs },
    }));
    expect(served.specials).toEqual({ together: { solution: programs, stars: 3, challenges: ['wait'] } });
    expect(served.unlocked).toBe(save.unlocked);
    expect(served.stars).toEqual(save.stars);
    expect(starTotal(served.stars)).toBe(starTotal(save.stars));
    expect(served).not.toHaveProperty('challenges');
    // Served again for fewer stars, the best is kept.
    const again = through(served, (s) => completeLevel(s, SLOT, 1, programs.query, catalog));
    expect(again.specials?.together.stars).toBe(3);
  });

  it('leaves the campaign’s own challenges and settings changes to the campaign', () => {
    const save = { ...finished(), challenges: { 4: ['walk' as const] } };
    const kept = through(save, (s) => ({ ...s, settings: { ...s.settings, pixel_art: false } }));
    expect(kept.challenges).toEqual({ 4: ['walk'] });
    expect(kept.settings.pixel_art).toBe(false);
    expect(kept).not.toHaveProperty('specials');
  });

  it('round-trips through an export, keeping specials a later version may have dropped', () => {
    const save = {
      ...finished(),
      specials: {
        together: { draft: last, solution: last, stars: 2, challenges: ['wait' as const] },
        'a-retired-special': { stars: 1 },
      },
    };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it('leaves a café that has played none without the map', () => {
    expect(newSave()).not.toHaveProperty('specials');
    expect(parseSave(JSON.stringify({ ...newSave(), specials: { together: {} } }), lessons)).not.toHaveProperty(
      'specials',
    );
  });

  it.each([
    ['a list', [], 'Invalid specials.'],
    ['an id that is not a word', { 'Bound Together!': { stars: 1 } }, 'Invalid specials.'],
    ['stars past three', { together: { stars: 4 } }, 'Invalid star count.'],
    ['a challenge the game doesn’t know', { together: { challenges: ['speed'] } }, 'Invalid specials.'],
    ['routines missing a robot', { together: { draft: { query: '', prep: '' } } }, 'Invalid routine.'],
  ])('turns away %s', (_, specials, message) => {
    expect(() => parseSave(JSON.stringify({ ...finished(), specials }), lessons)).toThrow(message);
  });
});
