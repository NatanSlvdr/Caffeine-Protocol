import { streamService } from './service';
import { STREET_APPROACH_SECONDS } from './street';
import { countProgramBlocks } from './scoring';
import { createLivePumpState, pumpQuery } from './live/pump';
import { finishLiveRun } from './live/finish';
import { initializeLiveRun } from './live/initialize';
import type { LevelDefinition, RobotPrograms, RunResult } from './types';

/** A suspended interpreter: constructing a run executes no player instruction. */
export function createLiveRun(level: LevelDefinition, programs: RobotPrograms) {
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
    required_seeds: level.seeds.length,
    executed_instructions: 0,
    average_satisfaction: 100,
    stars: 0,
    first_failure: null,
  };
  let time = -STREET_APPROACH_SECONDS,
    nextGlobal = 0,
    done = false;
  let seedIndex = 0,
    offset = 0,
    blockCountSet = false;
  let service: ReturnType<typeof streamService> | undefined;

  function startSeed(index: number) {
    const seed = level.seeds[index];
    const init = initializeLiveRun(level, programs, index);
    if (!blockCountSet) {
      result.block_count = countProgramBlocks(programs, init.program.block_count, init.number);
      blockCountSet = true;
    }
    result.events.push(...init.events);
    result.execution!.push({ seed_id: seed.id, start: offset, duration: Infinity, events: [] });
    const state = createLivePumpState(init.queryNext);
    const deps = {
      level,
      program: init.program,
      events: init.events,
      result,
      listenLine: init.listenLine,
      seedId: seed.id,
    };
    service = streamService(level, init.events, programs, offset, {
      pump: (now, log) => pumpQuery(now, log, state, deps),
      next: () => state.queryNext,
      done: () => state.index >= deps.events.length,
      attach: (execution) => {
        const at = result.execution!.findIndex((e) => e.seed_id === seed.id);
        if (at >= 0) result.execution![at] = execution;
        else result.execution!.push(execution);
      },
    });
    nextGlobal = offset;
  }

  /** Advance only to the requested game time; future instructions stay suspended. */
  function advance(seconds: number) {
    if (done) return snapshot();
    const target = time + Math.max(0, seconds);
    if (!service) startSeed(seedIndex);
    while (!done && nextGlobal <= target) {
      if (!service) startSeed(seedIndex);
      const tick = service!.next();
      if (!tick.done) {
        nextGlobal = offset + tick.value;
        continue;
      }
      finishLiveRun(result, tick.value, level, seedIndex);
      offset += tick.value.execution.duration;
      if (!tick.value.failure && seedIndex + 1 < level.seeds.length) {
        seedIndex += 1;
        service = undefined;
        continue;
      }
      done = true;
    }
    time = done ? offset : target;
    return snapshot();
  }
  function snapshot() {
    return { result: { ...result }, time, done };
  }
  return { advance, snapshot };
}
