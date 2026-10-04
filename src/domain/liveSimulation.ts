import { streamService } from './service';
import { STREET_APPROACH_SECONDS } from './street';
import { countProgramBlocks } from './scoring';
import { createLivePumpState, pumpQuery, queryFinished } from './live/pump';
import { finishLiveRun } from './live/finish';
import { initializeLiveRun } from './live/initialize';
import type { LevelDefinition, RobotPrograms, RunResult } from './types';

export interface LiveRunOptions {
  /**
   * Practise one round, counting from 0, instead of the whole service. Every round starts from an empty café with
   * fresh robots, so a round played alone goes exactly as it would in the full service.
   */
  practice?: number;
}

/** A suspended interpreter: constructing a run executes no player instruction. */
export function createLiveRun(level: LevelDefinition, programs: RobotPrograms, options: LiveRunOptions = {}) {
  const practice = options.practice !== undefined;
  // The rounds this run plays, in order: all of them, or the one being practised.
  const rounds = practice ? [options.practice!] : level.seeds.map((_, i) => i);
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
    required_seeds: rounds.length,
    executed_instructions: 0,
    average_satisfaction: 100,
    stars: 0,
    first_failure: null,
    ...(practice && { practice: true }),
  };
  let time = -STREET_APPROACH_SECONDS,
    nextGlobal = 0,
    done = false,
    // The player's robots have finished: the rest of this seed is computed at once instead of played.
    rushing = false;
  // Which of this run's rounds is playing.
  let at = 0,
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
      done: () => queryFinished(state, deps),
      settle: () => {
        rushing = true;
      },
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
    let target = time + Math.max(0, seconds);
    if (!service) startSeed(rounds[at]);
    while (!done && (rushing || nextGlobal <= target)) {
      if (!service) startSeed(rounds[at]);
      const tick = service!.next();
      if (!tick.done) {
        nextGlobal = offset + tick.value;
        continue;
      }
      finishLiveRun(result, tick.value, level, rounds[at], at === rounds.length - 1);
      offset += tick.value.execution.duration;
      if (!tick.value.failure && at + 1 < rounds.length) {
        at += 1;
        service = undefined;
        if (rushing) target = Math.max(target, offset);
        rushing = false;
        continue;
      }
      done = true;
    }
    // A service that ends early freezes where the player's robot finished; a failure still shows where it happened.
    time = done && !(rushing && result.passed) ? offset : target;
    return snapshot();
  }
  function snapshot() {
    return { result: { ...result }, time, done };
  }
  return { advance, snapshot };
}
