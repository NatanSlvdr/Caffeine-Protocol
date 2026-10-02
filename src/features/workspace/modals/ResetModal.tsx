import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';

export interface ResetModalProps {
  /** The robot whose program is reset: only the open tab goes back, the other robots keep theirs. */
  robot: string;
  /** The only robot the player programs this shift: there are no other routines to keep. */
  alone: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirm putting one robot's routine back the way it was when the shift opened. */
export function ResetModal({ robot, alone, onClose, onConfirm }: ResetModalProps) {
  return (
    <Modal
      className="settings-window confirm-slip"
      kicker="Workspace options"
      title={`Reset ${robot}’s routine?`}
      onClose={onClose}
    >
      <p>
        {robot}’s routine goes back to how it was when this shift opened. Your edits to it here are lost
        {alone ? '.' : '; the other robots keep theirs.'}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          Keep my edits
        </button>
        <Button variant="danger" onClick={onConfirm}>
          Reset routine
        </Button>
      </div>
    </Modal>
  );
}
