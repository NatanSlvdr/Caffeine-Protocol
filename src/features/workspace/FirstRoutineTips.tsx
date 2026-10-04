import { Lightbulb, X } from 'lucide-react';
import { useId } from 'react';
import { FIRST_ROUTINE_STEPS } from './firstRoutine';

export interface FirstRoutineTipsProps {
  /** The step the player is on, counting from 0. */
  step: number;
  onHide: () => void;
}

/**
 * The first routine's tips, one step at a time: build, run, fix. They tick themselves off as the player goes, so
 * there's nothing to click through, and they can be put away for good; Workspace options brings them back.
 */
export function FirstRoutineTips({ step, onHide }: FirstRoutineTipsProps) {
  const heading = useId();
  const { title, text } = FIRST_ROUTINE_STEPS[step];
  return (
    <aside className="first-routine-tips" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <Lightbulb size={14} aria-hidden="true" />
          First routine
          <span className="first-routine-step">
            {' '}
            · Step {step + 1} of {FIRST_ROUTINE_STEPS.length}
          </span>
        </p>
        <ol className="first-routine-pips" aria-hidden="true">
          {FIRST_ROUTINE_STEPS.map((s, i) => (
            <li key={s.title} className={i < step ? 'done' : i === step ? 'current' : undefined} />
          ))}
        </ol>
        <button type="button" aria-label="Hide the first-routine tips" title="Hide tips" onClick={onHide}>
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <p className="first-routine-text" aria-live="polite">
        <strong>{title}.</strong> {text}
      </p>
    </aside>
  );
}
