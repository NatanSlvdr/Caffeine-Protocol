import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Captions, Footprints, Store } from 'lucide-react';
import {
  BLOCK_SECONDS,
  LOUS_DECOR,
  ROBOT_AREA_LABELS,
  ROBOT_DISPLAY_NAMES,
  UNLOCKS,
  decorOf,
  isBenchSeed,
  robotUnlocked,
} from '@/domain';
import type { DialogueLine, FailureCode, LevelDefinition, ProgressSave, RobotPrograms, RobotRole } from '@/domain';
import { Cafe, CodingPaneHeader, DialogueBox, Editor, RobotOptions, type TakeSnapshot } from '@/components';
import { resetRobotPrograms, saveRobotDraft } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { go } from '@/shared/lib/navigation';
import { downloadBlob, photoFileName } from '@/shared/lib/download';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { reclaimFocus } from '@/shared/lib/focus';
import { pad2 } from '@/shared/lib/format';
import { useLiveRun, type LiveRunArgs } from './useLiveRun';
import { drillFor, type WorkspaceDrill } from './hints';
import { PlaybackToolbar } from './PlaybackToolbar';
import { FailureCard } from './FailureCard';
import { PracticeCard } from './PracticeCard';
import { easedWords } from './bench';
import { FirstRoutineTips } from './FirstRoutineTips';
import { firstRoutineStep } from './firstRoutine';
import { HandoverCard } from './HandoverCard';
import { RobotInspector } from './RobotInspector';
import { startedWords } from './inspector';
import { ReplayTimeline } from './ReplayTimeline';
import { OrderRoute } from './OrderRoute';
import { BlockPreviewNote } from './BlockPreviewNote';
import { useBlockPreview } from './blockPreview';
import { ServiceSummary } from './ServiceSummary';
import { summarize, useServiceAnnouncements } from './serviceWords';
import { followable, guestName, routeDone } from './route';
import { counterLines } from './counterLines';
import { whenWords } from './timeline';
import { markCount, pauseReason } from './breakpoints';
import { handoverFor } from './handover';
import { isStale } from './evidence';
import { HelpModal } from './modals/HelpModal';
import { OptionsModal } from './modals/OptionsModal';
import { RestoreModal } from './modals/RestoreModal';
import { NotebookModal } from './modals/NotebookModal';
import { BenchModal } from './modals/BenchModal';
import { routineVersions, sameRoutine } from './versions';
import { ReceiptModal, type Onward } from './modals/ReceiptModal';
import { CompareModal } from './modals/CompareModal';
import { comparableTo, latestPair } from './compare';
import { problemReport } from './report';
import { failureLines, successLines } from './reactions';
import { PhotoBar } from './PhotoBar';
import { framePhoto, photoCaption, photoFocus, type PhotoView } from './photo';

export interface ShiftBrief {
  story: string;
  objective: string;
  /** The idea behind the shift, Help's first hint. */
  concept: string;
}

export interface WorkspaceShift {
  level: LevelDefinition;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  /** The café scene that opens the shift. */
  intro: DialogueLine[];
  /** The scene that pays a passed shift off, before the star verdict. */
  outro: DialogueLine[];
  title: string;
  /** What the shift is called beside its title, for a special or a memory: the campaign's shifts go by number. */
  label?: string;
  /** A special's or a memory's last word on the receipt, where a campaign shift names the next one. */
  thanks?: string;
  /** A memory from Lou's café, before Niko's time: the café is drawn in the faded colours of an old photo. */
  memory?: boolean;
}

export interface WorkspaceProps {
  index: number;
  save: ProgressSave;
  update: (updater: (save: ProgressSave) => ProgressSave) => void;
  lessons: LessonCatalog;
  shift: WorkspaceShift;
  /** The next shift's title, or nothing on the last shift. */
  nextShift?: string;
  /** The receipt's way on when it can also stop there, like a wave of the Long Day. */
  onward?: Onward;
  onNext: () => void;
  onComplete: LiveRunArgs['onComplete'];
  /** Every drill; Help names one whose shift is served when the last run missed its idea. */
  drills?: readonly WorkspaceDrill[];
}

/** Shift workspace layout: scene panel, editor panel, playback, and modals. Run state lives in useLiveRun. */
export function Workspace({
  index,
  save,
  update,
  lessons,
  shift,
  nextShift,
  onward,
  onNext,
  onComplete,
  drills = [],
}: WorkspaceProps) {
  const { level, lesson, brief, intro, outro } = shift;
  const label = shift.label ?? `Shift ${pad2(index + 1)}`;
  const reduced = useReducedMotion(save.settings.reduced_motion);
  const observation = index + 1 < UNLOCKS.query;
  const textMode = save.settings.text_editor;
  const [modal, setModal] = useState(''),
    [hints, setHints] = useState(0);
  const [zoomToRobot, setZoomToRobot] = useState(!observation);
  // A finished service pulls back to the whole café before the crew cheers and the receipt comes.
  const [wrapUp, setWrapUp] = useState(false);
  // The cheer waits on its own, so picking a robot's camera during the pull-back doesn't call it off.
  const [cheer, setCheer] = useState(false);
  const focused = zoomToRobot && !observation && !wrapUp;
  // With shorter repeats on, a shift already served or worked on opens straight on the code; Help replays its intro.
  const shortRepeats = save.settings.short_repeats;
  const seen = save.stars[index] !== undefined || save.robotDrafts[index] !== undefined;
  // The shift opens on its scene; a finished run answers with the crew's reaction.
  const [scene, setScene] = useState<'intro' | 'failure' | 'success' | ''>(shortRepeats && seen ? '' : 'intro');
  // Each slip the crew has reacted to on this visit, by the run it first came in: shorter repeats keep any later run's
  // reaction to the reaction alone.
  const [heard, setHeard] = useState<ReadonlyMap<FailureCode, number>>(new Map());
  // A finished scene takes its focused button with it; carry on from the shift's title. After the crew's reaction
  // to a failed run, the block where the service stopped is the place to carry on from, ready to fix. The text
  // view stays on the title: focusing its textarea would raise a tablet's keyboard.
  useEffect(() => {
    if (scene) return;
    if (document.activeElement === document.body)
      (document.getElementsByClassName('block failure')[0] as HTMLElement | undefined)?.focus();
    reclaimFocus();
  }, [scene]);
  const live = useLiveRun({
    index,
    level,
    save,
    lessons,
    onDraft: (updated) => update((s) => saveRobotDraft(s, index, updated)),
    onComplete,
    onFinish: (record) => {
      // Practice that goes right says so beside the code; the cheer and the receipt are for the whole service.
      const code = record.result.first_failure?.code;
      if (code) setHeard((codes) => (codes.has(code) ? codes : new Map(codes).set(code, record.id)));
      if (!record.result.passed) setScene('failure');
      else if (record.mode === 'service') {
        setWrapUp(true);
        setCheer(true);
      }
    },
  });
  const {
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
    head,
    sampled,
    viewing,
    moments,
    activeLine,
    failureLine,
    evidence,
    stale,
    instructionProgress,
    round,
    activity,
    inspected,
    roundTime,
    stepped,
    held,
    crew,
    marks,
    change,
    run,
    practise,
    practising,
    benching,
    rounds,
    played,
    records,
    programs,
    following,
    followed,
    route,
    follow,
  } = live;
  // Practice that went right, while the routines are still the ones it ran.
  const practised = records.at(-1);
  const practiceCard =
    !running && practised?.mode === 'practice' && practised.result.passed && !isStale(practised, programs)
      ? practised
      : undefined;
  // The earlier versions of the open routine that Workspace options can restore.
  const versions = observation ? [] : routineVersions(save, index, lessons, role, ROBOT_DISPLAY_NAMES[role]);
  // A robot's routine has been broken since it last served this shift: the failure card offers the way back.
  const servedBefore = (robot: RobotRole) => {
    const served = save.robotSolutions[index]?.[robot];
    return !!served && !sameRoutine(served, programs[robot]);
  };
  // A shift served before has had its payoff: shorter repeats keep the cheer to Niko's verdict.
  const briefSuccess = shortRepeats && live.bestBefore !== undefined;
  // The first shift with a routine to write teaches it step by step, until it's served or the player hides the tips.
  const firstRoutine = index + 1 === UNLOCKS.query && save.stars[index] === undefined;
  // A robot's first shift sets out the job it takes over from a helper, on its own tab, until the shift is served.
  const handover = save.stars[index] === undefined ? handoverFor(index + 1) : undefined;
  // The regulars the counter recognises, and what it says back to them.
  const regularLines = useMemo(() => counterLines(level, index + 1), [level, index]);
  const setTips = (on: boolean) => update((s) => ({ ...s, settings: { ...s.settings, first_routine_tips: on } }));
  // The card that started a run goes with it: focus carries on at the run button, which now stops the run.
  const startFromCard = (start: () => void) => {
    start();
    document.querySelector<HTMLElement>('.playback-toolbar .run-button')?.focus();
  };
  // “Show where it stopped”, or a hint's “Show this block”, opens the robot the block belongs to; once its routine is
  // on screen, focus goes to the block, or in the text view to the start of its line.
  const [seeking, setSeeking] = useState<number | null>(null);
  // The block last focused in the routine, or the text view's line, by robot: what the café's preview shows.
  const [selected, setSelected] = useState<{ role: RobotRole; line: number } | null>(null);
  const select = (line: number) =>
    setSelected((current) => (current?.role === role && current.line === line ? current : { role, line }));
  useEffect(() => {
    if (seeking === null) return;
    setSeeking(null);
    const block = document.querySelector<HTMLElement>(`.editor-panel .block[data-line="${seeking}"]`);
    if (block) {
      block.focus();
      block.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
      return;
    }
    const text = document.querySelector<HTMLTextAreaElement>('.editor-panel .code-input');
    if (!text) return;
    const at = source.split('\n').slice(0, seeking).join('\n').length + (seeking ? 1 : 0);
    text.focus();
    text.setSelectionRange(at, at);
  }, [seeking]);
  // Undo and redo change the code out of sight of whatever has focus, so a screen reader hears what happened.
  const [historySaid, sayHistory] = useAnnouncement();
  const stepHistory = (direction: 'undo' | 'redo') => {
    const robot = ROBOT_DISPLAY_NAMES[role];
    if (live[direction]()) sayHistory(`${direction === 'undo' ? 'Undid' : 'Redid'} an edit to ${robot}’s routine.`);
    else sayHistory(`Nothing to ${direction} in ${robot}’s routine.`);
  };

  // A new service puts the last one's reaction away: run again from under it, and it would talk over the new run.
  useEffect(() => {
    if (!running) return;
    setWrapUp(false);
    setCheer(false);
    setScene((current) => (current === 'intro' ? current : ''));
  }, [running]);
  useEffect(() => {
    if (!cheer) return;
    const timer = setTimeout(
      () => {
        setCheer(false);
        // A watched shift served before has nothing new to say: its receipt comes straight away.
        if (briefSuccess && observation) setModal('receipt');
        else setScene('success');
      },
      reduced ? 0 : 900,
    );
    return () => clearTimeout(timer);
  }, [cheer]);
  const closeReaction = () => {
    if (scene === 'success') setModal('receipt');
    setScene('');
  };
  // A service can be paused once it has passed or is held for looking into; one on its way to a slip plays out.
  const pausable = running && (!!result?.passed || held);
  // Photo mode: the café alone and held still, framed one of a few ways, to save as a picture. It leaves the service
  // as it found it, playing on if it was playing, on the camera view it was on.
  const [photo, setPhoto] = useState<{ resume: boolean } | null>(null);
  const [photoView, setPhotoView] = useState<PhotoView>('cafe');
  const [developing, setDeveloping] = useState(false);
  const [photoSaid, sayPhoto] = useAnnouncement();
  const snapshot = useRef<TakeSnapshot | null>(null);
  const photoButton = useRef<HTMLButtonElement>(null);
  // Not over a scene, a reaction or a window, nor while the crew cheers; a service only once it can be held still.
  const photographable = !modal && !scene && !cheer && (!running || pausable);
  const enterPhoto = () => {
    setPhoto({ resume: running && !paused });
    if (running) setPaused(true);
    // The framing starts from the view on screen.
    setPhotoView(focused ? role : 'cafe');
    sayPhoto('');
  };
  const leavePhoto = () => {
    if (photo?.resume) setPaused(false);
    setPhoto(null);
  };
  // Back from photo mode, focus returns to the button that opened it, once it is shown again.
  const leftPhoto = useRef(false);
  useEffect(() => {
    if (photo) leftPhoto.current = true;
    else if (leftPhoto.current) {
      leftPhoto.current = false;
      photoButton.current?.focus();
    }
  }, [photo]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      // Photo mode keeps every shortcut but its own way out: the routines and the service are put away under it.
      if (photo) {
        if (e.key === 'Escape' && !e.repeat) {
          e.preventDefault();
          leavePhoto();
        }
        return;
      }
      // Ctrl/⌘+Z undoes and Ctrl/⌘+Shift+Z or Ctrl+Y redoes, in a text field too: the routine's own history replaces
      // the browser's, which knows nothing of block edits. A drag in progress claims the keys first.
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (key === 'z' || (key === 'y' && e.ctrlKey && !e.metaKey))) {
        if (modal || scene === 'intro' || observation || e.defaultPrevented) return;
        e.preventDefault();
        if (!running) stepHistory(key === 'y' || e.shiftKey ? 'redo' : 'undo');
        return;
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (modal || scene === 'intro') return;
        e.preventDefault();
        // A held shortcut runs once, rather than starting and stopping the service on every repeat.
        if (!e.repeat) run();
      }
      // Menus and drags claim their own Escape; only an unclaimed one leaves the shift.
      // A held Escape acts once too: skipping the intro, stopping a service or stepping out of a field never runs on
      // into leaving the shift.
      if (e.key === 'Escape' && !e.repeat && !modal && !e.defaultPrevented) {
        // In a text field it only steps out of the field, so typing code never drops the player back to the menu.
        // Focus stays in place for the keyboard: a block's number field hands it to its block, the text view to the
        // routine's robot tab.
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          const field = e.target;
          const tab = field.closest('[role="tabpanel"]')?.getAttribute('aria-labelledby');
          const place =
            field.parentElement?.closest<HTMLElement>('[data-line]') ?? (tab && document.getElementById(tab));
          field.blur();
          if (place) place.focus();
        }
        // The crew's reaction closes first, the way its Skip button does, even with focus back in the code.
        else if (reaction) closeReaction();
        // A running service stops first, the way Stop & edit does, rather than dropping the player on the menu.
        else if (running) run();
        else go('/campaign');
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  // When the service is paused: the round, if the shift has more than one, and the time into it.
  const pausedAt = whenWords(rounds, round, roundTime);
  // A failed run has already stopped, but the café holds its last frame for the crew's reaction.
  const serviceView = running || failed;
  // The round the followed guest came in, to time their order's way from its start.
  const followedRound = followed && (result?.execution ?? []).find((r) => r.seed_id === followed.seed_id);
  // The café can show where the block picked in the routine goes, while the routine is being written.
  const previewOn = save.settings.block_preview && !observation;
  const previewing = previewOn && !serviceView;
  const { preview, note } = useBlockPreview({
    level,
    shift: index + 1,
    programs,
    role,
    line: previewing && selected?.role === role ? selected.line : null,
    textMode,
  });
  // The café in words beside the scene while the service plays or is looked back on, and what happens said aloud.
  const summaryOn = save.settings.service_summary;
  const summary =
    summaryOn && serviceView && result && sampled ? summarize(result, sampled, played, index + 1) : undefined;
  const told = useServiceAnnouncements({
    on: summaryOn,
    result,
    level: played,
    shift: index + 1,
    head,
    playing: running && !paused,
    speed,
  });
  // An event looked back on, an order's leg or a moment on the timeline, opens the routine of the robot that did it,
  // where the marker is on the very block it began on.
  const showRobot = (event: { role?: RobotRole; actor?: string }) => {
    if (event.role && event.actor !== 'niko' && crew.includes(event.role)) setRole(event.role);
  };
  const firstHeard = result?.first_failure && heard.get(result.first_failure.code);
  const reaction =
    scene === 'failure' && failed && result
      ? failureLines(
          result,
          role,
          shortRepeats && firstHeard !== undefined && firstHeard !== records.at(-1)?.id,
          save.robotSolutions[index],
        )
      : scene === 'success' && result?.passed
        ? successLines(result, role, index, level, outro, briefSuccess, live.bestBefore)
        : undefined;
  // The latest run before the one just served that played the same rounds, for the receipt to compare with.
  const latest = records.at(-1);
  const receiptPair = latest && comparableTo(records, latest).find((r) => r.id < latest.id);
  // The run can be looked back through: paused, or slipped once the crew has had their say.
  const lookBack = ((running && paused) || (failed && !reaction)) && !observation && !!result && head > 0;
  const savePhoto = async () => {
    setDeveloping(true);
    try {
      const shot = await snapshot.current?.();
      if (!shot) {
        sayPhoto('The café couldn’t be photographed just now. Try again in a moment.');
        return;
      }
      const caption = photoCaption({ label, title: shift.title, when: serviceView ? pausedAt : undefined });
      const name = photoFileName();
      downloadBlob(await framePhoto(shot, caption, { memory: shift.memory }), name);
      sayPhoto(`Saved as ${name}. Look for it with your downloads.`);
    } finally {
      setDeveloping(false);
    }
  };
  return (
    <main className={'workspace-main' + (shift.memory ? ' memory' : '') + (photo ? ' photo' : '')}>
      <div className={'workbench' + (result && !result.passed ? ' has-failure' : '')}>
        <section className="cafe-panel">
          <div className="workspace-heading">
            {/* Esc stands in for this button whenever it isn't stopping a service or closing the crew's reaction. */}
            <button
              className="breadcrumb"
              aria-keyshortcuts={running || reaction ? undefined : 'Escape'}
              onClick={() => go('/campaign')}
            >
              {/* Read as "Campaign Shift 03": the arrow and the slash are only drawn. */}
              <ArrowLeft size={14} aria-hidden="true" /> Campaign <span aria-hidden="true">/</span> {label}
            </button>
            <div className="heading-tools">
              {!observation && (
                <button
                  type="button"
                  className="heading-toggle preview-toggle"
                  aria-pressed={save.settings.block_preview}
                  title="Show where the picked Move, Take, Deposit or Use block goes in the café"
                  onClick={() =>
                    update((s) => ({ ...s, settings: { ...s.settings, block_preview: !s.settings.block_preview } }))
                  }
                >
                  <Footprints size={16} aria-hidden="true" />
                  <span>Block paths</span>
                </button>
              )}
              <button
                ref={photoButton}
                type="button"
                className="heading-toggle photo-toggle"
                aria-label="Photo mode"
                title={
                  photographable
                    ? 'Hold the café still and save a photo of it, without the routines'
                    : 'Photos are taken with the scene and windows closed, and a service paused'
                }
                disabled={!photographable}
                onClick={enterPhoto}
              >
                <Camera size={16} aria-hidden="true" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                className="heading-toggle summary-toggle"
                aria-pressed={summaryOn}
                title="Tell the service in words: the guests, the crew, the counters, and what happens as it plays"
                onClick={() =>
                  update((s) => ({ ...s, settings: { ...s.settings, service_summary: !s.settings.service_summary } }))
                }
              >
                <Captions size={16} aria-hidden="true" />
                <span>Café in words</span>
              </button>
              <div className="view-controls" role="group" aria-label="Camera view">
                <button type="button" title="Full café" aria-pressed={!focused} onClick={() => setZoomToRobot(false)}>
                  <Store size={16} aria-hidden="true" />
                  Full café
                </button>
                <RobotOptions
                  level={index + 1}
                  selected={focused ? role : undefined}
                  labels={ROBOT_AREA_LABELS}
                  onSelect={(robot) => {
                    setRole(robot);
                    setZoomToRobot(true);
                    setWrapUp(false);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="scene-space">
            <Cafe
              evening={index > 10}
              result={result ?? undefined}
              time={time}
              reduced={reduced}
              pixelArt={save.settings.pixel_art}
              showLabels={!serviceView && !modal && !observation && !photo}
              showStatusBubbles={!photo}
              moving={running && !paused}
              serviceView={serviceView}
              focusRole={photo ? photoFocus(photoView) : focused ? role : undefined}
              level={index + 1}
              follow={serviceView && following && !photo ? following : undefined}
              preview={photo ? undefined : preview}
              counterLines={regularLines}
              // A memory is Lou's café two winters ago, before any of the café's own looks.
              decor={shift.memory ? LOUS_DECOR : decorOf(save)}
              snapshot={snapshot}
            />
            {previewing && <BlockPreviewNote note={note} textMode={textMode} />}
            {summary && (
              <ServiceSummary
                summary={summary}
                when={
                  running && !paused
                    ? rounds > 1
                      ? `Round ${round} of ${rounds}`
                      : benching
                        ? 'Running the bench'
                        : 'Playing'
                    : pausedAt
                }
              />
            )}
            <p className="sr-only" aria-live="polite">
              {told}
            </p>
            {serviceView && followed && followedRound && result && (
              <OrderRoute
                name={guestName(played, followed)}
                guest={followed}
                route={route}
                done={routeDone(
                  route,
                  level.service?.clearing ?? true,
                  followedRound.start + followedRound.duration <= head,
                )}
                round={benching ? 1 : level.seeds.findIndex((seed) => seed.id === followed.seed_id) + 1}
                rounds={rounds}
                start={followedRound.start}
                time={time}
                level={index + 1}
                onView={
                  lookBack
                    ? (at, leg) => {
                        live.view(at);
                        showRobot(leg);
                      }
                    : undefined
                }
                onStop={() => follow(null)}
              />
            )}
            {reaction && (
              <DialogueBox
                key={`${scene}-${result?.first_failure?.reason}`}
                variant="aside"
                lines={reaction}
                instant={reduced}
                doneLabel={scene === 'success' ? 'See the receipt' : 'Back to the code'}
                onDone={closeReaction}
              />
            )}
            {lookBack && result && (
              <ReplayTimeline
                head={head}
                time={time}
                viewing={viewing}
                moments={moments}
                roundStarts={(result.execution ?? []).map((r) => r.start).filter((start) => start > 0 && start < head)}
                rounds={rounds}
                when={pausedAt}
                crew={crew}
                role={role}
                programs={programs}
                textMode={textMode}
                onView={live.view}
                onMoment={(moment) => showRobot(moment.event)}
                followable={followable(played, result, head)}
                following={following ?? undefined}
                onFollow={follow}
              />
            )}
          </div>
          {photo && (
            <PhotoBar
              view={photoView}
              onView={setPhotoView}
              onSave={savePhoto}
              onDone={leavePhoto}
              developing={developing}
              said={photoSaid}
            />
          )}
          <PlaybackToolbar
            running={running}
            observation={observation}
            paused={paused}
            pausable={pausable}
            speed={speed}
            round={round}
            rounds={rounds}
            practice={practising !== null}
            bench={benching}
            eased={benching && practising !== null ? easedWords(played.seeds[practising]?.eased) : ''}
            onRun={run}
            onTogglePause={() => {
              setPaused((p) => !p);
            }}
            robot={observation ? undefined : ROBOT_DISPLAY_NAMES[role]}
            onStep={() => live.stepTo([role])}
            onStepCrew={crew.length > 1 ? () => live.stepTo(crew) : undefined}
            stepped={
              stepped
                ? `${pausedAt}. ${stepped.by ? `${pauseReason(stepped.by)}. ` : ''}${startedWords(stepped.started, crew, programs, textMode)}`
                : undefined
            }
            pauseMenu={
              observation
                ? undefined
                : {
                    pauseAt: live.pauseAt,
                    onPauseAt: live.setPauseAt,
                    marks: markCount(marks, crew),
                    onClearMarks: live.clearMarks,
                    handoffs: crew.length > 1,
                    textMode,
                  }
            }
            onSpeed={(value) => {
              setSpeed(value);
              // The next shift opens at the same pace.
              update((s) => ({ ...s, settings: { ...s.settings, speed: value } }));
            }}
          />
        </section>
        <section className="editor-panel" aria-label={`${ROBOT_DISPLAY_NAMES[role]}’s routine`}>
          <CodingPaneHeader
            shift={shift.title}
            objective={brief.objective}
            story={brief.story}
            onHelp={() => setModal('help')}
            onOptions={() => setModal('options')}
            onNotebook={observation ? undefined : () => setModal('notebook')}
            onBench={observation ? undefined : () => setModal('bench')}
            level={index + 1}
            role={role}
            onRole={(r) => {
              setRole(r);
            }}
            activity={activity}
            history={
              observation
                ? undefined
                : {
                    canUndo: live.canUndo,
                    canRedo: live.canRedo,
                    onUndo: () => stepHistory('undo'),
                    onRedo: () => stepHistory('redo'),
                  }
            }
          />
          <Editor
            role={role}
            source={source}
            onChange={change}
            level={index + 1}
            locked={running}
            observation={observation}
            activeLine={activeLine}
            instructionProgress={instructionProgress}
            stepSeconds={BLOCK_SECONDS / speed}
            failureLine={failureLine}
            textMode={textMode}
            tabbed
            marks={marks[role]}
            onMark={observation ? undefined : live.toggleMark}
            onSelect={select}
          />
          {inspected && !observation && (
            <RobotInspector
              state={inspected}
              reads={role === 'query' ? 'guest' : 'ticket'}
              when={pausedAt}
              earlier={viewing}
              reason={viewing ? undefined : stepped?.by && pauseReason(stepped.by)}
            />
          )}
          {firstRoutine && save.settings.first_routine_tips && (
            <FirstRoutineTips
              step={firstRoutineStep(programs.query, records.length > 0)}
              onHide={() => {
                setTips(false);
                // The button goes with the tips: focus moves to the options that bring them back, and says so.
                document.querySelector<HTMLElement>('.coding-tools [aria-label="Options"]')?.focus();
                sayHistory('Tips hidden. Workspace options brings them back.');
              }}
            />
          )}
          {handover?.role === role && <HandoverCard handover={handover} source={source} />}
          {/* The crew tells the failure first; the card keeps it once they're done. */}
          {evidence && scene !== 'failure' && (
            <FailureCard
              evidence={evidence}
              stale={stale}
              rounds={level.seeds.length}
              onShowLine={() => {
                setRole(evidence.failure.role ?? 'query');
                setSeeking(evidence.failure.error_line);
              }}
              onPractise={() =>
                startFromCard(() => {
                  const bench = evidence.bench && played.seeds.find((seed) => seed.id === evidence.failure.seed_id);
                  if (bench) live.bench(bench.customers, bench.eased);
                  else practise(evidence.round - 1);
                })
              }
              onCompareServed={
                servedBefore(evidence.failure.role ?? 'query')
                  ? () => {
                      setRole(evidence.failure.role ?? 'query');
                      setModal('restore');
                    }
                  : undefined
              }
              onFollow={
                failed && !stale && result?.events.some((e) => e.customer.customer_id === evidence.failure.customer_id)
                  ? () => follow({ seed: evidence.failure.seed_id, guest: evidence.failure.customer_id })
                  : undefined
              }
            />
          )}
          {practiceCard && (
            <PracticeCard
              round={level.seeds.findIndex((seed) => seed.id === practiceCard.seeds[0]) + 1}
              bench={isBenchSeed(practiceCard.seeds[0])}
              eased={easedWords(played.seeds.find((seed) => seed.id === practiceCard.seeds[0])?.eased)}
              onRunService={() => startFromCard(run)}
            />
          )}
          <p className="sr-only" role="status">
            {historySaid}
          </p>
        </section>
      </div>
      {scene === 'intro' && (
        <DialogueBox
          lines={intro}
          kicker={`${label} · ${shift.title}`}
          doneLabel="Start the shift"
          instant={reduced}
          onDone={() => setScene('')}
        />
      )}
      {modal === 'help' && (
        <HelpModal
          label={label}
          title={shift.title}
          lesson={lesson}
          brief={brief}
          level={level}
          role={role}
          source={source}
          opening={resetRobotPrograms(save, index, lessons)[role]}
          observation={observation}
          running={running}
          challengesMet={save.stars[index] === undefined ? undefined : (save.challenges?.[index] ?? [])}
          hints={hints}
          onHints={setHints}
          evidence={evidence}
          stale={stale}
          drill={drillFor(drills, save.stars, evidence, stale)}
          onShowClue={(show) => {
            setModal('');
            setRole(show.role);
            setSeeking(show.line);
          }}
          onUseExample={(example) => {
            change(example);
            setModal('');
          }}
          onReplayIntro={() => {
            setModal('');
            setScene('intro');
          }}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'options' && (
        <OptionsModal
          robot={ROBOT_DISPLAY_NAMES[role]}
          pixelArt={save.settings.pixel_art}
          textMode={textMode}
          observation={observation}
          running={running}
          restorable={versions.some((version) => !sameRoutine(version.source, source))}
          onTogglePixelArt={(value) => update((s) => ({ ...s, settings: { ...s.settings, pixel_art: value } }))}
          onToggleTextMode={(value) => update((s) => ({ ...s, settings: { ...s.settings, text_editor: value } }))}
          shortRepeats={shortRepeats}
          onToggleShortRepeats={(value) => update((s) => ({ ...s, settings: { ...s.settings, short_repeats: value } }))}
          tips={firstRoutine ? { on: save.settings.first_routine_tips, onToggle: setTips } : undefined}
          onRequestRestore={() => setModal('restore')}
          onCompare={latestPair(records) ? () => setModal('compare') : undefined}
          report={() =>
            problemReport({
              index,
              level,
              programs,
              record: records.at(-1),
              now: new Date(),
              browser: navigator.userAgent,
            })
          }
          onClose={() => setModal('')}
        />
      )}
      {modal === 'restore' && (
        <RestoreModal
          robot={ROBOT_DISPLAY_NAMES[role]}
          alone={!robotUnlocked('prep', index + 1)}
          current={source}
          versions={versions}
          onClose={() => setModal('')}
          onRestore={(version) => {
            change(version.source);
            setModal('');
            sayHistory(
              `${ROBOT_DISPLAY_NAMES[role]}’s routine is back to the ${version.label.toLowerCase()} version. Undo brings yours back.`,
            );
          }}
        />
      )}
      {modal === 'notebook' && (
        <NotebookModal
          role={role}
          shift={index + 1}
          current={source}
          running={running}
          onUse={(page) => {
            change(page.source);
            setModal('');
            sayHistory(`${ROBOT_DISPLAY_NAMES[role]}’s routine is now “${page.name}”. Undo brings yours back.`);
          }}
          onAdd={(page) => {
            change(source.trimEnd() ? `${source.trimEnd()}\n${page.source}` : page.source);
            setModal('');
            sayHistory(`Added “${page.name}” to the end of ${ROBOT_DISPLAY_NAMES[role]}’s routine. Undo takes it out.`);
          }}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'bench' && (
        <BenchModal
          level={level}
          running={running}
          onRun={(customers, eased) => {
            setModal('');
            live.bench(customers, eased);
          }}
          onClose={() => setModal('')}
        />
      )}
      {(modal === 'compare' || modal === 'compare-last') && (
        <CompareModal
          level={played}
          records={records}
          crew={crew}
          initial={modal === 'compare-last' ? records.at(-1) : undefined}
          // Opened from the receipt, it goes back to the receipt, which still has the way on to the next shift.
          onClose={() => setModal(modal === 'compare-last' ? 'receipt' : '')}
        />
      )}
      {modal === 'receipt' && result?.passed && (
        <ReceiptModal
          label={label}
          level={level}
          result={result}
          observation={observation}
          nextShift={nextShift}
          thanks={shift.thanks}
          best={live.bestBefore}
          metBefore={live.metBefore}
          compareWith={observation ? undefined : receiptPair?.id}
          onCompare={() => setModal('compare-last')}
          onward={onward}
          onNext={onNext}
          onClose={() => setModal('')}
        />
      )}
    </main>
  );
}
