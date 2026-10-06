import { Play } from 'lucide-react';
import { Modal } from '@/components';
import type { Memory } from '@/data/memories';
import type { ProgressSave } from '@/domain';
import { shiftNumber } from '@/domain/unlocks';
import { Button } from '@/shared/ui/Button';
import { starRow } from '@/shared/lib/format';

/**
 * The memories: mornings at Lou's café, played back from the crew's logs. Each plays with the tools of its day and
 * routines of its own, and keeps its stars apart from the campaign's.
 */
export function MemoriesWindow({
  memories,
  save,
  fresh = [],
  onPlay,
  onClose,
}: {
  memories: readonly Memory[];
  save: Pick<ProgressSave, 'memories'>;
  /** The memories that weren't on the board when it was last opened. */
  fresh?: readonly string[];
  onPlay: (memory: Memory) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      className="settings-window specials-window"
      kicker="Lou’s · Memories"
      title="Before Niko’s time."
      onClose={onClose}
      wide
    >
      <p className="specials-intro">
        Mornings at Lou’s, played back from the crew’s logs. Each plays with the tools of its day and a routine of its
        own: your café’s routines stay as they are, and its stars are kept apart from the campaign’s.
      </p>
      <ul className="specials-list">
        {memories.map((memory) => {
          const stars = save.memories?.[memory.id]?.stars;
          const arrived = fresh.includes(memory.id);
          const again = stars !== undefined;
          return (
            <li key={memory.id} className={arrived ? 'new' : undefined}>
              <div>
                <h3>{memory.title}</h3>
                <small>
                  {arrived ? 'New · ' : ''}
                  {memory.from} · Shift {shiftNumber(memory.level.id)}’s tools
                </small>
                <p>{memory.brief.story}</p>
                <p className="specials-hint">{memory.hint}</p>
              </div>
              <div className="specials-serve">
                <span role="img" aria-label={again ? `${stars} of 3 stars` : 'Not played yet'}>
                  {starRow(stars ?? 0)}
                </span>
                <Button
                  variant="primary"
                  // The visible words first, then which memory: every card has a Play button.
                  aria-label={`${again ? 'Play again' : 'Play'} ${memory.title}`}
                  onClick={() => onPlay(memory)}
                >
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  {again ? 'Play again' : 'Play'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
