import { streamService } from './service';
import { STREET_APPROACH_SECONDS } from './street';
import { countProgramBlocks } from './scoring';
import { createLivePumpState, pumpQuery } from './live/pump';
import type { LivePumpDeps, LivePumpState } from './live/pump';
import { finishLiveRun } from './live/finish';
import { initializeLiveRun } from './live/initialize';
import type { LevelDefinition, RobotPrograms, RunResult } from './types';

/** A suspended interpreter: constructing a run executes no player instruction. */
export function createLiveRun(level: LevelDefinition, programs: RobotPrograms) {
  const seed = level.seeds[0];
  const result: RunResult = {
    passed: true,
    observation: !level.programming_enabled,
    events: [],
    tickets: [],
    execution: [],
    programs,
    level_id: level.id,
    level_title: level.title,
    passed_seeds: 0,
    required_seeds: 1,
    executed_instructions: 0,
    average_satisfaction: 100,
    stars: 0,
    first_failure: null,
  };
  let time = -STREET_APPROACH_SECONDS,
    next = 0,
    done = false;
  let service: ReturnType<typeof streamService> | undefined;

  function initialize() {
    const init = initializeLiveRun(level, programs);
    result.block_count = countProgramBlocks(programs, init.program.block_count, init.number);
    result.events = init.events;
    result.execution = [{ seed_id: seed.id, start: 0, duration: Infinity, events: [] }];
    const state: LivePumpState = createLivePumpState(init.queryNext);
    const deps: LivePumpDeps = {
      level,
      program: init.program,
      events: init.events,
      result,
      listenLine: init.listenLine,
      seedId: seed.id,
    };
    service = streamService(level, result.events, programs, 0, {
      pump: (now, log) => pumpQuery(now, log, state, deps),
      next: () => state.queryNext,
      done: () => state.index >= result.events.length,
      attach: (execution) => {
        result.execution = [execution];
      },
    });
  }

  /** Advance only to the requested game time; future instructions stay suspended. */
  function advance(seconds: number) {
    if (done) return snapshot();
    const target = time + Math.max(0, seconds);
    if (!service) initialize();
    while (!done && next <= target) {
      if (!service) initialize();
      const tick = service!.next();
      if (!tick.done) {
        next = tick.value;
        continue;
      }
      finishLiveRun(result, tick.value, level);
      done = true;
    }
    time = done ? result.execution![0].duration : target;
    return snapshot();
  }
  function snapshot() {
    return { result: { ...result }, time, done };
  }
  return { advance, snapshot };
}
