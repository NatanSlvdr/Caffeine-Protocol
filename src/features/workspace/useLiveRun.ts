import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STREET_APPROACH_SECONDS,
  createLiveRun,
  easedShift,
  keepRecord,
  orderRoute,
  recordRun,
  runMoments,
  sampleReplay,
  splitByUnlock,
} from '@/domain';
import { incomingRobotPrograms, openingRole } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import type {
  BenchEase,
  ChallengeMeasure,
  ExecutionEvent,
  LevelDefinition,
  LiveFrame,
  ProgressSave,
  RobotPrograms,
  RobotRole,
  RunRecord,
  RunResult,
  ValidationSeed,
} from '@/domain';
import { usePlaybackClock } from './usePlaybackClock';
import { keepHistories, keptHistories, record, redo, undo } from './history';
import type { EditKind } from './history';
import { evidenceOf, isStale } from './evidence';
import { crewActivity } from './crew';
import { inspectRobot } from './inspector';
import { PAUSE_WORDS } from './pauseWords';
import { CARGO_WORDS } from '@/components';
import { useWords } from '@/shared/language';
import { challengesMet } from './challenges';
import { carryMarks, noMarks, pauseNowhere, pauseWhen, pausedBy, toggleMark } from './breakpoints';
import type { Marks, PauseAt, PausedBy } from './breakpoints';
import type { RunEvidence } from './evidence';

export interface LiveRunArgs {
  index: number;
  level: LevelDefinition;
  save: ProgressSave;
  lessons: LessonCatalog;
  onDraft: (updated: RobotPrograms) => void;
  /** A full service passed: its stars, its routines and the optional challenges it met. */
  onComplete: (stars: number, querySource: string, programs: RobotPrograms, met: ChallengeMeasure[]) => void;
  /** A run ended, passed or failed, service or practice: its record says which. */
  onFinish: (record: RunRecord) => void;
}

/** Owns the live run lifecycle: programs, role, result, clock, and completion. View state stays in Workspace. */
export function useLiveRun({ index, level, save, lessons, onDraft, onComplete, onFinish }: LiveRunArgs) {
  const pauseWords = useWords(PAUSE_WORDS),
    cargoWords = useWords(CARGO_WORDS);
  const [programs, setPrograms] = useState(
      () => save.robotDrafts[index] ?? incomingRobotPrograms(save, index, lessons),
    ),
    // A returning player picks up on the robot they were working on.
    [role, setRole] = useState<RobotRole>(() => openingRole(save, index, lessons));
  const source = programs[role];
  // Every robot keeps its own undo history, so undoing on Brew's tab never reaches back into Query's routine.
  const [histories, setHistories] = useState(() => keptHistories(level.id, programs));
  useEffect(() => keepHistories(level.id, programs, histories), [programs, histories]);
  const history = histories[role];
  const [result, setResult] = useState<RunResult | null>(null),
    [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [speed, setSpeed] = useState(save.settings.speed),
    [replayTime, setReplayTime] = useState(0),
    // An earlier moment of the run the player went back to, while paused or after a slip; nothing for now.
    [viewTime, setViewTime] = useState<number | null>(null);
  const liveRun = useRef<ReturnType<typeof createLiveRun> | null>(null);
  // What started at the moment the last step, or a pause the service took itself, stopped on, and why it paused
  // itself; playing on, or another run, puts it away.
  const [stepped, setStepped] = useState<{ started: ExecutionEvent[]; by?: PausedBy } | null>(null);
  // The robots the player writes routines for; the stand-ins covering the rest go unstepped and unpaused at.
  const crew = splitByUnlock(index + 1).unlocked;
  // Blocks marked to pause at, and what else pauses the service, for this visit. Marks follow their blocks through
  // edits, and go when a block does, so they never point at code the player didn't mark.
  const [marks, setMarks] = useState<Marks>(noMarks),
    [pauseAt, setPauseAt] = useState<PauseAt>(pauseNowhere);
  // The guest whose order is followed through the café, by round and id, until the run is put away.
  const [following, setFollowing] = useState<{ seed: string; guest: string } | null>(null);
  // A slip the service is paused on, before the crew reacts: playing on, stepping or stopping lets them.
  const [held, setHeld] = useState<RunRecord | null>(null);
  // The round being practised, counting from 0, or nothing for a full service. A bench is a round past the shift's.
  const [practising, setPractising] = useState<number | null>(null);
  // The benches run this visit, each a round of guests the player wrote. They join the shift's rounds, so a record or
  // a slip of a bench run looks its guests up the way any other run's does, and stay for as long as their records.
  const [benches, setBenches] = useState<ValidationSeed[]>([]);
  const played = useMemo(
    () => (benches.length ? { ...level, seeds: [...level.seeds, ...benches] } : level),
    [level, benches],
  );
  const benching = practising !== null && practising >= level.seeds.length;
  // Every finished run this shift, frozen with the routines it ran, newest last; the oldest drop off past a few.
  const [records, setRecords] = useState<RunRecord[]>([]);
  const nextRecord = useRef(1);
  const [showFailure, setShowFailure] = useState(false);
  // The last failed run, kept beside the code while the player fixes it; the next run puts it away.
  const [evidence, setEvidence] = useState<RunEvidence | null>(null);
  const stale = !!evidence && isStale(evidence, programs);
  // The shift's stars before this run, so the receipt can tell a new best from a replay.
  const [bestBefore, setBestBefore] = useState<number | undefined>(save.stars[index]);
  // And the challenges met before it, so the receipt can tell one met for the first time.
  const [metBefore, setMetBefore] = useState<ChallengeMeasure[]>(save.challenges?.[index] ?? []);
  const time = viewTime ?? replayTime;
  const viewing = viewTime !== null;
  const sampled = result ? sampleReplay(result, time) : undefined;
  const displayedTrace = sampled?.seed?.events.findLast(
    (e) => e.role === role && e.start <= sampled.local && (e.end > sampled.local || e.start === e.end),
  );
  // Most shifts send in a few rounds of guests, one after another; this is the one on screen.
  const round = benching
    ? 1
    : sampled?.seed
      ? level.seeds.findIndex((seed) => seed.id === sampled.seed!.seed_id) + 1
      : (practising ?? 0) + 1;
  // A failed run has already stopped, but its last frame stays up until the code changes.
  const failed = showFailure && !!result && !result.passed;
  // Who is busy and who is waiting, while the run plays or is looked back on: the robot tabs show it.
  const activity = (running || (failed && viewing)) && sampled ? crewActivity(sampled, pauseWords) : undefined;
  // The open robot, while the service is paused on it, or at an earlier moment of a run that slipped.
  const inspected =
    ((running && paused) || (failed && viewing)) && result && sampled
      ? inspectRobot(
          result,
          sampled,
          role,
          source,
          save.settings.text_editor,
          level.service?.fresh,
          pauseWords,
          cargoWords,
        )
      : undefined;
  const firstInstructionLine = source.split('\n').findIndex((line) => line.trim() && !line.trim().startsWith('#'));
  const waitingLine = source.split('\n').findIndex((line) => /^(LISTEN|WAIT )/.test(line.trim()));
  // Keep the marker visible during startup and idle gaps: LISTEN is the real
  // instruction waiting for the next customer when no action is in flight.
  const activeLine =
    (running && (!result || result.passed || held)) || (failed && viewing)
      ? (displayedTrace?.line ?? (waitingLine >= 0 ? waitingLine : firstInstructionLine))
      : -1;
  // The block where it stopped stays marked for as long as the routines are the ones that ran: an edit clears it,
  // and undoing back to them marks it again. Looking at an earlier moment, the block running then is marked instead.
  const failureLine =
    !viewing && evidence && !stale && (evidence.failure.role ?? 'query') === role ? evidence.failure.error_line : -1;
  const instructionProgress =
    displayedTrace && sampled && displayedTrace.end > displayedTrace.start
      ? (sampled.local - displayedTrace.start) / (displayedTrace.end - displayedTrace.start)
      : 0;
  // Any edit puts the last run's result away: it no longer describes this routine.
  const apply = (next: string) => {
    const updated = { ...programs, [role]: next };
    setMarks((m) => ({ ...m, [role]: carryMarks(source, next, m[role]) }));
    setPrograms(updated);
    setResult(null);
    setViewTime(null);
    setFollowing(null);
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
    if (release()) return;
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setStepped(null);
    setViewTime(null);
    setShowFailure(false);
  };
  /**
   * The shift a run plays: the shift itself, or with one bench as a last round, under the rules that bench eases. Each
   * bench is fingerprinted with the shift, so only runs of the same guests under the same rules compare.
   */
  const shiftFor = (practice: number | null, bench = benchOf(practice)) =>
    bench ? easedShift({ ...level, seeds: [...level.seeds, bench] }, bench.eased) : level;
  const benchOf = (practice: number | null) =>
    practice !== null && practice >= level.seeds.length ? played.seeds[practice] : undefined;
  /** Freeze a finished run with the routines and rounds it played, and keep it. */
  const keep = (finished: RunResult, practice: number | null, bench = benchOf(practice)): RunRecord => {
    const rounds = practice === null ? level.seeds.map((_, i) => i) : [bench ? level.seeds.length : practice];
    const record = recordRun(nextRecord.current++, shiftFor(practice, bench), programs, finished, rounds);
    setRecords((kept) => keepRecord(kept, record));
    return record;
  };
  const fail = (record: RunRecord, shift: LevelDefinition = played) => {
    liveRun.current = null;
    setRunning(false);
    setPaused(false);
    setStepped(null);
    setHeld(null);
    setViewTime(null);
    setShowFailure(true);
    setEvidence(evidenceOf(shift, record));
    if (record.result.first_failure?.role) setRole(record.result.first_failure.role);
    onFinish(record);
  };
  /**
   * Start the whole service, practise one round of it, or run a bench; while running, the same call stops it. A
   * bench run of the same guests under the same rules as one before reuses its round, so the two compare.
   */
  const start = (practice: number | null, guests?: ValidationSeed['customers'], eased: readonly BenchEase[] = []) => {
    if (running) {
      stop();
      return;
    }
    let bench: ValidationSeed | undefined;
    if (guests) {
      const same = benches.findIndex(
        (seed) =>
          JSON.stringify(seed.customers) === JSON.stringify(guests) && (seed.eased ?? []).join() === eased.join(),
      );
      bench =
        same >= 0
          ? benches[same]
          : { id: `BENCH_${benches.length + 1}`, customers: [...guests], ...(eased.length && { eased: [...eased] }) };
      if (same < 0) setBenches((kept) => [...kept, bench!]);
      practice = level.seeds.length + (same >= 0 ? same : benches.length);
    }
    const shift = shiftFor(practice, bench);
    const options = practice === null ? {} : { practice: bench ? level.seeds.length : practice };
    // A program that fails as the doors open, like a typo, reports at once instead of after the street intro.
    const opening = createLiveRun(shift, programs, options).advance(STREET_APPROACH_SECONDS);
    if (opening.done && !opening.result.passed) {
      setPractising(practice);
      setResult(opening.result);
      setReplayTime(opening.time);
      setViewTime(null);
      setFollowing(null);
      // A bench just added isn't among the played rounds until the next render.
      const lookIn = bench && !played.seeds.includes(bench) ? { ...played, seeds: [...played.seeds, bench] } : played;
      fail(keep(opening.result, practice, bench), lookIn);
      return;
    }
    liveRun.current = createLiveRun(shift, programs, options);
    setPractising(practice);
    setBestBefore(save.stars[index]);
    setMetBefore(save.challenges?.[index] ?? []);
    setResult(null);
    setEvidence(null);
    setReplayTime(-STREET_APPROACH_SECONDS);
    setViewTime(null);
    setFollowing(null);
    setShowFailure(false);
    setPaused(false);
    setStepped(null);
    setHeld(null);
    setRunning(true);
  };
  /** Put a frame of the live run on screen, and see a finished run through, passed or failed. */
  const show = (frame: LiveFrame) => {
    setResult(frame.result);
    setReplayTime(frame.time);
    setViewTime(null);
    if (!frame.done) return;
    const record = keep(frame.result, practising);
    if (frame.result.passed) {
      liveRun.current = null;
      setRunning(false);
      setPaused(false);
      setStepped(null);
      // Practice can pass, but only the whole service counts.
      if (record.mode === 'service')
        onComplete(frame.result.stars, programs.query, programs, challengesMet(level.challenges, frame.result));
      onFinish(record);
    } else if (pauseAt.slips) {
      // Paused on the moment it went wrong, with the slip open beside the code.
      const slipped = frame.result.execution?.flatMap((round) => round.events.filter((e) => e.error)) ?? [];
      setHeld(record);
      setPaused(true);
      const robot = frame.result.first_failure?.role ?? 'query';
      setStepped({ started: slipped, by: { reason: 'slip', robot } });
      setRole(robot);
    } else fail(record);
  };
  /** Let the crew react to the slip the service is paused on; false when it isn't paused on one. */
  const release = () => {
    if (!held) return false;
    fail(held);
    return true;
  };
  // Everything that has happened in the run so far, to jump between.
  const moments = useMemo(() => (result ? runMoments(result, replayTime) : []), [result, replayTime]);
  const followed = following
    ? result?.events.find((e) => e.seed_id === following.seed && e.customer.customer_id === following.guest)
    : undefined;
  // The followed order's way so far.
  const route = useMemo(
    () => (result && followed ? orderRoute(result, followed, replayTime) : []),
    [result, followed, replayTime],
  );
  const stopWhen = pauseWhen(crew, marks, pauseAt);
  usePlaybackClock(
    running && !paused,
    (elapsed) => {
      const live = liveRun.current;
      if (!live) return;
      const frame = live.advance(elapsed * speed, stopWhen);
      show(frame);
      if (!frame.stopped || frame.done) return;
      // Paused itself, at a mark or a handoff: on the robot that got there, unless the open one did too.
      const by = pausedBy(marks, frame.stopped);
      setPaused(true);
      setStepped({ started: frame.started ?? [], by });
      if (!frame.stopped.some((s) => s.event.role === role)) setRole(by.robot);
    },
    [speed, index, level, programs, practising],
  );
  /**
   * While paused, play on to the next moment one of the robots starts a block or a wait. It plays the clock a
   * continuous run would, so the run ends the same however it was stepped.
   */
  const stepTo = (robots: readonly RobotRole[]) => {
    const live = liveRun.current;
    if (!live || !paused || release()) return;
    const frame = live.step(robots);
    setStepped({ started: frame.started ?? [] });
    show(frame);
  };
  return {
    programs,
    role,
    setRole,
    source,
    result,
    running,
    failed,
    paused,
    /** Pause or play on; playing on puts away what the last step stopped on, or lets the crew react to a slip. */
    setPaused: (next: boolean | ((paused: boolean) => boolean)) => {
      if (!(typeof next === 'function' ? next(paused) : next) && release()) return;
      setStepped(null);
      setViewTime(null);
      setPaused(next);
    },
    held: !!held,
    crew,
    marks,
    /** Mark the open robot's block to pause at, or take its mark off. */
    toggleMark: (line: number) => setMarks((m) => toggleMark(m, role, line)),
    clearMarks: () => setMarks(noMarks),
    pauseAt,
    setPauseAt,
    stepTo,
    stepped,
    speed,
    setSpeed,
    time,
    /** The café at the moment on screen, sampled from the run's records. */
    sampled,
    /** How far the run has got: the latest moment there is to look back from. */
    head: replayTime,
    /** Looking at an earlier moment of the run than the latest. */
    viewing,
    /** Look at a moment of the run up to the latest, or back at the latest with nothing. */
    view: (at: number | null) => setViewTime(at === null || at >= replayTime ? null : Math.max(at, 0)),
    moments,
    following,
    /** The followed guest's record, while their order is followed. */
    followed,
    route,
    /** Follow a guest's order through the café, or stop with nothing. */
    follow: setFollowing,
    activeLine,
    failureLine,
    evidence,
    stale,
    instructionProgress,
    round,
    activity,
    inspected,
    /** The time on screen, counted from the start of its round. */
    roundTime: sampled?.local ?? time,
    change,
    undo: () => step('undo'),
    redo: () => step('redo'),
    canUndo: !running && history.past.length > 0,
    canRedo: !running && history.future.length > 0,
    run: () => start(null),
    /** Play one round, counting from 0, with the routines as they are now: practice, never stars. */
    practise: (round: number) => start(round),
    /** Play a round of guests the player wrote, with the routines as they are now, and any rules eased: never stars. */
    bench: (guests: ValidationSeed['customers'], eased?: readonly BenchEase[]) => start(null, guests, eased),
    practising,
    /** The run on screen plays a bench. */
    benching,
    /** How many rounds the run on screen plays through, as the player counts them. */
    rounds: benching ? 1 : level.seeds.length,
    /** The shift with every bench run this visit as further rounds, to look a run's guests up in. */
    played,
    records,
    stop,
    bestBefore,
    metBefore,
  };
}
