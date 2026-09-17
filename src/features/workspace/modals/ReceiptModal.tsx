import { ArrowRight } from 'lucide-react';
import { Modal } from '@/components';
import type { RunResult } from '@/domain';
import { pad2, starRow } from '@/shared/lib/format';

export interface ReceiptModalProps {
  index: number;
  result: RunResult;
  observation: boolean;
  isLastShift: boolean;
  onNext: () => void;
  onClose: () => void;
}

/** Service receipt: stars, totals, and the next shift. */
export function ReceiptModal({ index, result, observation, isLastShift, onNext, onClose }: ReceiptModalProps) {
  return (
    <Modal title="Service complete" onClose={onClose} className="receipt-modal">
      <div className="receipt-heading">
        CAFFEINE PROTOCOL<small>SHIFT {pad2(index + 1)} · SERVICE RECEIPT</small>
      </div>
      <h3>Every order, taken care of.</h3>
      <p>Your routine completed the service successfully.</p>
      {!observation && (
        <div className="receipt-stars" aria-label={`${result.stars} stars`}>
          {starRow(result.stars)}
        </div>
      )}
      <dl className="receipt-totals">
        <div>
          <dt>Orders</dt>
          <dd>{result.tickets.length}</dd>
        </div>
        <div>
          <dt>Instructions</dt>
          <dd>{result.executed_instructions}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Complete ✓</dd>
        </div>
      </dl>
      <p className="receipt-thanks">Thank you. See you next shift!</p>
      <button
        className="primary"
        onClick={() => {
          onClose();
          onNext();
        }}
      >
        {isLastShift ? 'Closing time' : 'Next shift'}
        <ArrowRight size={16} />
      </button>
      <button className="text-link" onClick={onClose}>
        Back to the café
      </button>
    </Modal>
  );
}
