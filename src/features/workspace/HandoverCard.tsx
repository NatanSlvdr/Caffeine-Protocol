import { ArrowRightLeft, Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { ROBOT_DISPLAY_NAMES } from '@/domain';
import { useWords } from '@/shared/language';
import { handoverCovered } from './handover';
import type { Handover } from './handover';
import { HANDOVER_WORDS } from './handoverWords';

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
  const words = useWords(HANDOVER_WORDS),
    job = words.jobs[handover.role];
  const robot = ROBOT_DISPLAY_NAMES[handover.role];
  const covered = handoverCovered(handover.steps, source);
  const done = covered.filter(Boolean).length;
  const missing = handover.steps.findIndex((_, i) => !covered[i]);
  return (
    <aside className="handover" aria-labelledby={heading}>
      <header>
        <p id={heading}>
          <ArrowRightLeft size={14} aria-hidden="true" />
          {words.takingOver(handover.helper)}{' '}
          <span className="handover-count">{words.count(done, handover.steps.length, robot)}</span>
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={body}
          title={words.fold(open)}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown size={14} aria-hidden="true" />
          <span className="sr-only">{words.steps(handover.helper)}</span>
        </button>
      </header>
      <div id={body} hidden={!open}>
        <p className="handover-lead">
          {words.lead(handover.helper, robot)} {job.still}
        </p>
        <ol className="handover-steps">
          {handover.steps.map((step, i) => (
            <li
              key={step.text}
              className={covered[i] ? 'done' : 'missing'}
              title={words.title(job.steps[i].text, step.block)}
            >
              <span className="handover-mark" aria-hidden="true">
                {covered[i] ? <Check size={10} strokeWidth={3.5} /> : i + 1}
              </span>
              <span aria-hidden="true">{job.steps[i].short}</span>
              <span className="sr-only">{words.step(job.steps[i].text, step.block, covered[i], robot)}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="handover-status" hidden={!open && missing >= 0} aria-live="polite">
        {missing >= 0 ? (
          <>
            {words.missing(robot)}
            <strong>{job.steps[missing].text.toLowerCase()}</strong>
            {words.withBlock(handover.steps[missing].block)}
          </>
        ) : (
          words.covered(robot, handover.helper)
        )}
      </p>
    </aside>
  );
}
