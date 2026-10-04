import { useEffect, useRef } from 'react';
import type { RobotRole } from '@/domain';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { BookOpen, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { RobotOptions } from './RobotChoice';
import type { RobotTabActivity } from './RobotChoice';

/** Keep every robot directly below the goal, with explicit unlock states. */
export function CodingPaneHeader({
  shift,
  objective,
  story,
  level,
  role,
  onRole,
  onHelp,
  onOptions,
  history,
  activity,
}: {
  shift: string;
  objective: string;
  level: number;
  role: RobotRole;
  onRole: (role: RobotRole) => void;
  story?: string;
  onHelp?: () => void;
  onOptions?: () => void;
  /** Undo and redo for the open robot's routine. */
  history?: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };
  /** Each robot's activity while a run plays, shown on its tab. */
  activity?: Partial<Record<RobotRole, RobotTabActivity>>;
}) {
  // Undoing the last step greys Undo out under the pointer or keyboard focus; focus moves across to Redo, and back.
  const undoButton = useRef<HTMLButtonElement>(null),
    redoButton = useRef<HTMLButtonElement>(null),
    pressed = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const button = pressed.current;
    pressed.current = null;
    if (!button?.disabled) return;
    const focus = document.activeElement;
    if (focus === button || focus === document.body || focus === null)
      (button === undoButton.current ? redoButton : undoButton).current?.focus();
  });
  const press = (button: HTMLButtonElement | null, action: () => void) => {
    pressed.current = button;
    action();
  };
  return (
    <section className="coding-pane">
      <header className="coding-pane-heading">
        <div className="coding-title-row">
          <h2 data-screen-title tabIndex={-1}>
            {shift}
          </h2>
          <div className="coding-tools">
            {history && (
              <div className="history-tools" role="group" aria-label="Edit history">
                <button
                  ref={undoButton}
                  type="button"
                  aria-label="Undo"
                  aria-keyshortcuts="Control+Z Meta+Z"
                  title={`Undo (${RUN_MODIFIER} Z)`}
                  disabled={!history.canUndo}
                  onClick={() => press(undoButton.current, history.onUndo)}
                >
                  <Undo2 size={14} aria-hidden="true" />
                </button>
                <button
                  ref={redoButton}
                  type="button"
                  aria-label="Redo"
                  aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                  title={`Redo (${RUN_MODIFIER} ⇧ Z)`}
                  disabled={!history.canRedo}
                  onClick={() => press(redoButton.current, history.onRedo)}
                >
                  <Redo2 size={14} aria-hidden="true" />
                </button>
              </div>
            )}
            {onHelp && (
              <button type="button" aria-label="Help" aria-haspopup="dialog" title="Help" onClick={onHelp}>
                <BookOpen size={14} aria-hidden="true" />
              </button>
            )}
            {onOptions && (
              <button type="button" aria-label="Options" aria-haspopup="dialog" title="Options" onClick={onOptions}>
                <SlidersHorizontal size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {story && <p className="shift-story">{story}</p>}
        <p className="shift-objective">
          <span>Your goal</span>
          {objective}
        </p>
      </header>
      <div className="robot-tabs" role="tablist" aria-label="Robot routines">
        <RobotOptions
          level={level}
          selected={role}
          labels={ROBOT_DISPLAY_NAMES}
          onSelect={onRole}
          activity={activity}
          tabs
        />
      </div>
    </section>
  );
}
