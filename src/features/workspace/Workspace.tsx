import { useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { BLOCK_SECONDS, ROBOT_AREA_LABELS, ROBOT_DISPLAY_NAMES, UNLOCKS } from '@/domain';
import type { DialogueLine, LevelDefinition, ProgressSave, RobotPrograms } from '@/domain';
import { Cafe, CodingPaneHeader, DialogueBox, Editor, RobotOptions } from '@/components';
import { resetRobotPrograms, saveRobotDraft } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { go } from '@/shared/lib/navigation';
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
  title: string;
}

export interface WorkspaceProps {
  index: number;
  save: ProgressSave;
  update: (updater: (save: ProgressSave) => ProgressSave) => void;
  lessons: LessonCatalog;
  shift: WorkspaceShift;
  isLastShift: boolean;
  onNext: () => void;
  onComplete: (stars: number, querySource: string, programs: RobotPrograms) => void;
  onSound: (passed: boolean) => void;
}

/** Shift workspace layout: scene panel, editor panel, playback, and modals. Run state lives in useLiveRun. */
export function Workspace({
  index,
  save,
  update,
  lessons,
  shift,
  isLastShift,
  onNext,
  onComplete,
  onSound,
}: WorkspaceProps) {
  const { level, lesson, brief, intro } = shift;
  const observation = index + 1 < UNLOCKS.query;
  const [modal, setModal] = useState(''),
    [textMode, setTextMode] = useState(false),
    [showSolution, setShowSolution] = useState(false);
  const [zoomToRobot, setZoomToRobot] = useState(!observation);
  // A finished service pulls back to the whole café before the crew cheers and the receipt comes.
  const [wrapUp, setWrapUp] = useState(false);
  const focused = zoomToRobot && !observation && !wrapUp;
  // The shift opens on its scene; a finished run answers with the crew's reaction.
  const [scene, setScene] = useState<'intro' | 'failure' | 'success' | ''>('intro');
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
      onSound(passed);
    },
  });
  const {
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
  } = live;

  useEffect(() => {
    if (running) setWrapUp(false);
  }, [running]);
  useEffect(() => {
    if (!wrapUp) return;
    const timer = setTimeout(() => setScene('success'), save.settings.reduced_motion ? 0 : 900);
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
      if (e.key === 'Escape' && !modal && !e.defaultPrevented) go('/campaign');
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  const reaction =
    scene === 'failure' && running && result && !result.passed
      ? failureLines(result, role)
      : scene === 'success' && result?.passed
        ? successLines(result, role, index)
        : undefined;
  return (
    <main className="workspace-main">
      <div className={'workbench' + (result && !result.passed ? ' has-failure' : '')}>
        <section className="cafe-panel">
          <div className="workspace-heading">
            <button className="breadcrumb" onClick={() => go('/campaign')}>
              <ArrowLeft size={14} /> Campaign <span>/</span> Shift {pad2(index + 1)}
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
              reduced={save.settings.reduced_motion}
              pixelArt={save.settings.pixel_art}
              showLabels={!running && !modal && !observation}
              moving={running && !paused}
              serviceView={running}
              focusRole={focused ? role : undefined}
              level={index + 1}
            />
            {reaction && (
              <DialogueBox
                key={`${scene}-${result?.first_failure?.reason}`}
                variant="aside"
                lines={reaction}
                instant={save.settings.reduced_motion}
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
            onSpeed={(value) => setSpeed(Number(value))}
          />
        </section>
        <section className="editor-panel" aria-label={`${ROBOT_DISPLAY_NAMES[role]} program editor`}>
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
          />
        </section>
      </div>
      {scene === 'intro' && (
        <DialogueBox
          lines={intro}
          kicker={`Shift ${pad2(index + 1)} · ${shift.title}`}
          doneLabel="Start the shift"
          instant={save.settings.reduced_motion}
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
          pixelArt={save.settings.pixel_art}
          textMode={textMode}
          observation={observation}
          running={running}
          onTogglePixelArt={(value) => update((s) => ({ ...s, settings: { ...s.settings, pixel_art: value } }))}
          onToggleTextMode={(value) => setTextMode(value)}
          onRequestReset={() => setModal('reset')}
          onClose={() => setModal('')}
        />
      )}
      {modal === 'reset' && (
        <ResetModal
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
          isLastShift={isLastShift}
          onNext={onNext}
          onClose={() => setModal('')}
        />
      )}
    </main>
  );
}
