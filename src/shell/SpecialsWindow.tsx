import { useState } from 'react';
import { ArrowLeft, NotebookPen, Play, RotateCcw, Sun } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { cast } from '@/data/campaign/cast';
import { longDay } from '@/data/longDay';
import { menuById, menuIn, specialIn, type Menu, type Special } from '@/data/specials';
import type { ProgressSave } from '@/domain';
import { Button } from '@/shared/ui/Button';
import { starRow } from '@/shared/lib/format';
import { useLanguage, useUntranslated, useWords, type Language } from '@/shared/language';
import { useCafeName } from '@/state/GameStore';
import { SPECIALS_WORDS } from './specialsWords';

/** A place on the board: a special on its own, or a menu with its cards behind it. */
type Entry = { special: Special } | { menu: Menu; cards: Special[] };

/** The board's entries in the specials' own order, each menu once, where its first card would be. */
function entriesOf(specials: readonly Special[], language: Language): Entry[] {
  const entries: Entry[] = [];
  for (const special of specials) {
    const id = special.card?.menu;
    const kept = id === undefined ? undefined : menuById(id);
    const menu = kept && menuIn(kept, language);
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
  const say = useWords(SPECIALS_WORDS);
  const [language] = useLanguage();
  // Every special and menu in the reader's language: serving one goes by its id.
  const entries = entriesOf(
    specials.map((special) => specialIn(special, language)),
    language,
  );
  const [planning, setPlanning] = useState<string>();
  // Back from a menu, its own button takes focus again.
  const [left, setLeft] = useState<string>();
  const open = entries.find((entry) => 'menu' in entry && entry.menu.id === planning);
  const starsOf = (special: Special) => save.specials?.[special.id]?.stars;
  return (
    <Modal
      className="settings-window specials-window"
      kicker={say.kicker(cafe)}
      title={open && 'menu' in open ? open.menu.title : say.title}
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
          <p className="specials-intro">{say.intro}</p>
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
                        {arrived ? say.fresh : ''}
                        {say.askedBy(cast[special.by].name)}
                      </small>
                      <p>{special.brief.story}</p>
                      <p className="specials-hint">{special.hint}</p>
                    </div>
                    <div className="specials-serve">
                      <Stars stars={stars} />
                      <Button
                        variant="primary"
                        // The visible words first, then which special: every card has a Serve button.
                        aria-label={`${stars === undefined ? say.serve : say.again} ${special.title}`}
                        onClick={() => onServe(special)}
                      >
                        <Play size={15} fill="currentColor" aria-hidden="true" />
                        {stars === undefined ? say.serve : say.again}
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
                      {arrived ? say.fresh : ''}
                      {say.askedBy(cast[menu.by].name)}
                    </small>
                    <p>{menu.story}</p>
                    <p className="specials-hint">{menu.hint}</p>
                  </div>
                  <div className="specials-serve">
                    <span className="specials-menus">{say.menus(served, cards.length)}</span>
                    <Button
                      variant="primary"
                      aria-label={`${say.plan}, ${menu.title}`}
                      autoFocus={menu.id === left}
                      onClick={() => setPlanning(menu.id)}
                    >
                      <NotebookPen size={15} aria-hidden="true" />
                      {say.plan}
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
  const say = useWords(SPECIALS_WORDS);
  const english = useUntranslated();
  return (
    <li className={arrived ? 'new' : undefined}>
      <div>
        <h3 lang={english}>{longDay.title}</h3>
        <small>
          {arrived ? say.fresh : ''}
          {say.askedBy(cast[longDay.by].name)}
        </small>
        <p lang={english}>{longDay.story}</p>
        {day && !current ? (
          <p className="specials-hint">{say.day.changed}</p>
        ) : (
          <p className="specials-hint" lang={english}>
            {longDay.hint}
          </p>
        )}
      </div>
      <div className="specials-serve">
        <span className="specials-menus">
          {best === waves ? say.day.all(waves) : best ? say.day.best(best, waves) : say.day.waves(waves)}
        </span>
        {open === undefined ? (
          <Button variant="primary" aria-label={`${say.day.start}, ${longDay.title}`} onClick={() => onDay(true)}>
            <Sun size={15} aria-hidden="true" />
            {say.day.start}
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              aria-label={`${say.day.carryOn(open)}, ${longDay.title}`}
              onClick={() => onDay(false)}
            >
              <Play size={15} fill="currentColor" aria-hidden="true" />
              {say.day.carryOn(open)}
            </Button>
            <Button aria-label={`${say.day.over}, ${longDay.title}`} onClick={() => onDay(true)}>
              <RotateCcw size={15} aria-hidden="true" />
              {say.day.over}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function Stars({ stars }: { stars: number | undefined }) {
  const say = useWords(SPECIALS_WORDS);
  return (
    <span role="img" aria-label={stars === undefined ? say.unserved : say.stars(stars)}>
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
  const say = useWords(SPECIALS_WORDS);
  return (
    <div className="menu-plan">
      <button className="drill-back" onClick={onBack} data-autofocus>
        <ArrowLeft size={15} aria-hidden="true" /> {say.menu.back}
      </button>
      <p className="specials-intro">
        {menu.story} {say.menu.each}
      </p>
      <ul className="menu-cards">
        {cards.map((special) => {
          const stars = starsOf(special);
          const label = stars === undefined ? say.menu.serve : say.again;
          const { card, level } = special;
          if (!card) return null;
          return (
            <li key={special.id}>
              <h3>{special.title}</h3>
              <dl>
                <dt>{say.menu.board}</dt>
                <dd>{card.recipes}</dd>
                <dt>{say.menu.who}</dt>
                <dd>{card.demand}</dd>
                <dt>{say.menu.rule}</dt>
                <dd>{card.constraint}</dd>
                <dt>{say.menu.targets}</dt>
                <dd>{say.menu.target(level.block_target, level.instruction_target)}</dd>
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
