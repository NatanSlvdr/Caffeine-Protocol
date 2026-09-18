import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';

export interface ResetModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirm replacing the current draft with the incoming program. */
export function ResetModal({ onClose, onConfirm }: ResetModalProps) {
  return (
    <Modal title="Reset this routine?" onClose={onClose}>
      <p>Your current draft will be replaced by the last passing program from the previous shift.</p>
      <div className="modal-buttons">
        <button onClick={onClose}>Keep draft</button>
        <Button variant="primary" onClick={onConfirm}>
          Reset routine
        </Button>
      </div>
    </Modal>
  );
}
