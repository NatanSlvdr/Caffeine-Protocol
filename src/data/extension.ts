import type { LevelDefinition, RobotPrograms, ServiceConfig } from '@/domain/types';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import { TABLE_LAYOUT } from '@/domain/layout';
import { lessonById } from './campaign/load';
import { extensionSeeds } from './campaign/extension-seeds';
import { extensionSeed } from './campaign/generators/extensionCustomers';

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
    floor: floorSource(level, level >= 29 ? 2 : 1, level >= 31 ? TABLE_LAYOUT.length : level >= 29 ? 4 : level >= 24 ? 2 : 1),
  };
}
export const extensionLevels: LevelDefinition[] = extensionSeeds.map((seed) => {
  const level = Number(seed.id.slice(1)),
    batch = level >= 21 ? 2 : 1;
  const service: ServiceConfig = {
    prepCapacity: batch,
    floorCapacity: level >= 29 ? 2 : 1,
    clearing: true,
    objective: 'serve',
    minLoad: level === 21 || level === 29 ? 2 : 0,
  };
  const active_tables = level >= 31 ? TABLE_LAYOUT.length : level >= 29 ? 4 : level >= 24 ? 2 : 1;
  const seeds = [0, 1, 2].map((s) => extensionSeed(level, s));
  return {
    id: seed.id,
    title: `Level ${level}: ${seed.title}`,
    summary: seed.note,
    programming_enabled: true,
    block_target: seed.blocks,
    instruction_target: seed.instructions,
    reference_block_count: seed.blocks,
    seeds,
    active_tables,
    service,
    act: level < 23 ? 2 : level < 31 ? 3 : 4,
  };
});
export const extensionLessons = extensionLevels.map((_, i) => {
  const seed = extensionSeeds[i],
    level = Number(seed.id.slice(1)),
    role = level < 23 ? 'prep' : 'floor',
    programs = referencePrograms(level),
    starter = { ...programs };
  starter[role] = starter[role].replace(new RegExp(`^${escapeRegExp(seed.omission)}[^\\n]*$`, 'm'), `# TODO: ${seed.omission}`);
  if (level >= 31) {
    starter.query = lessonById('L03').solution;
    starter.prep = programs.prep.replace('ADD SUGAR', '# TODO: apply requested sugar');
  }
  return { note: seed.note, starter: starter.query, solution: programs.query, robotStarter: starter, robotSolution: programs };
});
