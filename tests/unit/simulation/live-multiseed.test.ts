import { describe, expect, it } from 'vitest';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { levels, lessons } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { finishLiveRun as finish, referenceProgramsFor as programs } from '../../helpers/run';

/** Live validation must require every seed: L03 coffee-only cannot clear L04 tea seeds. */
describe('live multi-seed validation', () => {
  it('rejects the L03 coffee-only routine on L04 live at the first tea seed', () => {
    const level = levels[3];
    expect(level.id).toBe('L04');
    expect(level.seeds.map((s) => s.id)).toEqual(['L04_A', 'L04_B', 'L04_C']);
    const coffeeOnly = lessons[2].solution;
    const frame = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' }));
    expect(frame.result.passed).toBe(false);
    expect(frame.result.required_seeds).toBe(3);
    expect(frame.result.passed_seeds).toBe(1);
    expect(frame.result.first_failure?.seed_id).toBe('L04_B');
    expect(frame.result.first_failure?.customer_id).toBe('C1');
    expect(frame.result.first_failure?.phrase).toBe('tea');
    expect(frame.result.events.map((e) => e.seed_id)).toEqual(['L04_A', 'L04_B']);
  });

  it('matches offline validation for the L03 routine on L04', () => {
    const level = levels[3];
    const coffeeOnly = lessons[2].solution;
    const offline = runLevel(level, compileProgram(coffeeOnly, 4));
    const live = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' })).result;
    expect(offline.passed).toBe(false);
    expect(live.passed).toBe(false);
    expect(live.first_failure?.seed_id).toBe(offline.first_failure?.seed_id);
    expect(live.first_failure?.seed_id).toBe('L04_B');
    expect(live.passed_seeds).toBe(offline.passed_seeds);
    expect(live.required_seeds).toBe(offline.required_seeds);
  });

  it('completes L04 live with its reference program across all seeds', () => {
    const frame = finish(createLiveRun(levels[3], programs(3)));
    expect(frame.result.passed).toBe(true);
    expect(frame.result.first_failure).toBeNull();
    expect(frame.result.required_seeds).toBe(3);
    expect(frame.result.passed_seeds).toBe(3);
    expect(frame.result.execution).toHaveLength(3);
  });
});
