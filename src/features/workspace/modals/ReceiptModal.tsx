import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import type { LevelDefinition, RunResult } from '@/domain';
import { pad2, starRow } from '@/shared/lib/format';

export interface ReceiptModalProps {
  index: number;
  level: LevelDefinition;
  result: RunResult;
  observation: boolean;
  /** The next shift's title, or nothing after the last shift. */
  nextShift?: string;
  onNext: () => void;
  onClose: () => void;
}

/** Service receipt: stars, the totals measured against this shift's targets, and the next shift. */
export function ReceiptModal({ index, level, result, observation, nextShift, onNext, onClose }: ReceiptModalProps) {
  const blocks = result.block_count ?? 0;
  return (
    <Modal
      title="Service complete"
      kicker={`Shift ${pad2(index + 1)} · Service receipt`}
      onClose={onClose}
      className="settings-window confirm-slip receipt-slip"
    >
      <p className="receipt-lead">
        {observation ? 'The crew served every order on their own.' : 'Every order, taken care of.'}
      </p>
      {!observation && (
        <p className="receipt-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
          {starRow(result.stars)}
        </p>
      )}
      <dl className="receipt-totals">
        <div>
          <dt>Orders served</dt>
          <dd>{result.tickets.length}</dd>
        </div>
        {!observation && (
          <>
            <div className={blocks <= level.block_target ? 'met' : ''}>
              <dt>Blocks used</dt>
              <dd>
                {blocks} <small>/ {level.block_target}</small>
                <TargetMet met={blocks <= level.block_target} />
              </dd>
            </div>
            <div className={result.executed_instructions <= level.instruction_target ? 'met' : ''}>
              <dt>Steps run</dt>
              <dd>
                {result.executed_instructions} <small>/ {level.instruction_target}</small>
                <TargetMet met={result.executed_instructions <= level.instruction_target} />
              </dd>
            </div>
          </>
        )}
      </dl>
      <p className="receipt-thanks">
        {nextShift ? (
          <>
            Thank you. Next up: <strong>{nextShift}</strong>
          </>
        ) : (
          'Last order of the day.'
        )}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" onClick={onClose}>
          Stay on this shift
        </button>
        <Button
          variant="primary"
          onClick={() => {
            onClose();
            onNext();
          }}
        >
          {nextShift ? 'Next shift' : 'Closing time'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}

/** The ✓ on a met total is drawn in CSS, so screen readers hear the verdict here instead. */
function TargetMet({ met }: { met: boolean }) {
  return <span className="sr-only">{met ? ', star target met' : ', over the star target'}</span>;
}
