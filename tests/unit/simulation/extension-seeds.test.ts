import { describe, expect, it } from 'vitest';
import { buildExtensionLesson, buildExtensionLevel, referencePrograms } from '../../../src/data/extension';
import { lessons } from '../../../src/data';
import { completeLevel, newSave, parseSave } from '../../../src/features/campaign/save/persistence';
import type { LessonCatalog } from '../../../src/features/campaign/save/migration';
import type { LevelSeed } from '../../../src/data/campaign/extension-seeds';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';

/** A synthetic L33 proves new shifts are data-only: builders derive everything. */
const seed33: LevelSeed = {
  id: 'L33',
  title: 'The whole café is busier',
  note: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing at full volume.',
  omission: 'SERVE',
  blocks: 420,
  instructions: 5200,
};

describe('extension seeds', () => {
  it('derives a playable L33 from one seed plus one narrative row', () => {
    const level = buildExtensionLevel(seed33);
    expect(level.id).toBe('L33');
    expect(level.title).toBe('Level 33: The whole café is busier');
    expect(level.block_target).toBe(420);
    expect(level.instruction_target).toBe(5200);
    expect(level.seeds).toHaveLength(3);
    expect(level.seeds[0].id).toBe('L33_A');
    const lesson = buildExtensionLesson(seed33);
    expect(lesson.note).toBe(seed33.note);
    expect(lesson.robotStarter.floor).toContain('# TODO: SERVE');
    const programs = referencePrograms(33);
    const result = runLevel(level, compileProgram(programs.query), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed).toBe(true);
  });
  it('keeps an L32-complete save importable after appending L33', () => {
    const final = lessons.length - 1;
    const l32Complete = completeLevel(newSave(), final, 3, '', lessons);
    expect(l32Complete.complete).toBe(true);
    expect(l32Complete.unlocked).toBe(final);
    // Synthetic 33-shift catalog: every existing shift plus one appended finale.
    const catalog33: LessonCatalog = {
      ...lessons,
      length: lessons.length + 1,
      [lessons.length]: { starter: lessons[final].starter },
    };
    const restored = parseSave(JSON.stringify(l32Complete), catalog33);
    expect(restored.stars).toEqual(l32Complete.stars);
    expect(restored.solutions).toEqual(l32Complete.solutions);
    expect(restored.drafts).toEqual(l32Complete.drafts);
    expect(restored.complete).toBe(true);
    expect(restored.selected).toBe(l32Complete.selected);
    // L33 becomes the next playable shift while earlier progress is preserved.
    expect(restored.unlocked).toBe(lessons.length);
    const finale = completeLevel(restored, lessons.length, 3, '', catalog33);
    expect(finale.complete).toBe(true);
    expect(finale.unlocked).toBe(lessons.length);
  });
});
