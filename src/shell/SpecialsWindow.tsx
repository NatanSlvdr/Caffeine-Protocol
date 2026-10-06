import { Play } from 'lucide-react';
import { Modal } from '@/components';
import { cast } from '@/data/campaign/cast';
import type { Special } from '@/data/specials';
import type { ProgressSave } from '@/domain';
import { Button } from '@/shared/ui/Button';
import { starRow } from '@/shared/lib/format';
import { useCafeName } from '@/state/GameStore';

/**
 * The specials: shifts past the campaign that the regulars ask for, each with one new rule. A special keeps its own
 * stars, apart from the campaign's.
 */
export function SpecialsWindow({
  specials,
  save,
  fresh = [],
  onServe,
  onClose,
}: {
  specials: readonly Special[];
  save: Pick<ProgressSave, 'specials'>;
  /** The specials that weren't on the board when it was last opened. */
  fresh?: readonly string[];
  onServe: (special: Special) => void;
  onClose: () => void;
}) {
  const cafe = useCafeName();
  return (
    <Modal
      className="settings-window specials-window"
      kicker={`${cafe} · Specials`}
      title="Asked for by the regulars."
      onClose={onClose}
      wide
    >
      <p className="specials-intro">
        Shifts past the campaign, each with one new rule. They open on the routines the last shift was served with, and
        keep their stars apart from the campaign’s.
      </p>
      <ul className="specials-list">
        {specials.map((special) => {
          const stars = save.specials?.[special.id]?.stars;
          const arrived = fresh.includes(special.id);
          return (
            <li key={special.id} className={arrived ? 'new' : undefined}>
              <div>
                <h3>{special.title}</h3>
                <small>
                  {arrived ? 'New · ' : ''}Asked for by {cast[special.by].name}
                </small>
                <p>{special.brief.story}</p>
                <p className="specials-hint">{special.hint}</p>
              </div>
              <div className="specials-serve">
                <span role="img" aria-label={stars === undefined ? 'Not served yet' : `${stars} of 3 stars`}>
                  {starRow(stars ?? 0)}
                </span>
                <Button
                  variant="primary"
                  // The visible words first, then which special: every card has a Serve button.
                  aria-label={`${stars === undefined ? 'Serve' : 'Serve again'} ${special.title}`}
                  onClick={() => onServe(special)}
                >
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  {stars === undefined ? 'Serve' : 'Serve again'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
