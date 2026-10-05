import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { ROBOT_MAX_BLOCKS } from '../../../src/domain/constants';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { RobotPrograms } from '../../../src/domain/types';
import { referenceProgramsFor } from '../../helpers/run';

/**
 * How long one service may take to simulate: every round of a shift, run to the end or to the step limit. The
 * slowest measured, the longest routines the editor takes on shift 21, takes about 39 ms on an M4 Pro
 * (docs/PERFORMANCE.md), so this leaves room for a slower laptop or tablet, and for a busy test runner, before a Run
 * would feel slow.
 */
const SERVICE_BUDGET_MS = 250;

/** The quickest of a few runs, so a pause elsewhere on the machine doesn't count against the simulation. */
function fastest(shift: number, programs: RobotPrograms) {
  const level = levels[shift - 1];
  const program = compileProgram(programs.query, shift);
  let result = runLevel(level, program, programs);
  let best = Infinity;
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = performance.now();
    result = runLevel(level, program, programs);
    best = Math.min(best, performance.now() - start);
  }
  return { ms: best, result };
}

const spin = 'POSITION again\nMOVE RIGHT 1\nMOVE LEFT 1\nJUMP again';

describe('simulating a service', () => {
  it('stays inside its time budget on every shift’s reference routines', () => {
    for (let shift = 2; shift <= levels.length; shift++) {
      const { ms, result } = fastest(shift, referenceProgramsFor(shift - 1));
      expect(result.passed, `shift ${shift}`).toBe(true);
      expect(ms, `shift ${shift}`).toBeLessThan(SERVICE_BUDGET_MS);
    }
  });

  it('stays inside it when robots spin until the step limit stops them', () => {
    const reference = referenceProgramsFor(levels.length - 1);
    for (const programs of [
      { ...reference, prep: spin },
      { ...reference, floor: spin },
      { ...reference, prep: spin, floor: spin },
    ]) {
      const { ms, result } = fastest(levels.length, programs);
      expect(result.first_failure?.code).toBe('loop-limit');
      expect(ms).toBeLessThan(SERVICE_BUDGET_MS);
    }
  });

  it('stays inside it with the longest routines the editor takes', () => {
    const reference = referenceProgramsFor(levels.length - 1);
    // A walk there and back that goes nowhere, until each routine is as long as it may be.
    const longest = (routine: string) => {
      const lines = routine.split('\n');
      const walks = (ROBOT_MAX_BLOCKS - lines.length) / 2;
      return [...Array.from({ length: walks }, () => ['MOVE RIGHT 1', 'MOVE LEFT 1']).flat(), ...lines].join('\n');
    };
    const programs = { ...reference, prep: longest(reference.prep), floor: longest(reference.floor) };
    expect(programs.prep.split('\n')).toHaveLength(ROBOT_MAX_BLOCKS);
    const { ms, result } = fastest(levels.length, programs);
    expect(result.passed).toBe(true);
    expect(ms).toBeLessThan(SERVICE_BUDGET_MS);
  });
});
