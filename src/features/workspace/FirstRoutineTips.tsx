import { Lightbulb, X } from 'lucide-react';
import { useId } from 'react';
import { useWords } from '@/shared/language';
import { WORKSPACE_WORDS } from './workspaceWords';

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
  const say = useWords(WORKSPACE_WORDS).tips;
  const heading = useId();
  const { title, text } = say.steps[step];
  return (
    <aside className="first-routine-tips" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <Lightbulb size={14} aria-hidden="true" />
          {say.heading}
          <span className="first-routine-step"> · {say.step(step + 1, say.steps.length)}</span>
        </p>
        <ol className="first-routine-pips" aria-hidden="true">
          {say.steps.map((s, i) => (
            <li key={s.title} className={i < step ? 'done' : i === step ? 'current' : undefined} />
          ))}
        </ol>
        <button type="button" aria-label={say.hide} title={say.hideTitle} onClick={onHide}>
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <p className="first-routine-text" aria-live="polite">
        <strong>{title}.</strong> {text}
      </p>
    </aside>
  );
}
