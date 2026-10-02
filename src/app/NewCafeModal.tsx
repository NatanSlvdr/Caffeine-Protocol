import { Download } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { count } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { useGame, useProgress } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';

/** Confirm a fresh start: name what it clears, and offer the export the warning recommends right here. */
export function NewCafeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const { save } = useGame();
  const { done, stars } = useProgress();
  const [exported, announce] = useAnnouncement();
  return (
    <Modal className="settings-window confirm-slip" kicker="A fresh start" title="Start a new café?" onClose={onClose}>
      <p>
        This clears {done ? `${count(done, 'served shift')}, ${count(stars, 'star')}, ` : ''}every routine and the story
        so far. Your audio and display settings will stay.
      </p>
      <p>Export your current café first if you want to return to it.</p>
      <button
        className="settings-chip"
        onClick={() => {
          const name = saveFileName();
          download(JSON.stringify(save, null, 2), name);
          announce(`Café exported as ${name}. Look for it with your downloads.`);
        }}
      >
        <Download size={15} aria-hidden="true" /> Export café
      </button>
      <p className="export-status" role="status">
        {exported}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          Keep my café
        </button>
        <Button variant="danger" onClick={onConfirm}>
          Start new café
        </Button>
      </div>
    </Modal>
  );
}
