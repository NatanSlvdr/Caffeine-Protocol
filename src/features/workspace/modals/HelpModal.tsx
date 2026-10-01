import { ArrowRight, MessageCircle } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { indentSource, ROBOT_DISPLAY_NAMES, type LevelDefinition, type RobotPrograms, type RobotRole } from '@/domain';
import { pad2 } from '@/shared/lib/format';
import type { ShiftBrief } from '../Workspace';

export interface HelpModalProps {
  index: number;
  title: string;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  level: LevelDefinition;
  role: RobotRole;
  observation: boolean;
  running: boolean;
  showSolution: boolean;
  onToggleSolution: () => void;
  onUseExample: (source: string) => void;
  onReplayIntro: () => void;
  onClose: () => void;
}

/** Shift field notes: lesson, goal, star targets, and the worked example. */
export function HelpModal({
  index,
  title,
  lesson,
  brief,
  level,
  role,
  observation,
  running,
  showSolution,
  onToggleSolution,
  onUseExample,
  onReplayIntro,
  onClose,
}: HelpModalProps) {
  const example = lesson.robotSolution?.[role] ?? lesson.solution;
  return (
    <Modal
      className="settings-window confirm-slip help-slip"
      kicker={`Shift ${pad2(index + 1)} · Field notes`}
      title={title}
      onClose={onClose}
    >
      <div className="lesson-note">{lesson.note}</div>
      <p>{brief.story}</p>
      <button className="settings-chip help-replay-intro" disabled={running} onClick={onReplayIntro}>
        <MessageCircle size={14} aria-hidden="true" /> Replay the intro
      </button>
      <p>
        <strong>Your goal:</strong> {brief.objective}
      </p>
      {!observation && (
        <>
          <dl className="help-targets">
            <div>
              <dt>
                <span aria-hidden="true">★</span>
                <span className="sr-only">One star</span>
              </dt>
              <dd>
                Every ticket correct<small>Every guest gets what they asked for</small>
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">★★</span>
                <span className="sr-only">Two stars</span>
              </dt>
              <dd>
                {level.block_target} blocks or fewer<small>A short routine is easy to change</small>
              </dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">★★★</span>
                <span className="sr-only">Three stars</span>
              </dt>
              <dd>
                {level.instruction_target} steps or fewer<small>Fewer steps, shorter waits</small>
              </dd>
            </div>
          </dl>
          <div className="modal-buttons help-example-actions">
            <button className="settings-chip" aria-expanded={showSolution} onClick={onToggleSolution}>
              {showSolution ? 'Hide worked example' : 'Reveal worked example'}
            </button>
            {showSolution && (
              <Button
                variant="primary"
                disabled={running}
                onClick={() => {
                  onUseExample(example);
                }}
              >
                Use this example <ArrowRight size={15} />
              </Button>
            )}
          </div>
          {showSolution && (
            <>
              {lesson.robotSolution && (
                <p className="code-example-label">
                  {ROBOT_DISPLAY_NAMES[role]}’s routine · the other robots keep theirs
                </p>
              )}
              <pre className="code-example">{indentSource(example)}</pre>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
