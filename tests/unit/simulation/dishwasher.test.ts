import { describe, expect, it } from 'vitest';
import { WASH_SECONDS, specials, specialById } from '../../../src/data/specials';
import { specialsFr } from '../../../src/data/specials.fr';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { sampleReplay } from '../../../src/domain/replay';
import { runLevel } from '../../../src/domain/simulation';
import type { RobotPrograms, RunResult } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { inspectRobot } from '../../../src/features/workspace/inspector';
import { PAUSE_WORDS } from '../../../src/features/workspace/pauseWords';
import { CARGO_WORDS } from '../../../src/components/cargoWords';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('dishwasher')!;
const { level } = special;
const run = (programs: RobotPrograms) => runLevel(level, compileProgram(programs.query, UNLOCKS.together), programs);
const shift21 = referencePrograms(UNLOCKS.together - 1);
/** Shift 21's routines, once Brew starts the wash on its way from the coffee machine to the sugar. */
const wayIn: RobotPrograms = {
  ...shift21,
  prep: shift21.prep
    .replace('USE UP\nMOVE RIGHT 2\nSTORE var1', 'USE UP\nMOVE RIGHT 5\nUSE UP\nMOVE LEFT 3\nSTORE var1')
    .replace('DEPOSIT UP\nMOVE RIGHT 1\nUSE UP\nMOVE LEFT 9', 'DEPOSIT UP\nMOVE LEFT 8'),
};
/** Brew's socket at a moment of a round, as its inspector says it. */
const socketAt = (result: RunResult, at: number, say = PAUSE_WORDS.en, cargo = CARGO_WORDS.en) =>
  inspectRobot(
    result,
    sampleReplay(result, at),
    'prep',
    special.lesson.robotSolution.prep,
    false,
    level.service,
    say,
    cargo,
  )?.socket;

describe('One Socket, Rosa’s reading group’s dishwasher on the coffee machine’s socket', () => {
  it('is the fifth special, asked for by Rosa, at the address its id makes', () => {
    expect(specials[4]).toBe(special);
    expect(special.by).toBe('rosa');
    expect(level.id).toBe(`L${UNLOCKS.together}-dishwasher`);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });

  it('washes four cups for the time it says, in both languages', () => {
    expect(level.service).toMatchObject({ cups: 4, dishwasher: WASH_SECONDS });
    expect(WASH_SECONDS).toBe(20);
    for (const words of [
      special.lesson.note,
      special.brief.objective,
      specialsFr.dishwasher.note!,
      specialsFr.dishwasher.brief.objective,
    ])
      expect(words).toMatch(/20 seconde?s/);
  });

  it('serves every round with its reference, for every star', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
  });

  it('turns away the routines Shift 21 was served with: Brew is back at the machine mid-wash', () => {
    const result = run(shift21);
    expect(result.first_failure?.code).toBe('fuse-tripped');
    expect(result.first_failure?.role).toBe('prep');
    expect(result.first_failure?.reason).toBe(
      'The fuse went: Brew started the coffee machine at 2:12, while the dishwasher had the power, washing a cup from 1:56 to 2:16. Start the wash where Brew has 20 seconds of other work before it uses the machine again.',
    );
  });

  it('earns every star for the way most players in: Shift 21’s routines, washing after the brew', () => {
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
  });

  it('turns away a Brew that never washes: the four cups run out', () => {
    const prep = wayIn.prep.replace('MOVE RIGHT 5\nUSE UP\nMOVE LEFT 3', 'MOVE RIGHT 2');
    expect(prep).toBe(shift21.prep.replace('DEPOSIT UP\nMOVE RIGHT 1\nUSE UP\nMOVE LEFT 9', 'DEPOSIT UP\nMOVE LEFT 8'));
    expect(run({ ...wayIn, prep }).first_failure?.code).toBe('no-clean-cups');
  });

  it('plays live as it does headless', () => {
    for (const programs of [special.lesson.robotSolution, wayIn])
      expect(finishLiveRun(createLiveRun(level, programs)).result.first_failure).toBeNull();
    expect(finishLiveRun(createLiveRun(level, shift21)).result.first_failure?.code).toBe('fuse-tripped');
  });

  it('shows who has the socket in Brew’s inspector, in both languages', () => {
    const result = run(special.lesson.robotSolution);
    const events = result.execution![0].events.filter((e) => e.actor === 'prep');
    const start = events.find((e) => e.washing)!;
    const brew = events.find((e) => e.action === 'BREW' || e.action === 'STEEP')!;
    expect(socketAt(result, start.start + 0.1)).toBe(`Dishwasher · 1 cup · ${WASH_SECONDS} s left`);
    expect(socketAt(result, start.start + 0.1, PAUSE_WORDS.fr, CARGO_WORDS.fr)).toBe(
      `Lave-vaisselle · 1 tasse · ${WASH_SECONDS} s restantes`,
    );
    expect(socketAt(result, brew.start + 0.1)).toBe('Coffee machine');
    expect(socketAt(result, brew.start + 0.1, PAUSE_WORDS.fr, CARGO_WORDS.fr)).toBe('Machine à café');
    expect(socketAt(result, 0.5)).toBe('Free');
    expect(socketAt(result, 0.5, PAUSE_WORDS.fr, CARGO_WORDS.fr)).toBe('Libre');
  });

  it('leaves the socket out for the others, and on a shift without a dishwasher', () => {
    const result = run(special.lesson.robotSolution);
    const sampled = sampleReplay(result, 30);
    expect(inspectRobot(result, sampled, 'floor', shift21.floor, false, level.service)?.socket).toBeUndefined();
    expect(
      inspectRobot(result, sampled, 'prep', shift21.prep, false, specialById('fresh')!.level.service)?.socket,
    ).toBeUndefined();
  });

  it('keeps the dishwasher out of every other special', () => {
    for (const other of specials.filter((s) => s !== special))
      expect(other.level.service?.dishwasher, other.id).toBeUndefined();
  });
});
