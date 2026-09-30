import { describe, expect, it } from 'vitest';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { levels, lessons } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { finishLiveRun as finish, referenceProgramsFor as programs } from '../../helpers/run';

/** Live validation must require every seed: L02 coffee-only cannot clear L03 tea seeds. */
describe('live multi-seed validation', () => {
  it('rejects the L02 coffee-only routine on L03 live at the first tea seed', () => {
    const level = levels[2];
    expect(level.id).toBe('L03');
    expect(level.seeds.map((s) => s.id)).toEqual(['L03_A', 'L03_B', 'L03_C']);
    const coffeeOnly = lessons[1].solution;
    const frame = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' }));
    expect(frame.result.passed).toBe(false);
    expect(frame.result.required_seeds).toBe(3);
    expect(frame.result.passed_seeds).toBe(1);
    expect(frame.result.first_failure?.seed_id).toBe('L03_B');
    expect(frame.result.first_failure?.customer_id).toBe('C1');
    expect(frame.result.first_failure?.phrase).toBe('tea');
    expect(frame.result.events.map((e) => e.seed_id)).toEqual(['L03_A', 'L03_B']);
  });

  it('matches offline validation for the L02 routine on L03', () => {
    const level = levels[2];
    const coffeeOnly = lessons[1].solution;
    const offline = runLevel(level, compileProgram(coffeeOnly, 3));
    const live = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' })).result;
    expect(offline.passed).toBe(false);
    expect(live.passed).toBe(false);
    expect(live.first_failure?.seed_id).toBe(offline.first_failure?.seed_id);
    expect(live.first_failure?.seed_id).toBe('L03_B');
    expect(live.passed_seeds).toBe(offline.passed_seeds);
    expect(live.required_seeds).toBe(offline.required_seeds);
  });

  it('completes L03 live with its reference program across all seeds', () => {
    const frame = finish(createLiveRun(levels[2], programs(2)));
    expect(frame.result.passed).toBe(true);
    expect(frame.result.first_failure).toBeNull();
    expect(frame.result.required_seeds).toBe(3);
    expect(frame.result.passed_seeds).toBe(3);
    expect(frame.result.execution).toHaveLength(3);
  });
});

describe('early finish', () => {
  it('ends the service once Query has handled every guest, without waiting for them to leave', () => {
    const level = levels[1];
    const live = createLiveRun(level, programs(1));
    let frame = live.advance(0);
    while (!frame.done) frame = live.advance(0.5);
    const [seed] = frame.result.execution!;
    const lastQuery = Math.max(...seed.events.filter((e) => e.actor === 'query').map((e) => e.end));
    expect(frame.result.passed).toBe(true);
    // Playback stops just after Query's last block, while the scoring still ran the whole service.
    expect(frame.time).toBeLessThan(lastQuery + 1);
    expect(seed.duration).toBeGreaterThan(frame.time + 5);
    expect(frame.result.stars).toBeGreaterThan(0);
  });
});
