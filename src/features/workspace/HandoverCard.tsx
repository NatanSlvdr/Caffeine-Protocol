import { ArrowRightLeft, Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { ROBOT_DISPLAY_NAMES } from '@/domain';
import { handoverCovered } from './handover';
import type { Handover } from './handover';

export interface HandoverCardProps {
  handover: Handover;
  /** The routine of the robot taking over. */
  source: string;
}

/**
 * The job a robot takes over on its first shift: the helper's steps in a row, each ticked off once the routine has a
 * block that does it, and the first one still missing spelled out with the block it takes. It works the routine out
 * afresh as it changes, so it says what's missing now rather than when the shift opened. Folding it keeps the count.
 */
export function HandoverCard({ handover, source }: HandoverCardProps) {
  const heading = useId(),
    body = useId();
  const [open, setOpen] = useState(true);
  const robot = ROBOT_DISPLAY_NAMES[handover.role];
  const covered = handoverCovered(handover.steps, source);
  const done = covered.filter(Boolean).length;
  const missing = handover.steps.find((_, i) => !covered[i]);
  return (
    <aside className="handover" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <ArrowRightLeft size={14} aria-hidden="true" />
          Taking over from {handover.helper}{' '}
          <span className="handover-count">
            · {done} of {handover.steps.length} in {robot}’s routine
          </span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={body}
          title={open ? 'Fold the steps' : 'Show the steps'}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={14} aria-hidden="true" />
          <span className="sr-only">{handover.helper}’s steps</span>
        </button>
      </header>
      <div id={body} hidden={!open}>
        <p className="handover-lead">
          {handover.helper}’s job is {robot}’s now. {handover.still}
        </p>
        <ol className="handover-steps">
          {handover.steps.map((step, i) => (
            <li key={step.text} className={covered[i] ? 'done' : 'missing'} title={`${step.text}: ${step.block}`}>
              <span className="handover-mark" aria-hidden="true">
                {covered[i] ? <Check size={10} strokeWidth={3.5} /> : i + 1}
              </span>
              <span aria-hidden="true">{step.short}</span>
              <span className="sr-only">
                {step.text}, with {step.block}: {covered[i] ? 'done.' : `not in ${robot}’s routine yet.`}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="handover-status" hidden={!open && !!missing} aria-live="polite">
        {missing ? (
          <>
            Not in {robot}’s routine yet: <strong>{missing.text.toLowerCase()}</strong>, with a {missing.block} block.
          </>
        ) : (
          <>
            {robot}’s routine covers all of {handover.helper}’s job. Run the service to see it work.
          </>
        )}
      </p>
    </aside>
  );
}
