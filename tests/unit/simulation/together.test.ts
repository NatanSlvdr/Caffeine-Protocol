import { describe, expect, it } from 'vitest';
import { specials, specialById, TOGETHER_SECONDS } from '../../../src/data/specials';
import { queryReference, referencePrograms } from '../../../src/data/extension';
import { floorSource } from '../../../src/domain/defaultPrograms';
import { compileProgram } from '../../../src/domain/program';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { runLevel } from '../../../src/domain/simulation';
import type { RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('together')!;
const { level } = special;
const run = (programs: RobotPrograms) => runLevel(level, compileProgram(programs.query, UNLOCKS.together), programs);
/** The rules the crew met in the campaign, all still handled by the routines Shift 21 was served with. */
const campaign = { toGo: true, cups: true, rush: true, closing: true };
/** Shift 21's routines, once Query writes Together and Porter serves a table's order on one visit. */
const wayIn: RobotPrograms = {
  ...referencePrograms(UNLOCKS.together - 1),
  query: queryReference({ ...campaign, together: true }),
  floor: floorSource(UNLOCKS.together, 1, { ...campaign, together: true }),
};

describe('Bound Together, Rosa’s reading group', () => {
  it('is the one special, at the address its id makes', () => {
    expect(specials.map((s) => s.id)).toEqual(['together']);
    expect(level.id).toBe(`L${UNLOCKS.together}-together`);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });
  it('serves every round with its reference, for every star', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
  });
  it('gets every table that orders together its drinks within the time Rosa gives', () => {
    const tables = run(special.lesson.robotSolution).events.filter((event) => event.tickets.some((t) => t.together));
    expect(tables.length).toBeGreaterThan(0);
    for (const { timing, tickets } of tables) {
      expect(tickets.every((ticket) => ticket.together)).toBe(true);
      expect(timing.served - timing.firstServed!).toBeLessThanOrEqual(TOGETHER_SECONDS);
    }
  });
  it('turns away the routines Shift 21 was served with: the ticket needs its mark', () => {
    const result = run(referencePrograms(UNLOCKS.together - 1));
    expect(result.first_failure?.code).toBe('ticket-together-missing');
    expect(result.first_failure?.role).toBe('query');
  });
  it('turns away a mark nobody acts on: the table is served apart, with the late drink named', () => {
    const result = run({ ...referencePrograms(UNLOCKS.together - 1), query: wayIn.query });
    expect(result.first_failure?.code).toBe('table-apart');
    expect(result.first_failure?.reason).toMatch(
      /^Table \d+ ordered together, but the (coffee|tea) reached them alone/,
    );
  });
  it('turns away a Porter carrying two drinks, whoever’s they are', () => {
    const result = run({ ...special.lesson.robotSolution, floor: floorSource(UNLOCKS.together, 2) });
    expect(result.first_failure?.code).toBe('table-apart');
  });
  it('turns away a Together mark on a guest who ordered alone', () => {
    const query = special.lesson.robotSolution.query.replace(
      'IF together IN item\n    WRITE together\n  END',
      'WRITE together',
    );
    expect(query).not.toBe(special.lesson.robotSolution.query);
    expect(run({ ...special.lesson.robotSolution, query }).first_failure?.code).toBe('ticket-together-extra');
  });
  it('earns every star for the way most players in: their Shift 21 routines, serving a table together', () => {
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
  });
  it('plays live as it does headless', () => {
    const frame = finishLiveRun(createLiveRun(level, special.lesson.robotSolution));
    expect(frame.result.first_failure).toBeNull();
    const apart = finishLiveRun(
      createLiveRun(level, { ...referencePrograms(UNLOCKS.together - 1), query: wayIn.query }),
    );
    expect(apart.result.first_failure?.code).toBe('table-apart');
  });
});
