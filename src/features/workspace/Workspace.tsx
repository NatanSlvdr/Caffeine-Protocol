import { useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { BLOCK_SECONDS, ROBOT_AREA_LABELS, ROBOT_DISPLAY_NAMES, UNLOCKS, robotUnlocked } from '@/domain';
import type { DialogueLine, FailureCode, LevelDefinition, ProgressSave, RobotPrograms, RobotRole } from '@/domain';
import { Cafe, CodingPaneHeader, DialogueBox, Editor, RobotOptions } from '@/components';
import { resetRobotPrograms, saveRobotDraft } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { go } from '@/shared/lib/navigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { reclaimFocus } from '@/shared/lib/focus';
import { pad2 } from '@/shared/lib/format';
import { useLiveRun } from './useLiveRun';
import { PlaybackToolbar } from './PlaybackToolbar';
import { FailureCard } from './FailureCard';
import { PracticeCard } from './PracticeCard';
import { FirstRoutineTips } from './FirstRoutineTips';
import { firstRoutineStep } from './firstRoutine';
import { HandoverCard } from './HandoverCard';
import { RobotInspector } from './RobotInspector';
import { startedWords } from './inspector';
import { ReplayTimeline } from './ReplayTimeline';
import { OrderRoute } from './OrderRoute';
import { followable, guestName, routeDone } from './route';
import { whenWords } from './timeline';
import { markCount, pauseReason } from './breakpoints';
import { handoverFor } from './handover';
import { isStale } from './evidence';
import { HelpModal } from './modals/HelpModal';
import { OptionsModal } from './modals/OptionsModal';
import { RestoreModal } from './modals/RestoreModal';
import { routineVersions, sameRoutine } from './versions';
import { ReceiptModal } from './modals/ReceiptModal';
import { problemReport } from './report';
import { failureLines, successLines } from './reactions';

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
}

export interface WorkspaceProps {
  index: number;
  save: ProgressSave;
  update: (updater: (save: ProgressSave) => ProgressSave) => void;
  lessons: LessonCatalog;
  shift: WorkspaceShift;
  /** The next shift's title, or nothing on the last shift. */
  nextShift?: string;
  onNext: () => void;
  onComplete: (stars: number, querySource: string, programs: RobotPrograms) => void;
}

/** Shift workspace layout: scene panel, editor panel, playback, and modals. Run state lives in useLiveRun. */
export function Workspace({ index, save, update, lessons, shift, nextShift, onNext, onComplete }: WorkspaceProps) {
  const { level, lesson, brief, intro, outro } = shift;
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
  const setTips = (on: boolean) => update((s) => ({ ...s, settings: { ...s.settings, first_routine_tips: on } }));
  // The card that started a run goes with it: focus carries on at the run button, which now stops the run.
  const startFromCard = (start: () => void) => {
    start();
    document.querySelector<HTMLElement>('.playback-toolbar .run-button')?.focus();
  };
  // “Show where it stopped”, or a hint's “Show this block”, opens the robot the block belongs to; once its routine is
  // on screen, focus goes to the block, or in the text view to the start of its line.
  const [seeking, setSeeking] = useState<number | null>(null);
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
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
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
  const pausedAt = whenWords(level.seeds.length, round, roundTime);
  // A failed run has already stopped, but the café holds its last frame for the crew's reaction.
  const serviceView = running || failed;
  // The round the followed guest came in, to time their order's way from its start.
  const followedRound = followed && (result?.execution ?? []).find((r) => r.seed_id === followed.seed_id);
  const firstHeard = result?.first_failure && heard.get(result.first_failure.code);
  const reaction =
    scene === 'failure' && failed && result
      ? failureLines(result, role, shortRepeats && firstHeard !== undefined && firstHeard !== records.at(-1)?.id)
      : scene === 'success' && result?.passed
        ? successLines(result, role, index, level, outro, briefSuccess)
        : undefined;
  // The run can be looked back through: paused, or slipped once the crew has had their say.
  const lookBack = ((running && paused) || (failed && !reaction)) && !observation && !!result && head > 0;
  return (
    <main className="workspace-main">
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
              <ArrowLeft size={14} aria-hidden="true" /> Campaign <span aria-hidden="true">/</span> Shift{' '}
              {pad2(index + 1)}
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
          <div className="scene-space">
            <Cafe
              evening={index > 10}
              result={result ?? undefined}
              time={time}
              reduced={reduced}
              pixelArt={save.settings.pixel_art}
              showLabels={!serviceView && !modal && !observation}
              moving={running && !paused}
              serviceView={serviceView}
              focusRole={focused ? role : undefined}
              level={index + 1}
              follow={serviceView && following ? following : undefined}
            />
            {serviceView && followed && followedRound && result && (
              <OrderRoute
                name={guestName(level, followed)}
                guest={followed}
                route={route}
                done={routeDone(
                  route,
                  level.service?.clearing ?? true,
                  followedRound.start + followedRound.duration <= head,
                )}
                round={level.seeds.findIndex((seed) => seed.id === followed.seed_id) + 1}
                rounds={level.seeds.length}
                start={followedRound.start}
                time={time}
                level={index + 1}
                onView={lookBack ? live.view : undefined}
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
                rounds={level.seeds.length}
                when={pausedAt}
                crew={crew}
                role={role}
                programs={programs}
                textMode={textMode}
                onView={live.view}
                followable={followable(level, result, head)}
                following={following ?? undefined}
                onFollow={follow}
              />
            )}
          </div>
          <PlaybackToolbar
            running={running}
            observation={observation}
            paused={paused}
            pausable={running && (!!result?.passed || held)}
            speed={speed}
            round={round}
            rounds={level.seeds.length}
            practice={practising !== null}
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
              onPractise={() => startFromCard(() => practise(evidence.round - 1))}
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
          kicker={`Shift ${pad2(index + 1)} · ${shift.title}`}
          doneLabel="Start the shift"
          instant={reduced}
          onDone={() => setScene('')}
        />
      )}
      {modal === 'help' && (
        <HelpModal
          index={index}
          title={shift.title}
          lesson={lesson}
          brief={brief}
          level={level}
          role={role}
          source={source}
          opening={resetRobotPrograms(save, index, lessons)[role]}
          observation={observation}
          running={running}
          hints={hints}
          onHints={setHints}
          evidence={evidence}
          stale={stale}
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
      {modal === 'receipt' && result?.passed && (
        <ReceiptModal
          index={index}
          level={level}
          result={result}
          observation={observation}
          nextShift={nextShift}
          best={live.bestBefore}
          onNext={onNext}
          onClose={() => setModal('')}
        />
      )}
    </main>
  );
}
