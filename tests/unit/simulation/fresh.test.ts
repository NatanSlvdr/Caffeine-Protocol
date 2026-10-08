import { describe, expect, it } from 'vitest';
import { FRESH_SECONDS, specialById, specials } from '../../../src/data/specials';
import { referencePrograms } from '../../../src/data/extension';
import { warmDrinks } from '../../../src/domain/counters';
import { floorSource } from '../../../src/domain/defaultPrograms';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { sampleReplay } from '../../../src/domain/replay';
import type { LevelDefinition, RobotPrograms, RunResult } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { dryRound } from '../../../src/features/workspace/blockPreview';
import { inspectRobot } from '../../../src/features/workspace/inspector';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('fresh')!;
const { level } = special;
/** The window is timed on the service the player watches: the live one. */
const run = (programs: RobotPrograms, shift: LevelDefinition = level) =>
  finishLiveRun(createLiveRun(shift, programs)).result;
const shift21 = referencePrograms(UNLOCKS.together - 1);
/** Shift 21's routines, once Porter serves each drink before clearing the cup before it. */
const wayIn: RobotPrograms = {
  ...shift21,
  floor: floorSource(UNLOCKS.together, 1, { closing: true, fresh: true }),
};
/** Shift 21's Porter, staying at the table it served to wait for that guest's cup there. */
const staying: RobotPrograms = {
  ...shift21,
  floor: shift21.floor.replace('DEPOSIT UP\nMOVE var2\nRETURN', 'DEPOSIT UP\nRETURN'),
};
/** Shift 21's Porter, taking two drinks out at a time. */
const batching: RobotPrograms = {
  ...shift21,
  floor: shift21.floor.replace(
    'TAKE DOWN\nIF togo IN CUSTOMER SPEECH',
    'TAKE DOWN\nLISTEN\nTAKE DOWN\nCALL deliver\nIF togo IN CUSTOMER SPEECH',
  ),
};
/** The longest any drink of a run waited between pickup and its guest. */
const longestWait = (result: RunResult) => Math.max(...result.events.map(({ timing }) => timing.served - timing.ready));

describe('While It’s Hot, Dot’s knitting circle', () => {
  it('is the second special, asked for by Dot, at the address its id makes', () => {
    expect(specials[1]).toBe(special);
    expect(special.by).toBe('dot');
    expect(level.id).toBe(`L${UNLOCKS.together}-fresh`);
    expect(level.service?.fresh).toBe(FRESH_SECONDS);
    expect(level.service?.closing).toBe(true);
  });

  it('serves every round with its reference, for every star, each drink with time to spare', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
    expect(longestWait(result)).toBeLessThan(FRESH_SECONDS - 5);
  });

  it('turns away the routines Shift 21 was served with: the next drink cools while Porter clears a cup', () => {
    // Without the window they serve every guest, well past it, so the window is all that turns them away.
    const kept = run(shift21, { ...level, service: { ...level.service!, fresh: undefined } });
    expect(kept.first_failure).toBeNull();
    expect(longestWait(kept)).toBeGreaterThan(FRESH_SECONDS + 5);
    const result = run(shift21);
    expect(result.first_failure?.code).toBe('drink-cold');
    expect(result.first_failure?.role).toBe('floor');
    expect(result.first_failure?.reason).toMatch(
      /^The (coffee|tea) for table \d sat \d+ s at pickup before Porter took it, and went cold on the way\.$/,
    );
  });

  it('turns away a Porter that waits for each cup at the table instead', () => {
    expect(staying.floor).not.toBe(shift21.floor);
    expect(run(staying).first_failure?.code).toBe('drink-cold');
  });

  it('turns away a Porter that holds one drink while it waits for another', () => {
    expect(batching.floor).not.toBe(shift21.floor);
    const result = run(batching);
    expect(result.first_failure?.code).toBe('drink-cold');
    expect(result.first_failure?.reason).toMatch(/went cold on Porter’s tray while Porter waited for another drink\.$/);
  });

  it('earns every star for the way most players in: Shift 21’s routines, serving before clearing', () => {
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
    expect(longestWait(result)).toBeLessThan(FRESH_SECONDS - 5);
  });

  it('leaves the campaign’s shifts and the other specials without a window', () => {
    for (const other of specials.filter((s) => s !== special)) expect(other.level.service?.fresh).toBeUndefined();
  });

  it('runs the café preview’s dry round without the window, to the end of the round', () => {
    const dry = dryRound(level, UNLOCKS.together, shift21);
    expect(dry.first_failure).toBeNull();
  });
});

describe('the drinks keeping warm, in Porter’s inspector', () => {
  it('counts down each drink from when Brew set it down, as the service does', () => {
    const result = run(special.lesson.robotSolution);
    const seed = result.execution![0];
    let seen = 0;
    for (let local = 0; local < seed.duration; local += 1.5) {
      const warm = warmDrinks(seed.events, result.tickets, local, FRESH_SECONDS);
      seen += warm.length;
      for (const drink of warm) expect(drink.left).toBeGreaterThan(0);
      expect(warm.map((drink) => drink.left)).toEqual(warm.map((drink) => drink.left).sort((a, b) => a - b));
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('shows the drink that went cold at none left, where it was', () => {
    const result = run(shift21);
    const seed = result.execution!.find((s) => s.seed_id === result.first_failure!.seed_id)!;
    const sampled = sampleReplay(result, seed.start + result.first_failure!.event_time!);
    const state = inspectRobot(result, sampled, 'floor', shift21.floor, false, { fresh: FRESH_SECONDS })!;
    expect(state.warm?.[0]).toMatch(/^(Coffee|Tea) · Table \d · On the tray · 0 s left$/);
  });

  it('is left out for Brew, and on a shift where drinks keep', () => {
    const result = run(shift21);
    const sampled = sampleReplay(result, 30);
    expect(inspectRobot(result, sampled, 'prep', shift21.prep, false, { fresh: FRESH_SECONDS })?.warm).toBeUndefined();
    expect(inspectRobot(result, sampled, 'floor', shift21.floor, false)?.warm).toBeUndefined();
  });
});
