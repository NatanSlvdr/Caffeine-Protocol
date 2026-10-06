import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { specialById } from '../../../src/data/specials';
import { referencePrograms } from '../../../src/data/extension';
import { REACH_FOLLOW_THROUGH, reachAt, sampleReplay } from '../../../src/domain/replay';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import type { ActorId, ExecutionEvent } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { finishLiveRun } from '../../helpers/run';

/** The café plays the live run, so the arms are timed on it. */
const last = levels[levels.length - 1];
const result = finishLiveRun(
  createLiveRun({ ...last, seeds: [last.seeds[0]] }, referencePrograms(levels.length)),
).result;
const seed = result.execution![0];
const at = (time: number, id: ActorId) => sampleReplay(result, seed.start + time).actors[id]!;
/** A reaching block that changes what the robot holds, with nothing reaching for a while after it. */
const handoff = (command: RegExp) =>
  seed.events.find(
    (event, i) =>
      event.actor !== 'query' &&
      command.test(event.command) &&
      event.end > event.start &&
      !seed.events
        .slice(i + 1)
        .some(
          (next) =>
            next.actor === event.actor &&
            next.start < event.end + REACH_FOLLOW_THROUGH &&
            /^(TAKE|DEPOSIT|USE)/.test(next.command),
        ),
  )!;
/** What the robot holds, as the service has it at `time`. */
const holding = (event: ExecutionEvent, time: number) => JSON.stringify(at(time, event.actor).inventory);

describe('a hand reaching into a station', () => {
  it('draws back a little, is over the station two thirds of the way through, and stays there to the end', () => {
    expect(reachAt(0)).toBe(0);
    expect(reachAt(0.07)).toBeLessThan(0);
    expect(reachAt(0.07)).toBeGreaterThan(-0.15);
    expect(reachAt(0.4)).toBeGreaterThan(0.4);
    for (const progress of [0.65, 0.8, 0.99, 1]) expect(reachAt(progress)).toBe(1);
    for (let progress = 0.15; progress < 0.65; progress += 0.05)
      expect(reachAt(progress + 0.05)).toBeGreaterThanOrEqual(reachAt(progress));
  });

  it('takes a cup at full reach, at the moment the service hands it over, then brings it back', () => {
    const take = handoff(/^TAKE /);
    expect(take).toBeDefined();
    expect(at(take.end - 0.01, take.actor).reach).toBe(1);
    expect(holding(take, take.end)).not.toBe(holding(take, take.end - 0.01));
    expect(at(take.end + 0.01, take.actor).reach).toBeGreaterThan(0.99);
    expect(at(take.end + REACH_FOLLOW_THROUGH / 2, take.actor).reach).toBeCloseTo(0.5, 5);
    expect(at(take.end + REACH_FOLLOW_THROUGH, take.actor).reach).toBe(0);
  });

  it('sets a cup down at full reach too, and comes back empty-handed', () => {
    const deposit = handoff(/^DEPOSIT /);
    expect(at(deposit.end - 0.01, deposit.actor).reach).toBe(1);
    expect(holding(deposit, deposit.end)).not.toBe(holding(deposit, deposit.end - 0.01));
    expect(at(deposit.end + REACH_FOLLOW_THROUGH, deposit.actor).reach).toBe(0);
  });

  it('never reaches on a block that walks', () => {
    for (const move of seed.events.filter((event) => event.command.startsWith('MOVE ')).slice(0, 20)) {
      const reaching = seed.events.some(
        (event) =>
          event.actor === move.actor &&
          /^(TAKE|DEPOSIT|USE)/.test(event.command) &&
          event.end <= move.start &&
          event.end > move.start - REACH_FOLLOW_THROUGH,
      );
      if (!reaching) expect(at((move.start + move.end) / 2, move.actor).reach).toBe(0);
    }
  });
});

describe('a robot waiting, and a robot whose block failed', () => {
  it('marks a robot out a wait, and not one at work', () => {
    const wait = seed.events.find((event) => event.start === event.end && event.waiting && !event.error)!;
    expect(at(wait.start + 0.001, wait.actor).waiting).toBe(true);
    const work = seed.events.find((event) => event.end - event.start > 0.5 && event.command.startsWith('TAKE '))!;
    expect(at((work.start + work.end) / 2, work.actor).waiting).toBeUndefined();
  });

  it('marks only the robot whose block failed, from the failure on', () => {
    // Shift 21's routines let a drink go cold on While It's Hot: Porter's block fails.
    const run = finishLiveRun(
      createLiveRun(specialById('fresh')!.level, referencePrograms(UNLOCKS.together - 1)),
    ).result;
    const failure = run.first_failure!;
    const failed = run.execution!.find((s) => s.seed_id === failure.seed_id)!;
    const sample = (time: number) => sampleReplay(run, failed.start + time).actors;
    expect(failure.role).toBe('floor');
    expect(sample(failure.event_time! - 0.5).floor!.failed).toBeUndefined();
    const after = sample(failed.duration);
    expect(after.floor!.failed).toBe(true);
    expect(after.prep!.failed).toBeUndefined();
    expect(after.query!.failed).toBeUndefined();
  });
});
