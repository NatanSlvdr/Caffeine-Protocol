import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { memoryById } from '../../../src/data/memories';
import { starTotal } from '../../../src/state/GameStore';
import {
  completeLevel,
  incomingRobotPrograms,
  keepMemory,
  newSave,
  parseSave,
  projectMemory,
  resetRobotPrograms,
  saveRobotDraft,
} from '../../../src/features/campaign/save/persistence';
import type { ProgressSave, RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';

const memory = memoryById('day-one')!;
/** The memory plays in the place of the shift whose tools it borrows. */
const SLOT = UNLOCKS.sugar - 1;
const catalog = lessons.map((lesson, index) => (index === SLOT ? memory.lesson : lesson));
const own = (query: string): RobotPrograms => ({ query, prep: '', floor: '' });

/** A café well into the campaign, with routines of its own on the shifts either side of the memory's. */
function midway(): ProgressSave {
  const save = newSave();
  return {
    ...save,
    selected: 9,
    unlocked: 9,
    stars: Object.fromEntries(Array.from({ length: 9 }, (_, index) => [index, 2])),
    drafts: { [SLOT]: `# Mine\n${lessons[SLOT].solution}` },
    solutions: { [SLOT - 1]: lessons[SLOT - 1].solution, [SLOT]: lessons[SLOT].solution },
    robotDrafts: { [SLOT]: own(`# Mine\n${lessons[SLOT].solution}`), 9: referencePrograms(10) },
    robotSolutions: { [SLOT - 1]: own(lessons[SLOT - 1].solution), [SLOT]: own(lessons[SLOT].solution) },
    challenges: { [SLOT]: ['walk'] },
  };
}

/** What the workspace does through the memory's update: project, change, keep. */
const through = (save: ProgressSave, change: (save: ProgressSave) => ProgressSave) =>
  keepMemory(change(projectMemory(save, memory.id, SLOT)), save, memory.id, SLOT);

describe('a memory’s progress in the save', () => {
  it('opens on the memory’s own routine, never the café’s, and goes back to it', () => {
    const projected = projectMemory(midway(), memory.id, SLOT);
    expect(incomingRobotPrograms(projected, SLOT, catalog)).toEqual(own(memory.lesson.starter));
    expect(resetRobotPrograms(projected, SLOT, catalog).query).toBe(memory.lesson.starter);
    expect(projected.stars).toEqual({});
    expect(projected).not.toHaveProperty('challenges');
  });

  it('keeps a draft with the memory, and leaves the campaign exactly as it was', () => {
    const save = midway();
    const draft = own(memory.lesson.solution);
    const kept = through(save, (s) => saveRobotDraft(s, SLOT, draft));
    expect(kept.memories).toEqual({ 'day-one': { draft } });
    expect({ ...kept, memories: undefined }).toEqual({ ...save, memories: undefined });
    expect(incomingRobotPrograms(projectMemory(kept, memory.id, SLOT), SLOT, catalog)).toEqual(draft);
  });

  it('keeps a played memory’s stars apart from the campaign’s, unlocking nothing', () => {
    const save = midway();
    const programs = own(memory.lesson.solution);
    const played = through(save, (s) => ({
      ...completeLevel(s, SLOT, 3, programs.query, catalog, ['wait']),
      robotSolutions: { ...s.robotSolutions, [SLOT]: programs },
    }));
    expect(played.memories).toEqual({ 'day-one': { solution: programs, stars: 3, challenges: ['wait'] } });
    expect(played.unlocked).toBe(save.unlocked);
    expect(played.stars).toEqual(save.stars);
    expect(starTotal(played.stars)).toBe(starTotal(save.stars));
    expect(played.challenges).toEqual(save.challenges);
    expect(played.solutions).toEqual(save.solutions);
    // Played again for fewer stars, the best is kept.
    const again = through(played, (s) => completeLevel(s, SLOT, 1, programs.query, catalog));
    expect(again.memories?.['day-one'].stars).toBe(3);
  });

  it('lets a settings change made in a memory through to the café', () => {
    const kept = through(midway(), (s) => ({ ...s, settings: { ...s.settings, pixel_art: false } }));
    expect(kept.settings.pixel_art).toBe(false);
    expect(kept).not.toHaveProperty('memories');
  });

  it('round-trips through an export, keeping memories a later version may have dropped', () => {
    const save = {
      ...midway(),
      memories: {
        'day-one': { draft: own(memory.lesson.starter), stars: 2 },
        'a-retired-memory': { stars: 1 },
      },
    };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it.each([
    ['a list', [], 'Invalid memories.'],
    ['an id that is not a word', { 'Day One!': { stars: 1 } }, 'Invalid memories.'],
    ['stars past three', { 'day-one': { stars: 4 } }, 'Invalid star count.'],
  ])('turns away %s', (_, memories, message) => {
    expect(() => parseSave(JSON.stringify({ ...midway(), memories }), lessons)).toThrow(message);
  });
});
