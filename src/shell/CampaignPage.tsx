import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Play, Settings2, Star } from 'lucide-react';
import { playSound } from '@/audio';
import { levels, titleFor } from '@/data';
import { narrativeFor, stories } from '@/data/campaign/narrative';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/shared/ui/Button';
import { go, openSettings } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useGame, useProgress } from '@/state/GameStore';
import { actIndexFor, acts } from './rail/acts';
import { Ticket, type ActState } from './rail/Ticket';

/** How long "Order up!" stays on the specials board before the shift opens. */
const ORDER_UP_MS = 650;

const titles = levels.map((_, index) => titleFor(index));

/**
 * The campaign as Niko's kitchen rail. Each act hangs there as an order ticket, one line per shift,
 * and the selected shift is chalked up beside it as today’s special.
 */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = save.settings.reduced_motion || prefersReducedMotion;
  const rail = useRef<HTMLDivElement>(null);
  const orderTimer = useRef<number | undefined>(undefined);
  const [ordering, setOrdering] = useState<number | null>(null);

  const isComplete = (index: number) => save.stars[index] !== undefined;
  const stateOf = (actIndex: number): ActState => {
    const act = acts[actIndex];
    if (act.from > save.unlocked) return 'locked';
    for (let index = act.from; index < act.to; index++) if (!isComplete(index)) return 'active';
    return 'done';
  };

  const selected = save.selected;
  const current = actIndexFor(selected);
  const level = levels[selected];
  const shift = narrativeFor(selected);
  const observation = !level.programming_enabled;
  const upNext = !isComplete(selected) && selected === save.unlocked;
  const previous = selected > 0 ? selected - 1 : undefined;
  const next = selected < Math.min(save.unlocked, levels.length - 1) ? selected + 1 : undefined;

  useEffect(() => () => window.clearTimeout(orderTimer.current), []);

  // Slide the rail so the current act's ticket hangs in the middle.
  useEffect(() => {
    const track = rail.current;
    const ticket = track?.querySelector<HTMLElement>(`[data-act="${current}"]`);
    if (!track || !ticket || track.scrollWidth <= track.clientWidth) return;
    const left = ticket.offsetLeft - (track.clientWidth - ticket.offsetWidth) / 2;
    track.scrollTo?.({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [current, reducedMotion]);

  const turnTo = (index: number | undefined) => {
    if (ordering !== null) return;
    if (index === undefined || index === selected || index < 0 || index > save.unlocked || index >= levels.length)
      return;
    select(index);
  };

  /** Opening an act lands on its next unserved shift. */
  const openAct = (actIndex: number) => {
    const target = acts[actIndex];
    if (stateOf(actIndex) === 'locked' || actIndex === current) return;
    let focus = target.from;
    for (let index = target.from; index < target.to && index <= save.unlocked; index++) {
      if (!isComplete(index)) {
        focus = index;
        break;
      }
    }
    turnTo(focus);
  };

  /** Call the order, then clock in. With reduced motion, go straight in. */
  const start = (index: number) => {
    if (ordering !== null || index > save.unlocked) return;
    if (reducedMotion) {
      launch(index);
      return;
    }
    if (index !== selected) select(index);
    setOrdering(index);
    playSound('click');
    orderTimer.current = window.setTimeout(() => launch(index), ORDER_UP_MS);
  };

  // Arrow keys move down the order unless focus is in a text field.
  const keys = useRef((direction: -1 | 1) => turnTo(direction === 1 ? next : previous));
  keys.current = (direction) => turnTo(direction === 1 ? next : previous);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="tablist"], dialog',
        )
      )
        return;
      if (event.key === 'ArrowLeft') keys.current(-1);
      else if (event.key === 'ArrowRight') keys.current(1);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className={`campaign-page ${reducedMotion ? 'still' : ''} ${ordering !== null ? 'ordering' : ''}`}>
      <nav className="pass-bar" aria-label="Campaign">
        <button className="pass-home" onClick={() => go('/')}>
          <ArrowLeft size={16} /> Caffeine Protocol
        </button>
        <div className="pass-bar-actions">
          {save.complete && (
            <Button
              className="pass-ending"
              variant="text-link"
              aria-label="Revisit closing time"
              title="Revisit closing time"
              onClick={() => go('/ending')}
            >
              <BookOpen size={15} /> <span>Revisit closing time</span>
            </Button>
          )}
          <span className="pass-stars" aria-label={`${progress.stars} of ${progress.max} stars`}>
            <Star size={14} fill="currentColor" aria-hidden="true" /> {progress.stars}
            <small> / {progress.max}</small>
          </span>
          <button className="pass-icon" aria-label="Settings" title="Settings" onClick={openSettings}>
            <Settings2 size={18} />
          </button>
        </div>
      </nav>

      <header className="pass-title">
        <p className="pass-kicker">Niko’s kitchen · Order rail</p>
        <h1>Choose a shift</h1>
        <p className="pass-progress">
          <strong>{progress.done}</strong> of {progress.total} shifts served
        </p>
      </header>

      <div className="pass-stage">
        <div className="pass" ref={rail}>
          <nav className="pass-track" aria-label="Shifts">
            {acts.map((act, actIndex) => (
              <Ticket
                key={act.kicker}
                act={act}
                number={actIndex}
                state={stateOf(actIndex)}
                current={actIndex === current}
                selected={selected}
                unlocked={save.unlocked}
                stars={save.stars}
                titles={titles}
                ordering={ordering}
                onOpen={() => openAct(actIndex)}
                onSelect={turnTo}
                onStart={start}
              />
            ))}
          </nav>
        </div>
      </div>

      <aside className="recipe" aria-label="Selected shift" aria-live="polite" aria-atomic="true">
        <div className="board">
          <div className="board-chalk" key={selected}>
            <p className="board-kicker">
              <span>Today’s special · № {pad2(selected + 1)}</span>
              {(upNext || isComplete(selected)) && (
                <span className={`board-tag ${isComplete(selected) ? 'done' : 'next'}`}>
                  {isComplete(selected) ? 'Served' : 'Up next'}
                </span>
              )}
            </p>
            <h2>{titleFor(selected)}</h2>
            <svg className="board-swash" viewBox="0 0 200 12" aria-hidden="true">
              <path d="M2 8 C 30 2, 50 12, 80 6 S 130 2, 160 7 S 190 9, 198 4" />
            </svg>
            <dl className="board-menu">
              <div>
                <dt>Tables</dt>
                <dd>{level.active_tables}</dd>
              </div>
              {observation ? (
                <div>
                  <dt>Service</dt>
                  <dd>Watch only</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt>★★</dt>
                    <dd>≤ {level.block_target} blocks</dd>
                  </div>
                  <div>
                    <dt>★★★</dt>
                    <dd>≤ {level.instruction_target} steps</dd>
                  </div>
                </>
              )}
            </dl>
            <p className="board-story">{shift.story}</p>
            <p className="board-note">
              <strong>Chef’s note</strong> {shift.objective}
            </p>
            <svg className="board-doodle" viewBox="0 0 120 100" aria-hidden="true">
              <path className="board-steam" d="M44 32c-6-8 6-14 0-24M58 32c-6-8 6-14 0-24M72 32c-6-8 6-14 0-24" />
              <path d="M24 42h68v16c0 14-15 22-34 22s-34-8-34-22z" />
              <path d="M92 47c12 0 14 8 12 13-2 6-8 8-13 7" />
              <path d="M14 86c10 5 78 5 90 0" />
            </svg>
            <p className="board-foot">
              {observation ? (
                isComplete(selected) ? (
                  'Watched'
                ) : (
                  'Sit back and watch'
                )
              ) : (
                <span className="board-stars" aria-label={`${save.stars[selected] ?? 0} of 3 stars`}>
                  {starRow(save.stars[selected] ?? 0)}
                </span>
              )}
              {stories[selected] && <span className="board-scene">Story scene first</span>}
            </p>
          </div>
          <div className="board-launch">
            <Button
              className="recipe-start"
              variant="primary"
              onClick={() => start(selected)}
              disabled={ordering !== null}
            >
              <Play size={17} fill="currentColor" /> {ordering !== null ? 'Order up…' : 'Start shift'}
            </Button>
            <p className="board-hint" aria-hidden="true">
              <kbd>←</kbd> <kbd>→</kbd> browse · double-click to start
            </p>
          </div>
          {ordering !== null && (
            <span className="board-order-up" aria-hidden="true">
              Order up!
            </span>
          )}
        </div>
      </aside>
    </main>
  );
}
