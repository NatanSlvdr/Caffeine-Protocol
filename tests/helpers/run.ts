import { expect } from 'vitest';
import { lessons, levels } from '../../src/data';
import { referencePrograms } from '../../src/data/extension';
import { compileProgram } from '../../src/domain/program';
import { runLevel } from '../../src/domain/simulation';
import type { createLiveRun } from '../../src/domain/liveSimulation';
import type { LevelDefinition, RobotPrograms } from '../../src/domain/types';

/** Reference programs for a zero-based shift index: campaign solutions below L15, generated above. */
export function referenceProgramsFor(index: number): RobotPrograms {
  return index >= 14 ? referencePrograms(index + 1) : { query: lessons[index].solution, prep: '', floor: '' };
}

/** Drive a live run to completion. */
export function finishLiveRun(run: ReturnType<typeof createLiveRun>) {
  let frame = run.snapshot();
  for (let i = 0; i < 10000 && !frame.done; i++) frame = run.advance(0.5);
  expect(frame.done).toBe(true);
  return frame;
}

/** Run a single-seed service shift with program overrides (defaults to the L32 reference). */
export function runServiceShift(overrides: Partial<RobotPrograms>, shift = 32, patch: Partial<LevelDefinition> = {}) {
  const level = { ...levels[shift - 1], seeds: [levels[shift - 1].seeds[0]], ...patch };
  const programs = { ...referencePrograms(shift), ...overrides };
  return runLevel(level, compileProgram(programs.query), programs);
}

/** Run one Act I shift with its reference solution unless told otherwise. */
export function runCampaignLevel(i: number, source: string = lessons[i].solution) {
  return runLevel(levels[i], compileProgram(source, i + 1));
}
