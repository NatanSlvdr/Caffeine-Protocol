import { streamService } from './service';
import { STREET_APPROACH_SECONDS } from './street';
import { countProgramBlocks } from './scoring';
import { createLivePumpState, pumpQuery, queryFinished } from './live/pump';
import { finishLiveRun } from './live/finish';
import { initializeLiveRun } from './live/initialize';
import { startTracker } from './live/steps';
import type { Start } from './live/steps';
export type { Start } from './live/steps';
import type { ExecutionEvent, LevelDefinition, RobotPrograms, RobotRole, RunResult } from './types';

export interface LiveRunOptions {
  /**
   * Practise one round, counting from 0, instead of the whole service. Every round starts from an empty café with
   * fresh robots, so a round played alone goes exactly as it would in the full service.
   */
  practice?: number;
}

/** A frame of a live run; a step, or play that stopped early, also says what started at the moment it stopped on. */
export interface LiveFrame {
  result: RunResult;
  time: number;
  done: boolean;
  started?: ExecutionEvent[];
  /** What met the condition play was asked to stop at, when it stopped there. */
  stopped?: Start[];
}

/** A moment to stop playing at, such as a robot reaching a marked block. */
export type StopWhen = (start: Start) => boolean;

/** Clock ticks a single step, or play watching for a stop, may play through: a whole service, with room to spare. */
const MAX_STEP_TICKS = 1_000_000;

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
  // What has started, read off the log as it grows.
  const track = startTracker();

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

  /**
   * Advance only to the requested game time; future instructions stay suspended. Given a moment to stop at, play
   * stops there instead, if it comes first, after the clock tick it happens on: the same ticks a run left to play
   * would take, so stopping never changes how the run goes.
   */
  function advance(seconds: number, stopWhen?: StopWhen): LiveFrame {
    const until = time + Math.max(0, seconds);
    for (let ticks = 0; stopWhen && !done && nextGlobal <= until && ticks < MAX_STEP_TICKS; ticks++) {
      const frame = stopAt(playTo(nextGlobal), stopWhen);
      if (frame) return frame;
    }
    return stopAt(playTo(until), stopWhen) ?? snapshot();
  }
  /** Play to a moment, and say what started on the way. */
  function playTo(until: number) {
    advanceTo(until);
    return track(result.execution!, time);
  }
  function stopAt(started: Start[], stopWhen: StopWhen | undefined): LiveFrame | undefined {
    const stopped = stopWhen ? started.filter(stopWhen) : [];
    if (!stopped.length) return undefined;
    return { ...snapshot(), started: started.map((s) => s.event), stopped };
  }
  function advanceTo(until: number) {
    if (done) return snapshot();
    let target = Math.max(time, until);
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
  /**
   * Play on to the next moment something starts: a block, a slip, or a robot beginning to wait, by one of the robots
   * asked about or, asked about none, by anyone. It plays the same clock ticks a continuous run does, only stopping between them, so a run
   * stepped through ends exactly as one played straight through. Everything that starts at that moment is one step,
   * told in the order work travels through the café; whatever starts before it, by others, plays on through. The
   * end of the service stops a step too.
   */
  function step(robots?: RobotRole | readonly RobotRole[]): LiveFrame {
    const watched =
      robots === undefined ? undefined : new Set<RobotRole>(typeof robots === 'string' ? [robots] : robots);
    for (let ticks = 0; !done && ticks < MAX_STEP_TICKS; ticks++) {
      const started = playTo(nextGlobal).map((s) => s.event);
      if (done || started.some((event) => !watched || watched.has(event.role))) return { ...snapshot(), started };
    }
    return { ...snapshot(), started: [] };
  }
  function snapshot(): LiveFrame {
    return { result: { ...result }, time, done };
  }
  return { advance, step, snapshot };
}
