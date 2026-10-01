import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { sampleReplay } from '../../../src/domain/replay';
import { runLevel } from '../../../src/domain/simulation';
import { PEDESTRIAN_LANE_X, SIDEWALK_X } from '../../../src/domain/street';
import { PASSING_WIDTH, WALL_X } from '../../../src/domain/sidewalk';
import type { LevelDefinition, RunResult } from '../../../src/domain/types';
import { referenceProgramsFor } from '../../helpers/run';

/** Run one seed of a shift, optionally with customers arriving closer together. */
function runSeed(index: number, gap?: number): RunResult {
  const level: LevelDefinition = {
    ...levels[index],
    seeds: levels[index].seeds.slice(0, 1).map((seed) => ({
      ...seed,
      customers: seed.customers.map((customer, k) => ({ ...customer, arrival: gap ? k * gap : customer.arrival })),
    })),
  };
  const programs = referenceProgramsFor(index);
  return runLevel(level, compileProgram(programs.query, index + 1), programs);
}

/** Closest two customers come on the sidewalk, and the largest step any customer takes between samples. */
function walkStreet(result: RunResult, step = 0.05) {
  const end = (result.execution ?? []).reduce((last, seed) => Math.max(last, seed.start + seed.duration), 0) + 6;
  let closest = Infinity,
    jump = 0;
  let previous = new Map<string, readonly [number, number]>();
  for (let time = -6; time < end; time += step) {
    const customers = sampleReplay(result, time).customers;
    const outside = customers.filter((c) => c.position[0] < WALL_X);
    for (let a = 0; a < outside.length; a++)
      for (let b = a + 1; b < outside.length; b++)
        closest = Math.min(
          closest,
          Math.hypot(outside[a].position[0] - outside[b].position[0], outside[a].position[1] - outside[b].position[1]),
        );
    const next = new Map(customers.map((c) => [c.id, c.position] as const));
    for (const [id, at] of next) {
      const before = previous.get(id);
      if (before && at[0] < WALL_X) jump = Math.max(jump, Math.hypot(at[0] - before[0], at[1] - before[1]));
    }
    previous = next;
  }
  return { closest, jump };
}

describe('sidewalk crowd', () => {
  it('keeps customers apart while a line forms outside the door', () => {
    const { closest, jump } = walkStreet(runSeed(3, 0.5));
    expect(closest).toBeGreaterThan(0.75);
    // A line stepping forward walks; nobody teleports to the next spot.
    expect(jump).toBeLessThan(0.3);
  });

  it('keeps a busy Act IV shift free of customers walking through each other', () => {
    const { closest, jump } = walkStreet(runSeed(20), 0.1);
    expect(closest).toBeGreaterThan(0.75);
    expect(jump).toBeLessThan(0.6);
  });

  it('puts background walkers in their own lane, clear of the customers', () => {
    expect(SIDEWALK_X - PEDESTRIAN_LANE_X).toBeGreaterThanOrEqual(PASSING_WIDTH + 0.1);
  });
});
