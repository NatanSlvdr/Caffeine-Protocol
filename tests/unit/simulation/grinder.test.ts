import { describe, expect, it } from 'vitest';
import { GRINDER_OUT, specials, specialById } from '../../../src/data/specials';
import { specialsFr } from '../../../src/data/specials.fr';
import { CARGO_WORDS } from '../../../src/components/cargoWords';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { compileRobot } from '../../../src/domain/robotProgram';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { runLevel } from '../../../src/domain/simulation';
import type { RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('grinder')!;
const { level } = special;
const run = (programs: RobotPrograms) => runLevel(level, compileProgram(programs.query, UNLOCKS.preground), programs);
const shift21 = referencePrograms(UNLOCKS.preground - 1);
const GRIND = 'IF coffee IN CUSTOMER SPEECH\n';
const CHECKED = 'IF coffee IN CUSTOMER SPEECH AND preground NOT IN CUSTOMER SPEECH\n';
/** Shift 21's routines, once Brew takes pre-ground coffee straight up to the sink. */
const wayIn: RobotPrograms = { ...shift21, prep: shift21.prep.replace(GRIND, CHECKED) };

describe('The Engineer’s Visit, Mr. Albert’s morning with the grinder out', () => {
  it('is the fourth special, asked for by Mr. Albert, at the address its id makes', () => {
    expect(specials[3]).toBe(special);
    expect(special.by).toBe('albert');
    expect(level.id).toBe(`L${UNLOCKS.preground}-grinder`);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });

  it('takes the grinder away mid-morning, and says when, in both languages', () => {
    expect(level.service?.grinderOut).toEqual(GRINDER_OUT);
    expect(GRINDER_OUT).toEqual({ from: 90, to: 270 });
    for (const words of [
      special.lesson.note,
      special.brief.objective,
      specialsFr.grinder.note!,
      specialsFr.grinder.brief.objective,
    ])
      expect(words).toMatch(/1:30 .* 4:30/);
  });

  it('serves every round with its reference, for every star', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
  });

  it('turns away the routines Shift 21 was served with: Brew grinds coffee that came pre-ground', () => {
    const result = run(shift21);
    expect(result.first_failure?.code).toBe('grinder-serviced');
    expect(result.first_failure?.role).toBe('prep');
    expect(result.first_failure?.reason).toBe(
      'This coffee came pre-ground: the grinder is out for its service from 1:30 to 4:30. Check If Pre-ground IN Orders, and take it straight up to the sink.',
    );
  });

  it('takes coffee up during the visit and outside it, every round', () => {
    const never = special.lesson.robotSolution.prep.replace(
      CHECKED,
      'IF coffee IN CUSTOMER SPEECH AND coffee NOT IN CUSTOMER SPEECH\n',
    );
    for (const seed of level.seeds) {
      const round = { ...level, seeds: [seed] };
      const on = (programs: RobotPrograms) =>
        runLevel(round, compileProgram(programs.query, UNLOCKS.preground), programs).first_failure?.code;
      expect(on(shift21), seed.id).toBe('grinder-serviced');
      expect(on({ ...special.lesson.robotSolution, prep: never }), seed.id).toBe('recipe-order');
    }
  });

  it('turns away a Brew that never grinds: the coffee before and after the visit is beans', () => {
    const prep = special.lesson.robotSolution.prep.replace(
      CHECKED,
      'IF coffee IN CUSTOMER SPEECH AND coffee NOT IN CUSTOMER SPEECH\n',
    );
    expect(prep).not.toBe(special.lesson.robotSolution.prep);
    expect(run({ ...special.lesson.robotSolution, prep }).first_failure?.code).toBe('recipe-order');
  });

  it('earns every star for the way most players in: Shift 21’s routines, checking before they grind', () => {
    expect(wayIn.prep).not.toBe(shift21.prep);
    expect(special.lesson.robotSolution.prep).toContain(CHECKED);
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
  });

  it('plays live as it does headless', () => {
    expect(finishLiveRun(createLiveRun(level, special.lesson.robotSolution)).result.first_failure).toBeNull();
    expect(finishLiveRun(createLiveRun(level, shift21)).result.first_failure?.code).toBe('grinder-serviced');
  });

  it('lets only Brew check for pre-ground coffee, and only from this special’s shift', () => {
    const source = 'LISTEN\nIF preground IN CUSTOMER SPEECH\nEND';
    expect(compileRobot(source, 'prep', UNLOCKS.preground).compile_error).toBe('');
    expect(compileRobot(source, 'prep', UNLOCKS.preground - 1).compile_error).not.toBe('');
    expect(compileRobot(source, 'floor', UNLOCKS.preground).compile_error).not.toBe('');
    expect(compileProgram('LISTEN\nIF preground IN CUSTOMER SPEECH\nEND', UNLOCKS.preground).compile_error).not.toBe(
      '',
    );
  });

  it('names pre-ground coffee as Brew holds it, apart from coffee it ground', () => {
    const cup = { ticketId: 'A-1', table: 1, item: 'coffee', stage: 'ground', sugar: 0 } as const;
    expect([CARGO_WORDS.en.cargo({ ...cup, preground: true }), CARGO_WORDS.en.cargo(cup)]).toEqual([
      'Pre-ground coffee',
      'Ground coffee',
    ]);
    expect([CARGO_WORDS.fr.cargo({ ...cup, preground: true }), CARGO_WORDS.fr.cargo(cup)]).toEqual([
      'Café moulu d’avance',
      'Café moulu',
    ]);
  });

  it('keeps the grinder in on every other special', () => {
    for (const other of specials.filter((s) => s !== special))
      expect(other.level.service?.grinderOut, other.id).toBeUndefined();
  });
});
