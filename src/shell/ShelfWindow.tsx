import {
  DoorClosed,
  IdCard,
  Map as FloorPlan,
  NotebookPen,
  Package,
  ScrollText,
  Star,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { CushionSwatch, Modal, PrintSwatch } from '@/components';
import { useCafeName, useGame } from '@/state/GameStore';
import { DECOR_OPTIONS, LOUS_DECOR, decorOf, type Decor, type DecorSpot, type ProgressSave } from '@/domain';
import { acts } from './rail/acts';
import { keepsakes, veiled, type Keepsake, type KeepsakeId } from './shelf';

const ICONS: Record<KeepsakeId, LucideIcon> = {
  'order-pad': NotebookPen,
  'recipe-card': ScrollText,
  'name-tags': IdCard,
  'floor-plan': FloorPlan,
  'closing-sign': DoorClosed,
  'gold-star': Star,
  stopwatch: Timer,
};

/** What each spot is called on the shelf, and how its looks are shown there. */
const SPOTS: { [Spot in DecorSpot]: { name: string; Swatch: (props: { id: Decor[Spot] }) => React.JSX.Element } } = {
  cushions: { name: 'The cushions', Swatch: ({ id }) => <CushionSwatch cushions={id} /> },
  print: { name: 'The print by the window', Swatch: ({ id }) => <PrintSwatch print={id} /> },
};

/**
 * The shelf behind the counter: every keepsake, those earned with what they mark, the rest with what earns them. One
 * from an act still sealed stays wrapped, saying only which act it comes out with. Under them, the café's looks: one
 * picked for each spot, from Lou's and those the acts served have brought.
 */
export function ShelfWindow({
  save,
  earned,
  fresh = [],
  onClose,
}: {
  save: Pick<ProgressSave, 'stars' | 'challenges' | 'unlocked' | 'complete' | 'decor'>;
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
      <Looks save={save} />
    </Modal>
  );
}

/** A choice of look for each spot. One not earned yet says what earns it; the café shows only looks it has earned. */
function Looks({ save }: { save: Pick<ProgressSave, 'stars' | 'complete' | 'decor'> }) {
  const { pickDecor } = useGame();
  const decor = decorOf(save);
  return (
    <section className="shelf-looks" aria-labelledby="shelf-looks-title">
      <h3 id="shelf-looks-title">The café’s looks</h3>
      <p>Picked here, out for every shift. Lou’s are there from the start, and each act served brings another.</p>
      <div>
        {(Object.keys(SPOTS) as DecorSpot[]).map((spot) => (
          <SpotChoice key={spot} spot={spot} save={save} picked={decor[spot]} onPick={(id) => pickDecor(spot, id)} />
        ))}
      </div>
    </section>
  );
}

function SpotChoice<Spot extends DecorSpot>({
  spot,
  save,
  picked,
  onPick,
}: {
  spot: Spot;
  save: Pick<ProgressSave, 'stars' | 'complete'>;
  picked: Decor[Spot];
  onPick: (id: Decor[Spot]) => void;
}) {
  const { name, Swatch } = SPOTS[spot];
  return (
    <fieldset>
      <legend>{name}</legend>
      {DECOR_OPTIONS[spot].map((option) => {
        const earned = option.earned(save);
        const lous = option.id === LOUS_DECOR[spot];
        return (
          <label key={option.id} className={earned ? undefined : 'locked'}>
            <input
              type="radio"
              name={`decor-${spot}`}
              checked={picked === option.id}
              disabled={!earned}
              onChange={() => onPick(option.id)}
            />
            <Swatch id={option.id} />
            <span>
              <strong>{option.name}</strong>
              {(lous || !earned) && <small>{option.goal}</small>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
