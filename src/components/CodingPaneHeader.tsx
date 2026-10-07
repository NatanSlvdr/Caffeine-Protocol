import { useEffect, useRef } from 'react';
import type { RobotRole } from '@/domain';
import { ROBOT_DISPLAY_NAMES } from '@/domain/robots';
import { BookOpen, FlaskConical, NotebookPen, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react';
import { RUN_MODIFIER } from '@/shared/lib/format';
import { useWords } from '@/shared/language';
import { PANE_WORDS } from './paneWords';
import { RobotOptions } from './RobotChoice';
import type { RobotTabActivity } from './RobotChoice';

/** Keep every robot directly below the goal, with explicit unlock states. */
export function CodingPaneHeader({
  shift,
  objective,
  story,
  briefLang,
  level,
  role,
  onRole,
  onHelp,
  onNotebook,
  onBench,
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
  /** The language of the title, story and goal when it isn't the page's: a special's, still English. */
  briefLang?: string;
  onHelp?: () => void;
  /** The routine notebook, on a shift with a routine to keep or fill. */
  onNotebook?: () => void;
  /** The test bench, on a shift with a routine to run on guests of the player's own. */
  onBench?: () => void;
  onOptions?: () => void;
  /** Undo and redo for the open robot's routine. */
  history?: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };
  /** Each robot's activity while a run plays, shown on its tab. */
  activity?: Partial<Record<RobotRole, RobotTabActivity>>;
}) {
  const say = useWords(PANE_WORDS);
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
          <h2 data-screen-title tabIndex={-1} lang={briefLang}>
            {shift}
          </h2>
          <div className="coding-tools">
            {history && (
              <div className="history-tools" role="group" aria-label={say.history}>
                <button
                  ref={undoButton}
                  type="button"
                  aria-label={say.undo}
                  aria-keyshortcuts="Control+Z Meta+Z"
                  title={`${say.undo} (${RUN_MODIFIER} Z)`}
                  disabled={!history.canUndo}
                  onClick={() => press(undoButton.current, history.onUndo)}
                >
                  <Undo2 size={14} aria-hidden="true" />
                </button>
                <button
                  ref={redoButton}
                  type="button"
                  aria-label={say.redo}
                  aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
                  title={`${say.redo} (${RUN_MODIFIER} ⇧ Z)`}
                  disabled={!history.canRedo}
                  onClick={() => press(redoButton.current, history.onRedo)}
                >
                  <Redo2 size={14} aria-hidden="true" />
                </button>
              </div>
            )}
            {onHelp && (
              <button type="button" aria-label={say.help} aria-haspopup="dialog" title={say.help} onClick={onHelp}>
                <BookOpen size={14} aria-hidden="true" />
              </button>
            )}
            {onNotebook && (
              <button
                type="button"
                aria-label={say.notebook}
                aria-haspopup="dialog"
                title={say.notebookTitle}
                onClick={onNotebook}
              >
                <NotebookPen size={14} aria-hidden="true" />
              </button>
            )}
            {onBench && (
              <button type="button" aria-label={say.bench} aria-haspopup="dialog" title={say.bench} onClick={onBench}>
                <FlaskConical size={14} aria-hidden="true" />
              </button>
            )}
            {onOptions && (
              <button
                type="button"
                aria-label={say.options}
                aria-haspopup="dialog"
                title={say.options}
                onClick={onOptions}
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {story && (
          <p className="shift-story" lang={briefLang}>
            {story}
          </p>
        )}
        <p className="shift-objective">
          <span>{say.goal}</span>
          <span lang={briefLang}>{objective}</span>
        </p>
      </header>
      <div className="robot-tabs" role="tablist" aria-label={say.robots}>
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
