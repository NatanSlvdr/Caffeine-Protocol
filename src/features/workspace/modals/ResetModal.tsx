import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';

export interface ResetModalProps {
  /** The robot whose program is reset: only the open tab goes back, the other robots keep theirs. */
  robot: string;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirm putting one robot's routine back the way it was when the shift opened. */
export function ResetModal({ robot, onClose, onConfirm }: ResetModalProps) {
  return (
    <Modal
      className="settings-window confirm-slip"
      kicker="Workspace options"
      title={`Reset ${robot}’s routine?`}
      onClose={onClose}
    >
      <p>
        {robot}’s routine goes back to how it was when this shift opened. Your edits to it here are lost; the other
        robots keep theirs.
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" onClick={onClose}>
          Keep my edits
        </button>
        <Button variant="primary" onClick={onConfirm}>
          Reset routine
        </Button>
      </div>
    </Modal>
  );
}
