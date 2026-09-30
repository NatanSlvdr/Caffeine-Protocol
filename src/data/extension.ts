import type { LevelDefinition, RobotPrograms, ServiceConfig } from '@/domain/types';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import { countProgramBlocks } from '@/domain/scoring';
import { ROBOT_UNLOCK_LEVELS } from '@/domain/robots';
import { lessonById } from './campaign/load';
import { extensionSeeds } from './campaign/extension-seeds';
import type { LevelSeed } from './campaign/extension-seeds';
import { extensionShiftConfig } from './campaign/extension-config';
import { extensionSeed } from './campaign/generators/extensionCustomers';
import {
  collectBuiltExtensionErrors,
  validateExtensionSeedData,
  validateLessonData,
  validateLevelData,
} from './campaign/validate';

/** Query reference solution for extension shifts (the Act I finale). */
const queryReference = lessonById('L08').solution;

/** The line runs `command`, perhaps with operands after it (Move up 2). */
const isCommand = (line: string, command: string) => {
  const code = line.trim();
  return code === command || code.startsWith(`${command} `);
};

/** Swap the nth line running `command` for a TODO comment. */
function omitLine(source: string, command: string, occurrence: number, todo: string): string {
  let seen = 0;
  const lines = source
    .split('\n')
    .map((line) => (isCommand(line, command) && ++seen === occurrence ? `# TODO: ${todo}` : line));
  if (seen < occurrence)
    throw new Error(`Starter omission "${command}" #${occurrence} is not in the reference program.`);
  return lines.join('\n');
}

export function referencePrograms(level: number): RobotPrograms {
  const config = extensionShiftConfig(level);
  return {
    query: queryReference,
    prep: preparationSource(level, config.prepBatch),
    floor: floorSource(level, config.floorBatch),
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

/** Derive a playable shift from one seed: no code edits needed for L22 and beyond. */
export function buildExtensionLevel(seed: LevelSeed): LevelDefinition {
  const level = Number(seed.id.slice(1)),
    config = extensionShiftConfig(level);
  const service: ServiceConfig = {
    prepCapacity: config.prepBatch,
    floorCapacity: config.floorBatch,
    clearing: true,
    objective: 'serve',
    minLoad: config.minLoad,
  };
  const active_tables = config.tables;
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
    active_tables,
    service,
    act: level < ROBOT_UNLOCK_LEVELS.floor ? 2 : config.fullHouse ? 4 : 3,
  };
}
export const extensionLessons = extensionSeeds.map(buildExtensionLesson);

/** Derive starters (with one TODO omission) and solutions from one seed. */
export function buildExtensionLesson(seed: LevelSeed) {
  const level = Number(seed.id.slice(1)),
    config = extensionShiftConfig(level),
    role = seed.robot ?? (level < ROBOT_UNLOCK_LEVELS.floor ? 'prep' : 'floor'),
    programs = referencePrograms(level),
    starter = { ...programs };
  starter[role] = omitLine(starter[role], seed.omission, seed.occurrence ?? 1, seed.todo ?? seed.omission);
  if (config.fullHouse) {
    starter.query = lessonById('L02').solution;
    starter.prep = omitLine(programs.prep, 'STORE var1 FROM sugar', 1, 'store the order’s sugar in Var A');
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
