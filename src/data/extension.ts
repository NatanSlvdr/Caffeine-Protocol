import type { LevelDefinition, RobotPrograms } from '@/domain/types';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import { TABLE_LAYOUT } from '@/domain/layout';
import { countProgramBlocks } from '@/domain/scoring';
import { lessonById } from './campaign/load';
import { extensionSeeds } from './campaign/extension-seeds';
import type { LevelSeed } from './campaign/extension-seeds';
import { extensionSeed } from './campaign/generators/extensionCustomers';
import {
  collectBuiltExtensionErrors,
  extensionAct,
  extensionActiveTables,
  extensionServiceForLevel,
  validateExtensionSeedData,
  validateLessonData,
  validateLevelData,
} from './campaign/validate';

/** Query reference solution for extension shifts (the Act I finale). */
const queryReference = lessonById('L14').solution;

/** Escape a literal omission so it can anchor a line matcher. */
function escapeRegExp(needle: string): string {
  return needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function referencePrograms(level: number): RobotPrograms {
  return {
    query: queryReference,
    prep: preparationSource(level, level >= 21 ? 2 : 1),
    floor: floorSource(
      level,
      level >= 29 ? 2 : 1,
      level >= 31 ? TABLE_LAYOUT.length : level >= 29 ? 4 : level >= 24 ? 2 : 1,
    ),
  };
}

/** Non-comment source lines in one program; mirrors scoring.countProgramBlocks. */
function codeLines(source: string): number {
  return source.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;
}

/**
 * Measured size of the reference solution across unlocked robots.
 * `block_target` is the two-star threshold (reference plus star margin);
 * `reference_block_count` is the reference itself, computed with the same
 * counter the scorer uses for player programs.
 */
export function referenceBlockCount(level: number): number {
  const programs = referencePrograms(level);
  return countProgramBlocks(programs, codeLines(programs.query), level);
}
export const extensionLevels: LevelDefinition[] = extensionSeeds.map(buildExtensionLevel);

/** Derive a playable shift from one seed: no code edits needed for L33 and beyond. */
export function buildExtensionLevel(seed: LevelSeed): LevelDefinition {
  const level = Number(seed.id.slice(1));
  const seeds = [0, 1, 2].map((s) => extensionSeed(level, s));
  return {
    id: seed.id,
    title: `Level ${level}: ${seed.title}`,
    summary: seed.note,
    programming_enabled: true,
    block_target: seed.blocks,
    instruction_target: seed.instructions,
    reference_block_count: referenceBlockCount(level),
    seeds,
    active_tables: extensionActiveTables(level),
    service: extensionServiceForLevel(level),
    act: extensionAct(level),
  };
}
export const extensionLessons = extensionSeeds.map(buildExtensionLesson);

/** Derive starters (with one TODO omission) and solutions from one seed. */
export function buildExtensionLesson(seed: LevelSeed) {
  const level = Number(seed.id.slice(1)),
    role = level < 23 ? 'prep' : 'floor',
    programs = referencePrograms(level),
    starter = { ...programs };
  starter[role] = starter[role].replace(
    new RegExp(`^${escapeRegExp(seed.omission)}[^\\n]*$`, 'm'),
    `# TODO: ${seed.omission}`,
  );
  if (level >= 31) {
    starter.query = lessonById('L03').solution;
    starter.prep = programs.prep.replace('ADD SUGAR', '# TODO: apply requested sugar');
  }
  return {
    note: seed.note,
    starter: starter.query,
    solution: programs.query,
    robotStarter: starter,
    robotSolution: programs,
  };
}

/** Every assembled extension shift satisfies the shared invariants before play or build. */
for (const seed of extensionSeeds) {
  const seedErrors = validateExtensionSeedData(seed);
  if (seedErrors.length) throw new Error(`Invalid extension seed ${seed.id}: ${seedErrors[0]}`);
}
extensionLevels.forEach((level, index) => {
  const seed = extensionSeeds[index],
    lesson = extensionLessons[index],
    levelNumber = Number(seed.id.slice(1));
  const errors = [
    ...validateLevelData(level),
    ...validateLessonData(lesson),
    ...collectBuiltExtensionErrors({ levelNumber, level, lesson, seed }),
  ];
  if (errors.length) throw new Error(`Invalid extension shift ${seed.id}: ${errors[0]}`);
});
