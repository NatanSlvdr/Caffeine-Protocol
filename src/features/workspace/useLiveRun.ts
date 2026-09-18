import { useRef, useState } from 'react';
import { STREET_APPROACH_SECONDS, createLiveRun, sampleReplay } from '@/domain';
import { robotForLevel } from '@/domain/robots';
import { incomingRobotPrograms } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import type { LevelDefinition, ProgressSave, RobotPrograms, RobotRole, RunResult } from '@/domain';
import { usePlaybackClock } from './usePlaybackClock';

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
  const [programs, setPrograms] = useState(() => save.robotDrafts[index] ?? incomingRobotPrograms(save, index, lessons)),
    [role, setRole] = useState<RobotRole>(robotForLevel(index + 1));
  const source = programs[role];
  const [result, setResult] = useState<RunResult | null>(null),
    [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(1),
    [replayTime, setReplayTime] = useState(0);
  const liveRun = useRef<ReturnType<typeof createLiveRun> | null>(null);
  const [showFailure, setShowFailure] = useState(false);
  const time = replayTime;
  const sampled = result ? sampleReplay(result, time) : undefined;
  const displayedTrace = sampled?.seed?.events.findLast(
    (e) => e.role === role && e.start <= sampled.local && (e.end > sampled.local || e.start === e.end),
  );
  const firstInstructionLine = source.split('\n').findIndex((line) => line.trim() && !line.trim().startsWith('#'));
  const waitingLine = source.split('\n').findIndex((line) => /^(LISTEN|WAIT )/.test(line.trim()));
  // Keep the marker visible during startup and idle gaps: LISTEN is the real
  // instruction waiting for the next customer when no action is in flight.
  const activeLine =
    running && (!result || result.passed) ? (displayedTrace?.line ?? (waitingLine >= 0 ? waitingLine : firstInstructionLine)) : -1;
  const failureLine =
    showFailure && result && !result.passed && result.first_failure?.role === role ? (result.first_failure?.error_line ?? -1) : -1;
  const instructionProgress =
    displayedTrace && sampled && displayedTrace.end > displayedTrace.start
      ? (sampled.local - displayedTrace.start) / (displayedTrace.end - displayedTrace.start)
      : 0;
  const change = (next: string) => {
    if (running) return;
    const updated = { ...programs, [role]: next };
    setPrograms(updated);
    setResult(null);
    onDraft(updated);
  };
  const stop = () => {
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setShowFailure(false);
  };
  const run = () => {
    if (running) {
      stop();
      return;
    }
    liveRun.current = createLiveRun(level, programs);
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
      liveRun.current = null;
      if (frame.result.passed) {
        setRunning(false);
        setPaused(false);
        onComplete(frame.result.stars, programs.query, programs);
        onFinish(true);
      } else {
        setPaused(true);
        setShowFailure(true);
        if (frame.result.first_failure?.role) setRole(frame.result.first_failure.role);
        onFinish(false);
      }
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
    paused,
    setPaused,
    speed,
    setSpeed,
    time,
    activeLine,
    failureLine,
    instructionProgress,
    change,
    run,
    stop,
    showFailure,
  };
}
