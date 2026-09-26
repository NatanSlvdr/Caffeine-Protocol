import { useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { BLOCK_SECONDS, ROBOT_AREA_LABELS, ROBOT_DISPLAY_NAMES } from '@/domain';
import type { LevelDefinition, ProgressSave, RobotPrograms } from '@/domain';
import { Cafe, CodingPaneHeader, Editor, RobotOptions } from '@/components';
import { incomingRobotPrograms, saveRobotDraft } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { go } from '@/shared/lib/navigation';
import { pad2 } from '@/shared/lib/format';
import { useLiveRun } from './useLiveRun';
import { PlaybackToolbar } from './PlaybackToolbar';
import { HelpModal } from './modals/HelpModal';
import { OptionsModal } from './modals/OptionsModal';
import { ResetModal } from './modals/ResetModal';
import { ReceiptModal } from './modals/ReceiptModal';

export interface ShiftBrief {
  story: string;
  objective: string;
}

export interface WorkspaceShift {
  level: LevelDefinition;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  title: string;
}

export interface WorkspaceProps {
  index: number;
  save: ProgressSave;
  update: (updater: (save: ProgressSave) => ProgressSave) => void;
  lessons: LessonCatalog;
  shift: WorkspaceShift;
  saveError: string;
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
  saveError,
  isLastShift,
  onNext,
  onComplete,
  onSound,
}: WorkspaceProps) {
  const { level, lesson, brief } = shift;
  const observation = index < 2;
  const [modal, setModal] = useState(''),
    [textMode, setTextMode] = useState(false),
    [showSolution, setShowSolution] = useState(false);
  const [zoomToRobot, setZoomToRobot] = useState(!observation);
  const live = useLiveRun({
    index,
    level,
    save,
    lessons,
    onDraft: (updated) => update((s) => saveRobotDraft(s, index, updated)),
    onComplete,
    onFinish: (passed) => {
      if (passed) setModal('receipt');
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
    stop,
  } = live;

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (modal) return;
        e.preventDefault();
        run();
      }
      if (e.key === 'Escape' && !modal) go('/campaign');
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  });
  return (
    <main className="workspace-main">
      <div className={'workbench' + (result && !result.passed ? ' has-failure' : '')}>
        <section className="cafe-panel">
          <div className="workspace-heading">
            <button className="breadcrumb" onClick={() => go('/campaign')}>
              <ArrowLeft size={14} /> Campaign <span>/</span> Shift {pad2(index + 1)}
            </button>
            {saveError && (
              <p className="error-text" role="alert">
                {saveError}
              </p>
            )}
            <div className="view-controls" role="group" aria-label="Camera view">
              <button type="button" aria-pressed={!zoomToRobot || observation} onClick={() => setZoomToRobot(false)}>
                <Store size={16} aria-hidden="true" />
                Full café
              </button>
              <RobotOptions
                level={index + 1}
                selected={zoomToRobot && !observation ? role : undefined}
                labels={ROBOT_AREA_LABELS}
                onSelect={(robot) => {
                  setRole(robot);
                  setZoomToRobot(true);
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
              focusRole={zoomToRobot && !observation ? role : undefined}
              level={index + 1}
            />
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
            failureMessage={failureLine >= 0 ? result?.first_failure?.reason : undefined}
            onEdit={stop}
            textMode={textMode}
          />
        </section>
      </div>
      {modal === 'help' && (
        <HelpModal
          index={index}
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
            change(incomingRobotPrograms(save, index, lessons)[role]);
            setModal('');
          }}
        />
      )}
      {modal === 'receipt' && result?.passed && (
        <ReceiptModal
          index={index}
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
