import { useState } from 'react';
import { ArrowLeft, NotebookPen, Play } from 'lucide-react';
import { Modal } from '@/components';
import { cast } from '@/data/campaign/cast';
import { menuById, type Menu, type Special } from '@/data/specials';
import { count, type ProgressSave } from '@/domain';
import { Button } from '@/shared/ui/Button';
import { starRow } from '@/shared/lib/format';
import { useCafeName } from '@/state/GameStore';

/** A place on the board: a special on its own, or a menu with its cards behind it. */
type Entry = { special: Special } | { menu: Menu; cards: Special[] };

/** The board's entries in the specials' own order, each menu once, where its first card would be. */
function entriesOf(specials: readonly Special[]): Entry[] {
  const entries: Entry[] = [];
  for (const special of specials) {
    const id = special.card?.menu;
    const menu = id === undefined ? undefined : menuById(id);
    if (!menu) entries.push({ special });
    else if (!entries.some((entry) => 'menu' in entry && entry.menu.id === id))
      entries.push({ menu, cards: specials.filter((each) => each.card?.menu === id) });
  }
  return entries;
}

/**
 * The specials: shifts past the campaign that the regulars ask for, each with one new rule, and menus to plan, each
 * card its own shift. A special keeps its own stars, apart from the campaign's.
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
  const entries = entriesOf(specials);
  const [planning, setPlanning] = useState<string>();
  // Back from a menu, its own button takes focus again.
  const [left, setLeft] = useState<string>();
  const open = entries.find((entry) => 'menu' in entry && entry.menu.id === planning);
  const starsOf = (special: Special) => save.specials?.[special.id]?.stars;
  return (
    <Modal
      className="settings-window specials-window"
      kicker={`${cafe} · Specials`}
      title={open && 'menu' in open ? open.menu.title : 'Asked for by the regulars.'}
      onClose={onClose}
      wide
    >
      {open && 'menu' in open ? (
        <MenuPlan
          key={open.menu.id}
          menu={open.menu}
          cards={open.cards}
          starsOf={starsOf}
          onServe={onServe}
          onBack={() => {
            setLeft(open.menu.id);
            setPlanning(undefined);
          }}
        />
      ) : (
        <>
          <p className="specials-intro">
            Shifts past the campaign, each with something new to it. They open on the routines the last shift was served
            with, and keep their stars apart from the campaign’s.
          </p>
          <ul className="specials-list">
            {entries.map((entry) => {
              if ('special' in entry) {
                const { special } = entry;
                const stars = starsOf(special);
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
                      <Stars stars={stars} />
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
              }
              const { menu, cards } = entry;
              const arrived = cards.some((card) => fresh.includes(card.id));
              const served = cards.filter((card) => starsOf(card) !== undefined).length;
              return (
                <li key={menu.id} className={arrived ? 'new' : undefined}>
                  <div>
                    <h3>{menu.title}</h3>
                    <small>
                      {arrived ? 'New · ' : ''}Asked for by {cast[menu.by].name}
                    </small>
                    <p>{menu.story}</p>
                    <p className="specials-hint">{menu.hint}</p>
                  </div>
                  <div className="specials-serve">
                    <span className="specials-menus">
                      {served} of {count(cards.length, 'menu')} served
                    </span>
                    <Button
                      variant="primary"
                      aria-label={`Plan the menu, ${menu.title}`}
                      autoFocus={menu.id === left}
                      onClick={() => setPlanning(menu.id)}
                    >
                      <NotebookPen size={15} aria-hidden="true" />
                      Plan the menu
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

function Stars({ stars }: { stars: number | undefined }) {
  return (
    <span role="img" aria-label={stars === undefined ? 'Not served yet' : `${stars} of 3 stars`}>
      {starRow(stars ?? 0)}
    </span>
  );
}

/**
 * A menu laid out card by card, side by side, before any is served: what each puts on the board, who it brings, the
 * rule that comes with it, and what a routine cut to it should come in under.
 */
function MenuPlan({
  menu,
  cards,
  starsOf,
  onServe,
  onBack,
}: {
  menu: Menu;
  cards: readonly Special[];
  starsOf: (special: Special) => number | undefined;
  onServe: (special: Special) => void;
  onBack: () => void;
}) {
  return (
    <div className="menu-plan">
      <button className="drill-back" onClick={onBack} data-autofocus>
        <ArrowLeft size={15} aria-hidden="true" /> All specials
      </button>
      <p className="specials-intro">
        {menu.story} Each card is a shift of its own, with its own guests and its own stars: pick one, serve it, and
        come back for the others whenever you like.
      </p>
      <ul className="menu-cards">
        {cards.map((special) => {
          const stars = starsOf(special);
          const label = stars === undefined ? 'Serve this menu' : 'Serve again';
          const { card, level } = special;
          if (!card) return null;
          return (
            <li key={special.id}>
              <h3>{special.title}</h3>
              <dl>
                <dt>On the board</dt>
                <dd>{card.recipes}</dd>
                <dt>Who comes</dt>
                <dd>{card.demand}</dd>
                <dt>The rule</dt>
                <dd>{card.constraint}</dd>
                <dt>Targets</dt>
                <dd>
                  {level.block_target} blocks or fewer · {level.instruction_target} steps or fewer
                </dd>
              </dl>
              <p className="specials-hint">{special.hint}</p>
              <div className="menu-card-foot">
                <Stars stars={stars} />
                <Button
                  variant={stars === undefined ? 'primary' : undefined}
                  aria-label={`${label}, ${special.title}`}
                  onClick={() => onServe(special)}
                >
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  {label}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
