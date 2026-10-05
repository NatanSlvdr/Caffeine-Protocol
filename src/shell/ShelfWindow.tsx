import {
  DoorClosed,
  IdCard,
  Map as FloorPlan,
  NotebookPen,
  Package,
  ScrollText,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components';
import { useCafeName } from '@/state/GameStore';
import type { ProgressSave } from '@/domain';
import { acts } from './rail/acts';
import { keepsakes, veiled, type Keepsake, type KeepsakeId } from './shelf';

const ICONS: Record<KeepsakeId, LucideIcon> = {
  'order-pad': NotebookPen,
  'recipe-card': ScrollText,
  'name-tags': IdCard,
  'floor-plan': FloorPlan,
  'closing-sign': DoorClosed,
  'gold-star': Star,
};

/**
 * The shelf behind the counter: every keepsake, those earned with what they mark, the rest with what earns them. One
 * from an act still sealed stays wrapped, saying only which act it comes out with.
 */
export function ShelfWindow({
  save,
  earned,
  fresh = [],
  onClose,
}: {
  save: Pick<ProgressSave, 'stars' | 'unlocked'>;
  earned: readonly Keepsake[];
  /** The keepsakes that weren't there when the shelf was last opened. */
  fresh?: readonly string[];
  onClose: () => void;
}) {
  const cafe = useCafeName();
  return (
    <Modal
      className="settings-window shelf-window"
      kicker={`${cafe} · Behind the counter`}
      title="The shelf."
      onClose={onClose}
      wide
    >
      <ul className="shelf-keepsakes">
        {keepsakes.map((keepsake) => {
          const on = earned.includes(keepsake);
          const arrived = on && fresh.includes(keepsake.id);
          const wrapped = veiled(keepsake, save);
          const Icon = wrapped ? Package : ICONS[keepsake.id];
          return (
            <li key={keepsake.id} className={on ? `earned${arrived ? ' new' : ''}` : ''}>
              <Icon size={22} aria-hidden="true" />
              <div>
                <h3>{wrapped ? 'Under wraps' : keepsake.name}</h3>
                <small>{arrived ? 'New on the shelf' : on ? 'On the shelf' : 'Not yet'}</small>
                <p>
                  {on
                    ? keepsake.story
                    : wrapped
                      ? `Something for ${acts[keepsake.act].kicker}. It comes out once ${acts[keepsake.act - 1].kicker} is served.`
                      : keepsake.goal}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
