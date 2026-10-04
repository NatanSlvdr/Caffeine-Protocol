import { useEffect, useRef, useState } from 'react';
import { STREET_APPROACH_SECONDS, createLiveRun, keepRecord, recordRun, sampleReplay } from '@/domain';
import { robotForLevel } from '@/domain/robots';
import { incomingRobotPrograms } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import type { LevelDefinition, ProgressSave, RobotPrograms, RobotRole, RunRecord, RunResult } from '@/domain';
import { usePlaybackClock } from './usePlaybackClock';
import { keepHistories, keptHistories, record, redo, undo } from './history';
import type { EditKind } from './history';
import { evidenceOf, isStale } from './evidence';
import { crewActivity } from './crew';
import type { RunEvidence } from './evidence';

export interface LiveRunArgs {
  index: number;
  level: LevelDefinition;
  save: ProgressSave;
  lessons: LessonCatalog;
  onDraft: (updated: RobotPrograms) => void;
  onComplete: (stars: number, querySource: string, programs: RobotPrograms) => void;
  /** A run ended, passed or failed, service or practice: its record says which. */
  onFinish: (record: RunRecord) => void;
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
  // The round being practised, counting from 0, or nothing for a full service.
  const [practising, setPractising] = useState<number | null>(null);
  // Every finished run this shift, frozen with the routines it ran, newest last; the oldest drop off past a few.
  const [records, setRecords] = useState<RunRecord[]>([]);
  const nextRecord = useRef(1);
  const [showFailure, setShowFailure] = useState(false);
  // The last failed run, kept beside the code while the player fixes it; the next run puts it away.
  const [evidence, setEvidence] = useState<RunEvidence | null>(null);
  const stale = !!evidence && isStale(evidence, programs);
  // The shift's stars before this run, so the receipt can tell a new best from a replay.
  const [bestBefore, setBestBefore] = useState<number | undefined>(save.stars[index]);
  const time = replayTime;
  const sampled = result ? sampleReplay(result, time) : undefined;
  const displayedTrace = sampled?.seed?.events.findLast(
    (e) => e.role === role && e.start <= sampled.local && (e.end > sampled.local || e.start === e.end),
  );
  // Most shifts send in a few rounds of guests, one after another; this is the one on screen.
  const round = sampled?.seed
    ? level.seeds.findIndex((seed) => seed.id === sampled.seed!.seed_id) + 1
    : (practising ?? 0) + 1;
  // Who is busy and who is waiting, while the run plays: the robot tabs show it.
  const activity = running && sampled ? crewActivity(sampled) : undefined;
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
  // The block where it stopped stays marked for as long as the routines are the ones that ran: an edit clears it,
  // and undoing back to them marks it again.
  const failureLine =
    evidence && !stale && (evidence.failure.role ?? 'query') === role ? evidence.failure.error_line : -1;
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
  /** Freeze a finished run with the routines and rounds it played, and keep it. */
  const keep = (finished: RunResult, practice: number | null): RunRecord => {
    const rounds = practice === null ? level.seeds.map((_, i) => i) : [practice];
    const record = recordRun(nextRecord.current++, level, programs, finished, rounds);
    setRecords((kept) => keepRecord(kept, record));
    return record;
  };
  const fail = (record: RunRecord) => {
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setShowFailure(true);
    setEvidence(evidenceOf(level, record));
    if (record.result.first_failure?.role) setRole(record.result.first_failure.role);
    onFinish(record);
  };
  /** Start the whole service, or practise one round of it; while running, the same call stops it. */
  const start = (practice: number | null) => {
    if (running) {
      stop();
      return;
    }
    const options = practice === null ? {} : { practice };
    // A program that fails as the doors open, like a typo, reports at once instead of after the street intro.
    const opening = createLiveRun(level, programs, options).advance(STREET_APPROACH_SECONDS);
    if (opening.done && !opening.result.passed) {
      setPractising(practice);
      setResult(opening.result);
      setReplayTime(opening.time);
      fail(keep(opening.result, practice));
      return;
    }
    liveRun.current = createLiveRun(level, programs, options);
    setPractising(practice);
    setBestBefore(save.stars[index]);
    setResult(null);
    setEvidence(null);
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
      const record = keep(frame.result, practising);
      if (frame.result.passed) {
        liveRun.current = null;
        setRunning(false);
        setPaused(false);
        // Practice can pass, but only the whole service counts.
        if (record.mode === 'service') onComplete(frame.result.stars, programs.query, programs);
        onFinish(record);
      } else fail(record);
    },
    [speed, index, level, programs, practising],
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
    evidence,
    stale,
    instructionProgress,
    round,
    activity,
    change,
    undo: () => step('undo'),
    redo: () => step('redo'),
    canUndo: !running && history.past.length > 0,
    canRedo: !running && history.future.length > 0,
    run: () => start(null),
    /** Play one round, counting from 0, with the routines as they are now: practice, never stars. */
    practise: (round: number) => start(round),
    practising,
    records,
    stop,
    bestBefore,
  };
}
