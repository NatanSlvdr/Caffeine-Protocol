import { useState } from 'react';
import { ArrowLeft, NotebookPen, Play, RotateCcw, Sun } from 'lucide-react';
import { Modal } from '@/components';
import { cast } from '@/data/campaign/cast';
import { longDay } from '@/data/longDay';
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
 * The specials: shifts past the campaign that the regulars ask for, each with one new rule, menus to plan, each card
 * its own shift, and the Long Day, served wave by wave. A special keeps its own stars, apart from the campaign's.
 */
export function SpecialsWindow({
  specials,
  save,
  fresh = [],
  onServe,
  onDay,
  onClose,
}: {
  specials: readonly Special[];
  save: Pick<ProgressSave, 'specials' | 'endurance'>;
  /** The specials that weren't on the board when it was last opened, the Long Day's id among them. */
  fresh?: readonly string[];
  onServe: (special: Special) => void;
  /** Opens the Long Day: on the open day's wave, or from the first wave on a day started afresh. */
  onDay: (afresh: boolean) => void;
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
            <LongDay save={save} arrived={fresh.includes(longDay.id)} onDay={onDay} />
          </ul>
        </>
      )}
    </Modal>
  );
}

/**
 * The Long Day on the board: how far any day has got, and the way into it. A day left open carries on from its next
 * wave; one open on waves that have changed since starts again from the first.
 */
function LongDay({
  save,
  arrived,
  onDay,
}: {
  save: Pick<ProgressSave, 'endurance'>;
  arrived: boolean;
  onDay: (afresh: boolean) => void;
}) {
  const day = save.endurance;
  const current = day?.version === longDay.version;
  const open = current && day.wave !== undefined ? day.wave : undefined;
  const best = current ? day.best : undefined;
  const waves = longDay.waves.length;
  return (
    <li className={arrived ? 'new' : undefined}>
      <div>
        <h3>{longDay.title}</h3>
        <small>
          {arrived ? 'New · ' : ''}Asked for by {cast[longDay.by].name}
        </small>
        <p>{longDay.story}</p>
        <p className="specials-hint">
          {day && !current
            ? 'The waves have changed since your last day. It starts again from the first, with your routines.'
            : longDay.hint}
        </p>
      </div>
      <div className="specials-serve">
        <span className="specials-menus">
          {best === waves
            ? `All ${waves} waves served`
            : best
              ? `Best: wave ${best} of ${waves}`
              : count(waves, 'wave')}
        </span>
        {open === undefined ? (
          <Button variant="primary" aria-label={`Start the day, ${longDay.title}`} onClick={() => onDay(true)}>
            <Sun size={15} aria-hidden="true" />
            Start the day
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              aria-label={`Carry on: wave ${open}, ${longDay.title}`}
              onClick={() => onDay(false)}
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              Carry on: wave {open}
            </Button>
            <Button aria-label={`Start over, ${longDay.title}`} onClick={() => onDay(true)}>
              <RotateCcw size={15} aria-hidden="true" />
              Start over
            </Button>
          </>
        )}
      </div>
    </li>
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
