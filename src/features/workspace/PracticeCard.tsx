import { CircleCheck, Play } from 'lucide-react';
import { useId } from 'react';

export interface PracticeCardProps {
  /** The round that went right, counting from 1. */
  round: number;
  onRunService: () => void;
}

/**
 * Practice that went right, said beside the code: the round is fixed, but only the whole service earns stars, so
 * the next step is one button away.
 */
export function PracticeCard({ round, onRunService }: PracticeCardProps) {
  const heading = useId();
  return (
    <section className="failure-card practice-card" aria-labelledby={heading}>
      <p className="practice-card-title" id={heading}>
        <CircleCheck size={15} aria-hidden="true" />
        Round {round} went right<span className="failure-card-when"> · Practice</span>
      </p>
      <div className="failure-card-body">
        <p className="failure-card-reason">Practice earns no stars: the whole service has to get every round right.</p>
        <div className="failure-card-actions">
          <button type="button" className="failure-card-show" onClick={onRunService}>
            <Play size={14} aria-hidden="true" />
            Run the whole service
          </button>
        </div>
      </div>
    </section>
  );
}
