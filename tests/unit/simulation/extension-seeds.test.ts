import { describe, expect, it } from 'vitest';
import { buildExtensionLesson, buildExtensionLevel, referencePrograms } from '../../../src/data/extension';
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
});
