import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Clapperboard, Play } from 'lucide-react';
import { levels, titleFor } from '@/data';
import { cutscenes, sceneBefore, sceneOpen, sceneSeen, waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import { narrativeFor } from '@/data/campaign/narrative';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/shared/ui/Button';
import { go, openGuide } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useCafeName, useGame, useProgress } from '@/state/GameStore';
import { actIndexFor, acts } from './rail/acts';
import { Ticket, type ActState } from './rail/Ticket';
import { ShellBar } from './ShellBar';

/** How long "Order up!" stays on the specials board before the shift opens. */
const ORDER_UP_MS = 650;

const titles = levels.map((_, index) => titleFor(index));

/** Every line of the rail in order: each scene just above the shift it opens, the closing scene last. */
type Entry = { shift: number } | { scene: Cutscene };
const entries: Entry[] = [
  ...levels.flatMap((_, shift): Entry[] => {
    const scene = sceneBefore(shift);
    return scene ? [{ scene }, { shift }] : [{ shift }];
  }),
  ...cutscenes.filter((scene) => scene.before >= levels.length).map((scene) => ({ scene })),
];

/**
 * The campaign as the café's kitchen rail. Each act hangs there as an order ticket, one line per shift,
 * and the selected shift is chalked up beside it as today’s special.
 */
export function CampaignPage() {
  const { save, select, launch } = useGame();
  const progress = useProgress();
  const shop = useCafeName();
  const reducedMotion = useReducedMotion(save.settings.reduced_motion);
  const rail = useRef<HTMLDivElement>(null);
  const orderTimer = useRef<number | undefined>(undefined);
  const [ordering, setOrdering] = useState<number | null>(null);
  // A scene waiting before the selected shift is what the rail opens on.
  const [scene, setScene] = useState<Cutscene | undefined>(() => waitingScene(save, save.selected));
  const gated = waitingScene(save, save.unlocked)?.before;

  const isComplete = (index: number) => save.stars[index] !== undefined;
  const stateOf = (actIndex: number): ActState => {
    const act = acts[actIndex];
    if (act.from > save.unlocked) return 'locked';
    for (let index = act.from; index < act.to; index++) if (!isComplete(index)) return 'active';
    return 'done';
  };

  const selected = save.selected;
  const current = actIndexFor(scene ? Math.min(scene.before, levels.length - 1) : selected);
  const level = levels[selected];
  const shift = narrativeFor(selected);
  const observation = !level.programming_enabled;
  const upNext = !isComplete(selected) && selected === save.unlocked;
  const opens = (entry: Entry) =>
    'scene' in entry ? sceneOpen(save, entry.scene) : entry.shift <= save.unlocked && entry.shift !== gated;
  const here = entries.findIndex((entry) =>
    'scene' in entry ? entry.scene === scene : !scene && entry.shift === selected,
  );
  const neighbour = (step: -1 | 1) => {
    const entry = entries[here + step];
    return entry && opens(entry) ? entry : undefined;
  };

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
    if (index === undefined || index < 0 || index > save.unlocked || index === gated || index >= levels.length) return;
    setScene(undefined);
    if (index !== selected) select(index);
  };

  const turnToScene = (target: Cutscene) => {
    if (ordering === null && sceneOpen(save, target)) setScene(target);
  };

  const turnToEntry = (entry: Entry | undefined) => {
    if (!entry) return;
    if ('scene' in entry) turnToScene(entry.scene);
    else turnTo(entry.shift);
  };

  /** Scenes play at once: there is no order to call. The closing scene plays with the final receipt. */
  const watch = (target: Cutscene) => {
    if (ordering !== null || !sceneOpen(save, target)) return;
    go(target.before >= levels.length ? '/ending' : `/scene/${target.id}`);
  };

  /** Clicking an act's header lands on its next unserved shift. */
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
    const waiting = focus === gated ? sceneBefore(focus) : undefined;
    if (waiting) turnToScene(waiting);
    else turnTo(focus);
  };

  /** Call the order, then clock in. With reduced motion, go straight in. */
  const start = (index: number) => {
    if (ordering !== null || index > save.unlocked || index === gated) return;
    if (reducedMotion) {
      launch(index);
      return;
    }
    if (index !== selected) select(index);
    setOrdering(index);
    orderTimer.current = window.setTimeout(() => launch(index), ORDER_UP_MS);
  };

  // Arrow keys move down the order unless focus is in a text field.
  // Pressed from a line on the ticket, the arrows carry focus along, so the focus ring stays on the chosen line.
  const followFocus = useRef(false);
  const step = (direction: -1 | 1, fromLine: boolean) => {
    const entry = neighbour(direction);
    if (!entry || ordering !== null) return;
    followFocus.current = fromLine;
    turnToEntry(entry);
  };
  const keys = useRef(step);
  keys.current = step;
  useEffect(() => {
    if (!followFocus.current) return;
    followFocus.current = false;
    rail.current?.querySelector<HTMLElement>('.shift-card[aria-pressed="true"]')?.focus();
  }, [selected, scene]);
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
      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (!direction) return;
      keys.current(direction, target instanceof Element && !!target.closest('.shift-card'));
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className={`campaign-page ${reducedMotion ? 'still' : ''} ${ordering !== null ? 'ordering' : ''}`}>
      <ShellBar label="Campaign" back="Caffeine Protocol" onBack={() => go('/')}>
        <button
          className="shell-icon"
          aria-label="How to play"
          aria-haspopup="dialog"
          title="How to play"
          onClick={openGuide}
        >
          <CircleHelp size={18} aria-hidden="true" />
        </button>
      </ShellBar>

      <header className="pass-title">
        <p className="pass-kicker">{shop} · Order rail</p>
        <h1 data-screen-title tabIndex={-1}>
          Choose a shift
        </h1>
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
                shop={shop}
                number={actIndex}
                state={stateOf(actIndex)}
                current={actIndex === current}
                selected={scene ? -1 : selected}
                unlocked={save.unlocked}
                stars={save.stars}
                titles={titles}
                ordering={ordering}
                gated={gated}
                selectedScene={scene}
                sceneOpen={(target) => sceneOpen(save, target)}
                sceneSeen={(target) => sceneSeen(save, target)}
                onOpen={() => openAct(actIndex)}
                onSelect={turnTo}
                onStart={start}
                onSelectScene={turnToScene}
                onWatch={watch}
              />
            ))}
          </nav>
        </div>
      </div>

      {scene ? (
        <SceneBoard scene={scene} seen={sceneSeen(save, scene)} onWatch={() => watch(scene)} />
      ) : (
        <aside className="recipe" aria-label="Selected shift" aria-live="polite" aria-atomic="true">
          <div className="board">
            <div className="board-chalk" key={selected}>
              <p className="board-kicker">
                <span>
                  Today’s special <span className="board-no">No. {pad2(selected + 1)}</span>
                </span>
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
                      <dt>
                        <span aria-hidden="true">★★</span>
                        <span className="sr-only">Two stars</span>
                      </dt>
                      <dd>
                        <span aria-hidden="true">≤ {level.block_target} blocks</span>
                        <span className="sr-only">{level.block_target} blocks or fewer</span>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <span aria-hidden="true">★★★</span>
                        <span className="sr-only">Three stars</span>
                      </dt>
                      <dd>
                        <span aria-hidden="true">≤ {level.instruction_target} steps</span>
                        <span className="sr-only">{level.instruction_target} steps or fewer</span>
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="board-story">{shift.story}</p>
              <p className="board-note">
                <strong>Chef’s note</strong> {shift.hint}
              </p>
              <svg className="board-doodle" viewBox="0 0 120 100" aria-hidden="true">
                <path className="board-steam" d="M44 32c-6-8 6-14 0-24M58 32c-6-8 6-14 0-24M72 32c-6-8 6-14 0-24" />
                <path d="M24 42h68v16c0 14-15 22-34 22s-34-8-34-22z" />
                <path d="M92 47c12 0 14 8 12 13-2 6-8 8-13 7" />
                <path d="M14 86c10 5 78 5 90 0" />
              </svg>
              <p className="board-foot">
                {observation ? (
                  <span className="board-scene">{isComplete(selected) ? 'Watched' : 'Sit back and watch'}</span>
                ) : (
                  <span
                    className="board-stars"
                    role="img"
                    // Every pass earns a star, so none means the shift hasn't been served yet.
                    aria-label={save.stars[selected] ? `${save.stars[selected]} of 3 stars` : 'No stars yet'}
                  >
                    {starRow(save.stars[selected] ?? 0)}
                  </span>
                )}
              </p>
            </div>
            <div className="board-launch">
              <Button
                className="recipe-start"
                variant="primary"
                onClick={() => start(selected)}
                disabled={ordering !== null}
              >
                <Play size={17} fill="currentColor" aria-hidden="true" />{' '}
                {ordering !== null
                  ? 'Order up…'
                  : isComplete(selected)
                    ? observation
                      ? 'Watch again'
                      : 'Serve again'
                    : 'Start shift'}
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
      )}
    </main>
  );
}

/** A scene chalked up on the specials board in place of a shift: what it shows, and a button to watch it. */
function SceneBoard({ scene, seen, onWatch }: { scene: Cutscene; seen: boolean; onWatch(): void }) {
  const closing = scene.before >= levels.length;
  return (
    <aside className="recipe scene-recipe" aria-label="Selected scene" aria-live="polite" aria-atomic="true">
      <div className="board">
        <div className="board-chalk" key={scene.id}>
          <p className="board-kicker">
            <span>
              Cutscene <Clapperboard className="board-clapper" size={14} aria-hidden="true" />
            </span>
            <span className={`board-tag ${seen ? 'done' : 'next'}`}>{seen ? 'Seen' : 'New'}</span>
          </p>
          <h2>{scene.title}</h2>
          <svg className="board-swash" viewBox="0 0 200 12" aria-hidden="true">
            <path d="M2 8 C 30 2, 50 12, 80 6 S 130 2, 160 7 S 190 9, 198 4" />
          </svg>
          <dl className="board-menu">
            <div>
              <dt>Shots</dt>
              <dd>{scene.panels.length}</dd>
            </div>
            <div>
              <dt>{closing ? 'After' : 'Before'}</dt>
              <dd>{closing ? 'The last shift' : `Shift ${pad2(scene.before + 1)}`}</dd>
            </div>
          </dl>
          <p className="board-story">{scene.logline}</p>
          <p className="board-note">
            <strong>Chef’s note</strong> Skip, or Esc, ends the scene early.
          </p>
        </div>
        <div className="board-launch">
          <Button className="recipe-start" variant="primary" onClick={onWatch}>
            <Clapperboard size={17} aria-hidden="true" /> {seen ? 'Watch again' : 'Watch scene'}
          </Button>
          <p className="board-hint" aria-hidden="true">
            <kbd>←</kbd> <kbd>→</kbd> browse · double-click to watch
          </p>
        </div>
      </div>
    </aside>
  );
}
