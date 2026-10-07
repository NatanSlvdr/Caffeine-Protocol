import { CircleCheck, Play } from 'lucide-react';
import { useId } from 'react';
import { useWords } from '@/shared/language';
import { WORKSPACE_WORDS } from './workspaceWords';

export interface PracticeCardProps {
  /** The round that went right, counting from 1. */
  round: number;
  /** It was a bench the player wrote, not one of the shift's rounds. */
  bench?: boolean;
  /** The shift's rules the bench eased, said after "with"; nothing when it eased none. */
  eased?: string;
  onRunService: () => void;
}

/**
 * Practice that went right, said beside the code: the round is fixed, but only the whole service earns stars, so
 * the next step is one button away.
 */
export function PracticeCard({ round, bench = false, eased = '', onRunService }: PracticeCardProps) {
  const words = useWords(WORKSPACE_WORDS),
    say = words.practice;
  const heading = useId();
  return (
    <section className="failure-card practice-card" aria-labelledby={heading}>
      <p className="practice-card-title" id={heading}>
        <CircleCheck size={15} aria-hidden="true" />
        {say.title(round, bench)}
        <span className="failure-card-when"> · {bench ? words.toolbar.bench : words.toolbar.practice}</span>
      </p>
      <div className="failure-card-body">
        <p className="failure-card-reason">{say.reason(bench, eased)}</p>
        <div className="failure-card-actions">
          <button type="button" className="failure-card-show" onClick={onRunService}>
            <Play size={14} aria-hidden="true" />
            {say.runAll}
          </button>
        </div>
      </div>
    </section>
  );
}
