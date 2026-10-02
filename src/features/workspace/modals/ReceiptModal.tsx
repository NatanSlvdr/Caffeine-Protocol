import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { count, type LevelDefinition, type RunResult } from '@/domain';
import { pad2, starRow } from '@/shared/lib/format';

export interface ReceiptModalProps {
  index: number;
  level: LevelDefinition;
  result: RunResult;
  observation: boolean;
  /** The next shift's title, or nothing after the last shift. */
  nextShift?: string;
  /** This shift's stars before the run, if it had been served before. */
  best?: number;
  onNext: () => void;
  onClose: () => void;
}

/** Service receipt: stars, the totals measured against this shift's targets, and the next shift. */
export function ReceiptModal({
  index,
  level,
  result,
  observation,
  nextShift,
  best,
  onNext,
  onClose,
}: ReceiptModalProps) {
  const blocks = result.block_count ?? 0;
  const blocksMet = blocks <= level.block_target;
  const stepsMet = result.executed_instructions <= level.instruction_target;
  // Stars climb in order, so a step target beaten over the block target earns nothing yet: say so.
  const stepsHeld = stepsMet && !blocksMet;
  // A replay says whether it beat the shift's best, so going back for stars has a point.
  const replay =
    observation || best === undefined
      ? ''
      : result.stars > best
        ? `New best, up from ${count(best, 'star')}!`
        : result.stars < best
          ? `Your best stays at ${count(best, 'star')}.`
          : '';
  return (
    <Modal
      title="Service complete"
      kicker={`Shift ${pad2(index + 1)} · Service receipt`}
      onClose={onClose}
      className="settings-window confirm-slip receipt-slip"
    >
      <p className="receipt-lead">
        {/* The watch-only shift is the opening day, before any robot: the café's people serve it by hand. */}
        {observation ? 'Niko, Moka and Pip served every order by hand.' : 'Every order, taken care of.'}
      </p>
      {!observation && (
        <p className="receipt-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
          {starRow(result.stars)}
        </p>
      )}
      {replay && <p className="receipt-best">{replay}</p>}
      <dl className="receipt-totals">
        <div>
          <dt>Orders served</dt>
          <dd>{result.tickets.length}</dd>
        </div>
        {!observation && (
          <>
            <div className={blocksMet ? 'met' : ''}>
              <dt>Blocks used</dt>
              <dd>
                {blocks} <small aria-hidden="true">/ {level.block_target}</small>
                <TargetMet target={level.block_target} met={blocksMet} />
              </dd>
            </div>
            <div className={stepsHeld ? 'met held' : stepsMet ? 'met' : ''}>
              <dt>Steps run</dt>
              <dd>
                {result.executed_instructions} <small aria-hidden="true">/ {level.instruction_target}</small>
                <TargetMet target={level.instruction_target} met={stepsMet} />
              </dd>
            </div>
          </>
        )}
      </dl>
      {!observation && stepsHeld && (
        <p className="receipt-note">Steps are on target too, but stars climb in order: trim the blocks first.</p>
      )}
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
          data-autofocus
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

/** The "/ 4" and the ✓ are drawn for the eye, so screen readers hear the target and the verdict here instead. */
function TargetMet({ target, met }: { target: number; met: boolean }) {
  return <span className="sr-only">{`, star target ${target}, ${met ? 'met' : 'missed'}`}</span>;
}
