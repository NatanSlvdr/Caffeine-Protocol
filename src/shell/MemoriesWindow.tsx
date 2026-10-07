import { Play } from 'lucide-react';
import { Modal } from '@/components';
import type { Memory } from '@/data/memories';
import type { ProgressSave } from '@/domain';
import { shiftNumber } from '@/domain/unlocks';
import { Button } from '@/shared/ui/Button';
import { starRow } from '@/shared/lib/format';
import { useUntranslated, useWords } from '@/shared/language';
import { KEPT_WORDS } from './keptWords';

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
  const say = useWords(KEPT_WORDS).memories;
  const english = useUntranslated();
  return (
    <Modal className="settings-window specials-window" kicker={say.kicker} title={say.title} onClose={onClose} wide>
      <p className="specials-intro">{say.intro}</p>
      <ul className="specials-list">
        {memories.map((memory) => {
          const stars = save.memories?.[memory.id]?.stars;
          const arrived = fresh.includes(memory.id);
          const again = stars !== undefined;
          return (
            <li key={memory.id} className={arrived ? 'new' : undefined}>
              <div>
                <h3 lang={english}>{memory.title}</h3>
                <small>
                  {arrived ? say.fresh : ''}
                  <span lang={english}>{memory.from}</span>
                  {say.tools(shiftNumber(memory.level.id))}
                </small>
                <p lang={english}>{memory.brief.story}</p>
                <p className="specials-hint" lang={english}>
                  {memory.hint}
                </p>
              </div>
              <div className="specials-serve">
                <span role="img" aria-label={again ? say.stars(stars) : say.unplayed}>
                  {starRow(stars ?? 0)}
                </span>
                <Button
                  variant="primary"
                  // The visible words first, then which memory: every card has a Play button.
                  aria-label={`${again ? say.again : say.play} ${memory.title}`}
                  onClick={() => onPlay(memory)}
                >
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  {again ? say.again : say.play}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
