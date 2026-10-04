import { describe, expect, it } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { keepRecord, recordRun, RUN_HISTORY, runVersion } from '../../../src/domain';
import type { LevelDefinition } from '../../../src/domain/types';
import { finishLiveRun as finish, referenceProgramsFor as programs } from '../../helpers/run';

const L04 = levels[3];
const coffeeOnly = { query: lessons[2].solution, prep: '', floor: '' };
/** L04 with a coffee-only round first: L03's loop gets round 1 right and slips in round 2. */
const coffeeFirst: LevelDefinition = {
  ...L04,
  seeds: [
    { id: 'L04_COFFEE', customers: L04.seeds[0].customers.filter((c) => c.phrase === 'coffee') },
    ...L04.seeds.slice(1),
  ],
};

describe('practising one round', () => {
  it('plays only the chosen round, as a practice run of one', () => {
    const { result } = finish(createLiveRun(L04, programs(3), { practice: 1 }));
    expect(result.practice).toBe(true);
    expect(result.required_seeds).toBe(1);
    expect(result.passed_seeds).toBe(1);
    expect(result.execution?.map((seed) => seed.seed_id)).toEqual(['L04_B']);
    expect(new Set(result.events.map((e) => e.seed_id))).toEqual(new Set(['L04_B']));
  });

  it('earns no stars, even when the round goes right', () => {
    const { result } = finish(createLiveRun(L04, programs(3), { practice: 2 }));
    expect(result.passed).toBe(true);
    expect(result.stars).toBe(0);
    expect(finish(createLiveRun(L04, programs(3))).result.stars).toBeGreaterThan(0);
  });

  it('meets the same slip as the full service, with the routines unchanged', () => {
    const full = finish(createLiveRun(coffeeFirst, coffeeOnly)).result;
    expect(full.passed_seeds).toBe(1);
    expect(full.first_failure?.seed_id).toBe('L04_B');
    const practice = finish(createLiveRun(coffeeFirst, coffeeOnly, { practice: 1 })).result;
    expect(practice.passed).toBe(false);
    expect(practice.passed_seeds).toBe(0);
    const pick = ({ seed_id, customer_id, code, error_line, phrase }: NonNullable<typeof full.first_failure>) => ({
      seed_id,
      customer_id,
      code,
      error_line,
      phrase,
    });
    expect(pick(practice.first_failure!)).toEqual(pick(full.first_failure!));
  });

  it('leaves the full service unmarked as practice', () => {
    expect(finish(createLiveRun(L04, programs(3))).result.practice).toBeUndefined();
  });
});

describe('run records', () => {
  const { result } = finish(createLiveRun(L04, coffeeOnly, { practice: 0 }));

  it('freeze the routines, the rounds and the rules they ran under', () => {
    const programs = { ...coffeeOnly };
    const record = recordRun(7, L04, programs, result, [0]);
    expect(record).toMatchObject({ id: 7, level_id: 'L04', mode: 'practice', seeds: ['L04_A'] });
    expect(record.version).toBe(runVersion(L04));
    programs.query = 'LISTEN';
    expect(record.programs.query).toBe(coffeeOnly.query);
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.programs)).toBe(true);
    expect(Object.isFrozen(record.seeds)).toBe(true);
  });

  it('tell the shifts’ rules apart by version', () => {
    expect(runVersion(L04)).toBe(runVersion({ ...L04 }));
    expect(runVersion(L04)).not.toBe(runVersion(coffeeFirst));
  });

  it('keep only the latest few', () => {
    let records = [recordRun(0, L04, coffeeOnly, result, [0])];
    for (let id = 1; id < RUN_HISTORY + 5; id++)
      records = keepRecord(records, recordRun(id, L04, coffeeOnly, result, [0]));
    expect(records).toHaveLength(RUN_HISTORY);
    expect(records.at(-1)!.id).toBe(RUN_HISTORY + 4);
  });
});
