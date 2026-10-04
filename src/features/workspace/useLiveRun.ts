import { useEffect, useRef, useState } from 'react';
import { STREET_APPROACH_SECONDS, createLiveRun, sampleReplay } from '@/domain';
import { robotForLevel } from '@/domain/robots';
import { incomingRobotPrograms } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import type { LevelDefinition, ProgressSave, RobotPrograms, RobotRole, RunResult } from '@/domain';
import { usePlaybackClock } from './usePlaybackClock';
import { keepHistories, keptHistories, record, redo, undo } from './history';
import type { EditKind } from './history';

export interface LiveRunArgs {
  index: number;
  level: LevelDefinition;
  save: ProgressSave;
  lessons: LessonCatalog;
  onDraft: (updated: RobotPrograms) => void;
  onComplete: (stars: number, querySource: string, programs: RobotPrograms) => void;
  onFinish: (passed: boolean) => void;
}

/** Owns the live run lifecycle: programs, role, result, clock, and completion. View state stays in Workspace. */
export function useLiveRun({ index, level, save, lessons, onDraft, onComplete, onFinish }: LiveRunArgs) {
  const [programs, setPrograms] = useState(
      () => save.robotDrafts[index] ?? incomingRobotPrograms(save, index, lessons),
    ),
    [role, setRole] = useState<RobotRole>(robotForLevel(index + 1));
  const source = programs[role];
  // Every robot keeps its own undo history, so undoing on Brew's tab never reaches back into Query's routine.
  const [histories, setHistories] = useState(() => keptHistories(index, programs));
  useEffect(() => keepHistories(index, programs, histories), [programs, histories]);
  const history = histories[role];
  const [result, setResult] = useState<RunResult | null>(null),
    [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(save.settings.speed),
    [replayTime, setReplayTime] = useState(0);
  const liveRun = useRef<ReturnType<typeof createLiveRun> | null>(null);
  const [showFailure, setShowFailure] = useState(false);
  // The shift's stars before this run, so the receipt can tell a new best from a replay.
  const [bestBefore, setBestBefore] = useState<number | undefined>(save.stars[index]);
  const time = replayTime;
  const sampled = result ? sampleReplay(result, time) : undefined;
  const displayedTrace = sampled?.seed?.events.findLast(
    (e) => e.role === role && e.start <= sampled.local && (e.end > sampled.local || e.start === e.end),
  );
  // Most shifts send in a few rounds of guests, one after another; this is the one on screen.
  const round = sampled?.seed ? (result?.execution?.indexOf(sampled.seed) ?? 0) + 1 : 1;
  const firstInstructionLine = source.split('\n').findIndex((line) => line.trim() && !line.trim().startsWith('#'));
  const waitingLine = source.split('\n').findIndex((line) => /^(LISTEN|WAIT )/.test(line.trim()));
  // Keep the marker visible during startup and idle gaps: LISTEN is the real
  // instruction waiting for the next customer when no action is in flight.
  const activeLine =
    running && (!result || result.passed)
      ? (displayedTrace?.line ?? (waitingLine >= 0 ? waitingLine : firstInstructionLine))
      : -1;
  // A failed run stops at once so the code can be fixed, but its last frame stays up until the code changes.
  const failed = showFailure && !!result && !result.passed;
  const failureLine = failed && result.first_failure?.role === role ? (result.first_failure?.error_line ?? -1) : -1;
  const instructionProgress =
    displayedTrace && sampled && displayedTrace.end > displayedTrace.start
      ? (sampled.local - displayedTrace.start) / (displayedTrace.end - displayedTrace.start)
      : 0;
  // Any edit puts the last run's result away: it no longer describes this routine.
  const apply = (next: string) => {
    const updated = { ...programs, [role]: next };
    setPrograms(updated);
    setResult(null);
    setShowFailure(false);
    onDraft(updated);
  };
  const change = (next: string, kind: EditKind = 'edit') => {
    if (running || next === source) return;
    setHistories((h) => ({ ...h, [role]: record(h[role], source, next, Date.now(), kind) }));
    apply(next);
  };
  /** Undo or redo the open robot's last edit; false when there was nothing to step to. */
  const step = (direction: 'undo' | 'redo'): boolean => {
    if (running) return false;
    const stepped = (direction === 'undo' ? undo : redo)(history, source);
    if (!stepped) return false;
    setHistories((h) => ({ ...h, [role]: stepped.history }));
    apply(stepped.source);
    return true;
  };
  const stop = () => {
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setShowFailure(false);
  };
  const fail = (failure: RunResult) => {
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setShowFailure(true);
    if (failure.first_failure?.role) setRole(failure.first_failure.role);
    onFinish(false);
  };
  const run = () => {
    if (running) {
      stop();
      return;
    }
    // A program that fails as the doors open, like a typo, reports at once instead of after the street intro.
    const opening = createLiveRun(level, programs).advance(STREET_APPROACH_SECONDS);
    if (opening.done && !opening.result.passed) {
      setResult(opening.result);
      setReplayTime(opening.time);
      fail(opening.result);
      return;
    }
    liveRun.current = createLiveRun(level, programs);
    setBestBefore(save.stars[index]);
    setResult(null);
    setReplayTime(-STREET_APPROACH_SECONDS);
    setShowFailure(false);
    setPaused(false);
    setRunning(true);
  };
  usePlaybackClock(
    running && !paused,
    (elapsed) => {
      const live = liveRun.current;
      if (!live) return;
      const frame = live.advance(elapsed * speed);
      setResult(frame.result);
      setReplayTime(frame.time);
      if (!frame.done) return;
      if (frame.result.passed) {
        liveRun.current = null;
        setRunning(false);
        setPaused(false);
        onComplete(frame.result.stars, programs.query, programs);
        onFinish(true);
      } else fail(frame.result);
    },
    [speed, index, level, programs],
  );
  return {
    programs,
    role,
    setRole,
    source,
    result,
    running,
    failed,
    paused,
    setPaused,
    speed,
    setSpeed,
    time,
    activeLine,
    failureLine,
    instructionProgress,
    round,
    change,
    undo: () => step('undo'),
    redo: () => step('redo'),
    canUndo: !running && history.past.length > 0,
    canRedo: !running && history.future.length > 0,
    run,
    stop,
    bestBefore,
  };
}
