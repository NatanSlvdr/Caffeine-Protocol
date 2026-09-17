import type { RobotPrograms } from './types';
import { ROBOT_UNLOCK_LEVELS } from './robots';

/** Non-comment source lines across every programmed robot; feeds the block-count star target. */
export function countProgramBlocks(programs: RobotPrograms, queryBlockCount: number, levelNumber: number): number {
  const codeLines = (source: string) => source.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length;
  return (
    queryBlockCount +
    (levelNumber >= ROBOT_UNLOCK_LEVELS.prep ? codeLines(programs.prep) : 0) +
    (levelNumber >= ROBOT_UNLOCK_LEVELS.floor ? codeLines(programs.floor) : 0)
  );
}

/** Star award shared by offline validation and live runs: correctness, then block and step targets. */
export function starsFor(args: {
  passed: boolean;
  programmingEnabled: boolean;
  blockCount: number;
  blockTarget: number;
  executedInstructions: number;
  instructionTarget: number;
}): number {
  if (!args.passed || !args.programmingEnabled) return 0;
  if (args.blockCount > args.blockTarget) return 1;
  if (args.executedInstructions > args.instructionTarget) return 2;
  return 3;
}

/** Satisfaction for one served event: waiting at the counter costs more than slow sipping. */
export function satisfactionFor(created: number, arrival: number, served: number): number {
  return Math.round(Math.max(0, 100 - (created - arrival) * 0.6 - (served - created) * 0.05) * 10) / 10;
}

/** Round-robin table assignment shared by batch validation and live runs. */
export function tableForShift(index: number, activeTables: number): number {
  return (index % activeTables) + 1;
}
