import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { sampleReplay } from '../../../src/domain/replay';
import { runLevel } from '../../../src/domain/simulation';
import { PEDESTRIAN_LANE_X, SIDEWALK_X, STREET_BOUNDS } from '../../../src/domain/street';
import { PASSING_DEPTH, PASSING_WIDTH, WALL_X } from '../../../src/domain/sidewalk';
import type { LevelDefinition, RunResult } from '../../../src/domain/types';
import { referenceProgramsFor } from '../../helpers/run';

/** One seed of a shift, optionally with customers arriving closer together. */
function crowdedShift(index: number, gap?: number): LevelDefinition {
  return {
    ...levels[index],
    seeds: levels[index].seeds.slice(0, 1).map((seed) => ({
      ...seed,
      customers: seed.customers.map((customer, k) => ({ ...customer, arrival: gap ? k * gap : customer.arrival })),
    })),
  };
}

/** Every sample of a finished run, from the first approach to the last exit. */
function* replay(index: number, gap: number | undefined, step: number) {
  const programs = referenceProgramsFor(index);
  const result = runLevel(crowdedShift(index, gap), compileProgram(programs.query, index + 1), programs);
  const end = (result.execution ?? []).reduce((last, seed) => Math.max(last, seed.start + seed.duration), 0) + 6;
  for (let time = -6; time < end; time += step) yield { result, time };
}

/** The café as it plays live: timings fill in while customers are already out on the street. */
function* live(index: number, gap: number | undefined, step: number) {
  const run = createLiveRun(crowdedShift(index, gap), referenceProgramsFor(index));
  for (let frame = run.snapshot(); !frame.done;) yield (frame = run.advance(step));
}

/** Anyone on the sidewalk and inside the street's clipping planes, where a body can be seen. */
const visible = ([x, z]: readonly [number, number]) =>
  x < WALL_X && z > STREET_BOUNDS.minZ - PASSING_DEPTH / 2 && z < STREET_BOUNDS.maxZ + PASSING_DEPTH / 2;

/** Closest two customers come on the visible sidewalk, and the fastest anyone outside moves before heading home. */
function walkStreet(frames: Iterable<{ result: RunResult; time: number }>) {
  let closest = Infinity,
    pace = 0;
  let previous = new Map<string, { at: readonly [number, number]; time: number }>();
  for (const { result, time } of frames) {
    const customers = sampleReplay(result, time).customers;
    const left = new Map(result.events.map((event) => [event.customer.customer_id, event.timing.left]));
    const outside = customers.filter((c) => visible(c.position));
    for (let a = 0; a < outside.length; a++)
      for (let b = a + 1; b < outside.length; b++)
        closest = Math.min(
          closest,
          Math.hypot(outside[a].position[0] - outside[b].position[0], outside[a].position[1] - outside[b].position[1]),
        );
    const next = new Map(customers.map((c) => [c.id, { at: c.position, time }] as const));
    for (const [id, { at }] of next) {
      const before = previous.get(id);
      if (before && time > before.time && at[0] < WALL_X && time < left.get(id)!)
        pace = Math.max(pace, Math.hypot(at[0] - before.at[0], at[1] - before.at[1]) / (time - before.time));
    }
    previous = next;
  }
  return { closest, pace };
}

describe('sidewalk crowd', () => {
  it('keeps customers apart while a line forms outside the door', () => {
    const { closest, pace } = walkStreet(replay(3, 0.5, 0.05));
    expect(closest).toBeGreaterThan(0.75);
    // A line stepping forward walks; snapping to the next spot would cover a whole place in one sample.
    expect(pace).toBeLessThan(4);
  });

  it('keeps the line apart and walking while a live run fills in its timings', () => {
    const { closest, pace } = walkStreet(live(3, 0.5, 1 / 30));
    expect(closest).toBeGreaterThan(0.75);
    expect(pace).toBeLessThan(4);
  });

  it('keeps a busy Act IV shift free of customers walking through each other', { timeout: 20_000 }, () => {
    const { closest, pace } = walkStreet(replay(20, undefined, 0.1));
    expect(closest).toBeGreaterThan(0.75);
    expect(pace).toBeLessThan(4);
  });

  it('puts background walkers in their own lane, clear of the customers', () => {
    expect(SIDEWALK_X - PEDESTRIAN_LANE_X).toBeGreaterThanOrEqual(PASSING_WIDTH + 0.1);
  });
});
