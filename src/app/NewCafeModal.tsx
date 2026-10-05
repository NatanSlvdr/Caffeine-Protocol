import { Download } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { count } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { untouched } from '@/features/campaign/save/persistence';
import { useGame, useProgress } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';

/** Confirm a fresh start: name what it clears, and offer the export the warning recommends right here. */
export function NewCafeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const { save, saveError } = useGame();
  // Settings keeps a copy of a café with something in it, once it is saved where a copy can go.
  const kept = !saveError && !untouched(save);
  const { done, stars } = useProgress();
  const [exported, announce] = useAnnouncement();
  return (
    <Modal className="settings-window confirm-slip" kicker="A fresh start" title="Start a new café?" onClose={onClose}>
      <p>
        This clears {done ? `${count(done, 'served shift')}, ${count(stars, 'star')}, ` : ''}every routine and the story
        so far. Your audio and display settings, and your routine notebook, will stay.
      </p>
      <p>
        {kept
          ? 'A copy is kept in Settings until your next import or fresh start. Export it to keep it for good.'
          : 'Export your current café first if you want to return to it.'}
      </p>
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
