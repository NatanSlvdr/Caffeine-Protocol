import { useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { BLOCK_SECONDS, ROBOT_AREA_LABELS, ROBOT_DISPLAY_NAMES, UNLOCKS, robotUnlocked } from '@/domain';
import type { DialogueLine, LevelDefinition, ProgressSave, RobotPrograms } from '@/domain';
import { Cafe, CodingPaneHeader, DialogueBox, Editor, RobotOptions } from '@/components';
import { resetRobotPrograms, saveRobotDraft } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { go } from '@/shared/lib/navigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { reclaimFocus } from '@/shared/lib/focus';
import { pad2 } from '@/shared/lib/format';
import { useLiveRun } from './useLiveRun';
import { PlaybackToolbar } from './PlaybackToolbar';
import { HelpModal } from './modals/HelpModal';
import { OptionsModal } from './modals/OptionsModal';
import { ResetModal } from './modals/ResetModal';
import { ReceiptModal } from './modals/ReceiptModal';
import { failureLines, successLines } from './reactions';

export interface ShiftBrief {
  story: string;
  objective: string;
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
    [showSolution, setShowSolution] = useState(false);
  const [zoomToRobot, setZoomToRobot] = useState(!observation);
  // A finished service pulls back to the whole café before the crew cheers and the receipt comes.
  const [wrapUp, setWrapUp] = useState(false);
  const focused = zoomToRobot && !observation && !wrapUp;
  // The shift opens on its scene; a finished run answers with the crew's reaction.
  const [scene, setScene] = useState<'intro' | 'failure' | 'success' | ''>('intro');
  // A finished scene takes its focused button with it; carry on from the shift's title.
  useEffect(() => {
    if (!scene) reclaimFocus();
  }, [scene]);
  const live = useLiveRun({
    index,
    level,
    save,
    lessons,
    onDraft: (updated) => update((s) => saveRobotDraft(s, index, updated)),
    onComplete,
    onFinish: (passed) => {
      if (passed) setWrapUp(true);
      else setScene('failure');
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
    activeLine,
    failureLine,
    instructionProgress,
    change,
    run,
  } = live;

  useEffect(() => {
    if (running) setWrapUp(false);
  }, [running]);
  useEffect(() => {
    if (!wrapUp) return;
    const timer = setTimeout(() => setScene('success'), reduced ? 0 : 900);
    return () => clearTimeout(timer);
  }, [wrapUp]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (modal || scene === 'intro') return;
        e.preventDefault();
        run();
      }
      // Menus and drags claim their own Escape; only an unclaimed one leaves the shift.
      if (e.key === 'Escape' && !modal && !e.defaultPrevented) {
        // In a text field it only steps out of the field, so typing code never drops the player back to the menu.
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) e.target.blur();
        // A running service stops first, the way Stop & edit does, rather than dropping the player on the menu.
        else if (running) run();
        else go('/campaign');
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  // A failed run has already stopped, but the café holds its last frame for the crew's reaction.
  const serviceView = running || failed;
  const reaction =
    scene === 'failure' && failed && result
      ? failureLines(result, role)
      : scene === 'success' && result?.passed
        ? successLines(result, role, index, level, outro)
        : undefined;
  return (
    <main className="workspace-main">
      <div className={'workbench' + (result && !result.passed ? ' has-failure' : '')}>
        <section className="cafe-panel">
          <div className="workspace-heading">
            <button className="breadcrumb" onClick={() => go('/campaign')}>
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
            />
            {reaction && (
              <DialogueBox
                key={`${scene}-${result?.first_failure?.reason}`}
                variant="aside"
                lines={reaction}
                instant={reduced}
                doneLabel={scene === 'success' ? 'See the receipt' : 'Back to the code'}
                onDone={() => {
                  if (scene === 'success') setModal('receipt');
                  setScene('');
                }}
              />
            )}
          </div>
          <PlaybackToolbar
            running={running}
            observation={observation}
            paused={paused}
            pausable={running && !!result?.passed}
            speed={speed}
            onRun={run}
            onTogglePause={() => {
              setPaused((p) => !p);
            }}
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
          />
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
          showSolution={showSolution}
          onToggleSolution={() => setShowSolution((s) => !s)}
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
          edited={source.trim() !== resetRobotPrograms(save, index, lessons)[role].trim()}
          onTogglePixelArt={(value) => update((s) => ({ ...s, settings: { ...s.settings, pixel_art: value } }))}
          onToggleTextMode={(value) => update((s) => ({ ...s, settings: { ...s.settings, text_editor: value } }))}
          onRequestReset={() => setModal('reset')}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'reset' && (
        <ResetModal
          robot={ROBOT_DISPLAY_NAMES[role]}
          alone={!robotUnlocked('prep', index + 1)}
          onClose={() => setModal('')}
          onConfirm={() => {
            change(resetRobotPrograms(save, index, lessons)[role]);
            setModal('');
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
