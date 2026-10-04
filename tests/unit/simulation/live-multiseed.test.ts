import { describe, expect, it } from 'vitest';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { levels, lessons } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { finishLiveRun as finish, referenceProgramsFor as programs } from '../../helpers/run';

/** Live validation must require every seed: the L03 coffee-only loop cannot clear L04's tea orders. */
describe('live multi-seed validation', () => {
  it('rejects the L03 coffee-only loop on L04 live at the first tea order', () => {
    const level = levels[3];
    expect(level.id).toBe('L04');
    expect(level.seeds.map((s) => s.id)).toEqual(['L04_A', 'L04_B', 'L04_C']);
    const coffeeOnly = lessons[2].solution;
    const frame = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' }));
    expect(frame.result.passed).toBe(false);
    expect(frame.result.required_seeds).toBe(3);
    expect(frame.result.passed_seeds).toBe(0);
    expect(frame.result.first_failure?.seed_id).toBe('L04_A');
    expect(frame.result.first_failure?.customer_id).toBe('C2');
    expect(frame.result.first_failure?.phrase).toBe('tea');
    expect(frame.result.events.map((e) => e.seed_id)).toEqual(['L04_A', 'L04_A', 'L04_A', 'L04_A']);
  });

  it('stops the L02 single-order routine on L03 after the first guest', () => {
    const frame = finish(createLiveRun(levels[2], { query: lessons[1].solution, prep: '', floor: '' }));
    expect(frame.result.passed).toBe(false);
    expect(frame.result.first_failure?.seed_id).toBe('L03_A');
    expect(frame.result.first_failure?.customer_id).toBe('C2');
  });

  it('matches offline validation for the L03 loop on L04', () => {
    const level = levels[3];
    const coffeeOnly = lessons[2].solution;
    const offline = runLevel(level, compileProgram(coffeeOnly, 4));
    const live = finish(createLiveRun(level, { query: coffeeOnly, prep: '', floor: '' })).result;
    expect(offline.passed).toBe(false);
    expect(live.passed).toBe(false);
    expect(live.first_failure?.seed_id).toBe(offline.first_failure?.seed_id);
    expect(live.first_failure?.seed_id).toBe('L04_A');
    // Live and offline word and code the same slip alike, so the hint after a live run is the one tests expect.
    expect(live.first_failure?.code).toBe('ticket-item');
    expect(live.first_failure?.code).toBe(offline.first_failure?.code);
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
