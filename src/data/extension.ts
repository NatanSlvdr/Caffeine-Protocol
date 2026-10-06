import type { LevelDefinition, RobotPrograms } from '@/domain/types';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import type { ShiftRules } from '@/domain/defaultPrograms';
import { countProgramBlocks } from '@/domain/scoring';
import { ROBOT_UNLOCK_LEVELS } from '@/domain/robots';
import { lessonById } from './campaign/load';
import { extensionSeeds } from './campaign/extension-seeds';
import type { LevelSeed } from './campaign/extension-seeds';
import { extensionShiftConfig } from './campaign/extension-config';
import type { ExtensionShiftConfig } from './campaign/extension-config';
import { extensionSeed } from './campaign/generators/extensionCustomers';
import {
  collectBuiltExtensionErrors,
  extensionServiceForLevel,
  validateExtensionSeedData,
  validateLessonData,
  validateLevelData,
} from './campaign/validate';

/** The odd rules a shift switches on. */
const rulesFor = (config: ExtensionShiftConfig): ShiftRules => ({
  toGo: config.toGo,
  cups: config.cups > 0,
  rush: config.rush,
  closing: config.closing,
});

/**
 * Query reference for extension shifts: the Act I finale, plus the marks and the stop an Act IV rule
 * needs. Marks go on each sheet just before it's handed over.
 */
export function queryReference(rules: ShiftRules): string {
  const marks = (['togo', 'rush', 'together'] as const).filter(
    (mark) => ({ togo: rules.toGo, rush: rules.rush, together: rules.together })[mark],
  );
  let source = lessonById('L08').solution;
  if (marks.length)
    source = source.replace(
      '  MOVE RIGHT 1\n  DEPOSIT RIGHT',
      [
        ...marks.map((mark) => `  IF ${mark} IN item\n    WRITE ${mark}\n  END`),
        '  MOVE RIGHT 1\n  DEPOSIT RIGHT',
      ].join('\n'),
    );
  if (rules.closing) source = source.replace('LISTEN\n', 'LISTEN\nIF closed IN CUSTOMER SPEECH\n  STOP\nEND\n');
  return source;
}

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

/**
 * Act IV starts each shift from the previous shift's programs, so a rule stays handled once a shift has switched
 * it on: the reference keeps handling every rule the crew has met so far, as a player's carried-forward programs do.
 */
function carriedRules(level: number): ShiftRules {
  const rules = rulesFor(extensionShiftConfig(level));
  if (!extensionShiftConfig(level).fullHouse) return rules;
  for (
    let earlier = level - 1;
    earlier >= ROBOT_UNLOCK_LEVELS.prep && extensionShiftConfig(earlier).fullHouse;
    earlier--
  ) {
    const met = rulesFor(extensionShiftConfig(earlier));
    rules.toGo ||= met.toGo;
    rules.cups ||= met.cups;
    rules.rush ||= met.rush;
    rules.closing ||= met.closing;
  }
  return rules;
}

export function referencePrograms(level: number): RobotPrograms {
  const config = extensionShiftConfig(level),
    rules = carriedRules(level);
  // With all three robots on the floor, the reference makes and serves one drink at a time.
  const batch = (size: number) => (config.fullHouse ? 1 : size);
  return {
    query: queryReference(rules),
    prep: preparationSource(level, batch(config.prepBatch), rules),
    floor: floorSource(level, batch(config.floorBatch), rules),
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
  const service = extensionServiceForLevel(level);
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
    ...(seed.challenges && { challenges: seed.challenges }),
  };
}
export const extensionLessons = extensionSeeds.map(buildExtensionLesson);

/**
 * Derive starters and solutions from one seed. A solo shift's starter blanks one line of the reference with a
 * TODO. An Act IV shift starts from the previous shift's programs, which its odd rule then breaks.
 */
export function buildExtensionLesson(seed: LevelSeed) {
  const level = Number(seed.id.slice(1)),
    role = seed.robot ?? (level < ROBOT_UNLOCK_LEVELS.floor ? 'prep' : 'floor'),
    programs = referencePrograms(level);
  if (!seed.omission && !extensionShiftConfig(level).fullHouse)
    throw new Error(`Solo shift ${seed.id} needs an omission for its starter.`);
  const starter = seed.omission
    ? { ...programs, [role]: omitLine(programs[role], seed.omission, seed.occurrence ?? 1, seed.todo ?? seed.omission) }
    : referencePrograms(level - 1);
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
