import { Download } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { count } from '@/domain';
import { download, saveFileName } from '@/shared/lib/download';
import { untouched } from '@/features/campaign/save/persistence';
import { useGame, useProgress } from '@/state/GameStore';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { countFr, useWords, words } from '@/shared/language';
import { CAFE_WORDS } from './cafeWords';

/** What starting over clears, counted, and that the copy and the rest stay. */
type Clears = { done: number; stars: number; others: boolean };

const WORDS = words(
  {
    kicker: 'A fresh start',
    title: 'Start this café over?',
    clears: ({ done, stars, others }: Clears) =>
      `This clears ${done ? `${count(done, 'served shift')}, ${count(stars, 'star')}, ` : ''}every routine and the story so far. Your audio and display settings, and your routine notebook, will stay${
        others ? '; your other cafés aren’t touched.' : '.'
      }`,
    kept: 'A copy is kept in Settings until your next import or fresh start. Export it to keep it for good.',
    exportFirst: 'Export your current café first if you want to return to it.',
    keep: 'Keep my café',
    startOver: 'Start over',
  },
  {
    kicker: 'Un nouveau départ',
    title: 'Recommencer ce café ?',
    clears: ({ done, stars, others }) =>
      `Cela efface ${done ? `${countFr(done, 'service servi', 'services servis')}, ${countFr(stars, 'étoile')}, ` : ''}toutes les routines et l’histoire jusqu’ici. Vos réglages de son et d’affichage, ainsi que votre carnet de routines, restent${
        others ? ' ; vos autres cafés ne sont pas touchés.' : '.'
      }`,
    kept: 'Une copie est gardée dans les Réglages jusqu’à votre prochain import ou nouveau départ. Exportez-la pour la garder pour de bon.',
    exportFirst: 'Exportez d’abord votre café actuel si vous voulez y revenir.',
    keep: 'Garder mon café',
    startOver: 'Recommencer',
  },
);

/** Confirm a fresh start: name what it clears, and offer the export the warning recommends right here. */
export function NewCafeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const { save, saveError, cafes } = useGame();
  // Settings keeps a copy of a café with something in it, once it is saved where a copy can go.
  const kept = !saveError && !untouched(save);
  const { done, stars } = useProgress();
  const [exported, announce] = useAnnouncement();
  const say = useWords(WORDS);
  const cafeWords = useWords(CAFE_WORDS);
  return (
    <Modal className="settings-window confirm-slip" kicker={say.kicker} title={say.title} onClose={onClose}>
      <p>{say.clears({ done, stars, others: cafes.cafes.length > 1 })}</p>
      <p>{kept ? say.kept : say.exportFirst}</p>
      <button
        className="settings-chip"
        onClick={() => {
          const name = saveFileName();
          download(JSON.stringify(save, null, 2), name);
          announce(cafeWords.exported(name));
        }}
      >
        <Download size={15} aria-hidden="true" /> {cafeWords.exportCafe}
      </button>
      <p className="export-status" role="status">
        {exported}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" data-autofocus onClick={onClose}>
          {say.keep}
        </button>
        <Button variant="danger" onClick={onConfirm}>
          {say.startOver}
        </Button>
      </div>
    </Modal>
  );
}
