import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { indentSource, ROBOT_DISPLAY_NAMES, type LevelDefinition, type RobotPrograms, type RobotRole } from '@/domain';
import { RUN_MODIFIER, pad2 } from '@/shared/lib/format';
import type { ShiftBrief } from '../Workspace';

export interface HelpModalProps {
  index: number;
  title: string;
  lesson: { note: string; solution: string; robotSolution?: RobotPrograms };
  brief: ShiftBrief;
  level: LevelDefinition;
  role: RobotRole;
  /** The open robot's routine as it stands, and as it was when the shift opened. */
  source: string;
  opening: string;
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
  source,
  opening,
  observation,
  running,
  showSolution,
  onToggleSolution,
  onUseExample,
  onReplayIntro,
  onClose,
}: HelpModalProps) {
  const example = lesson.robotSolution?.[role] ?? lesson.solution;
  const robot = ROBOT_DISPLAY_NAMES[role];
  // The example replaces the routine wholesale, so the player's own edits get a second look first, and a reminder
  // that Undo brings them back. The opening routine needs none: Reset brings it back too.
  const edited = ![opening, example].some((kept) => kept.trim() === source.trim());
  // Already the routine: using it again would change nothing.
  const inUse = example.trim() === source.trim();
  const [confirming, setConfirming] = useState(false);
  // Backing out of the warning puts focus back on the button that raised it, not on the page.
  const useButton = useRef<HTMLButtonElement>(null);
  const backingOut = useRef(false);
  useEffect(() => {
    if (confirming || !backingOut.current) return;
    backingOut.current = false;
    useButton.current?.focus();
  }, [confirming]);
  return (
    <Modal
      className="settings-window confirm-slip help-slip"
      kicker={`Shift ${pad2(index + 1)} · Field notes`}
      title={title}
      onClose={onClose}
    >
      <div className="lesson-note">{lesson.note}</div>
      <p>{brief.story}</p>
      <button
        className="settings-chip help-replay-intro"
        disabled={running}
        aria-describedby={running ? 'help-running' : undefined}
        onClick={onReplayIntro}
      >
        <MessageCircle size={14} aria-hidden="true" /> Replay the intro
      </button>
      {/* Greyed-out buttons say why: the café is mid-service. */}
      {running && (
        <p id="help-running" className="help-running">
          Stop the service to replay the intro{!observation && showSolution && !inUse ? ' or use the example' : ''}.
        </p>
      )}
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
          {confirming ? (
            <>
              <p className="help-example-warning" role="alert">
                The example replaces {robot}’s routine. If you change your mind, Undo ({RUN_MODIFIER} Z) brings your
                version back.
              </p>
              <div className="modal-buttons help-example-actions">
                <button
                  className="settings-chip"
                  autoFocus
                  onClick={() => {
                    backingOut.current = true;
                    setConfirming(false);
                  }}
                >
                  Keep my edits
                </button>
                <Button variant="primary" disabled={running} onClick={() => onUseExample(example)}>
                  Replace my edits <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <div className="modal-buttons help-example-actions">
              <button
                className="settings-chip"
                aria-expanded={showSolution}
                aria-controls={showSolution ? 'worked-example' : undefined}
                onClick={() => {
                  setConfirming(false);
                  onToggleSolution();
                }}
              >
                {showSolution ? 'Hide worked example' : 'Reveal worked example'}
              </button>
              {showSolution &&
                (inUse ? (
                  <Button variant="primary" disabled>
                    Example in use
                  </Button>
                ) : (
                  <Button
                    ref={useButton}
                    variant="primary"
                    disabled={running}
                    aria-describedby={running ? 'help-running' : undefined}
                    onClick={() => (edited ? setConfirming(true) : onUseExample(example))}
                  >
                    Use this example <ArrowRight size={15} aria-hidden="true" />
                  </Button>
                ))}
            </div>
          )}
          {showSolution && (
            <>
              {lesson.robotSolution && (
                <p className="code-example-label">{robot}’s routine · the other robots keep theirs</p>
              )}
              <pre className="code-example" id="worked-example">
                {indentSource(example)}
              </pre>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
