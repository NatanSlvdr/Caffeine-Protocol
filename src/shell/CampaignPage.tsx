import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BookOpen, CircleHelp, Clapperboard, Dumbbell, History, Play, Sparkles, Wrench } from 'lucide-react';
import { DialogueBox } from '@/components';
import { levels } from '@/data';
import { cutscenes, sceneBefore, sceneOpen, sceneSeen, waitingScene, type Cutscene } from '@/data/campaign/cutscenes';
import { guestbookNotes } from '@/data/campaign/guestbook';
import { drills } from '@/data/drills';
import { kits } from '@/data/kits';
import { predictions } from '@/data/predictions';
import { memories, memoryOpen } from '@/data/memories';
import { repairOpen, repairs, type Repair } from '@/data/repairs';
import { longDay } from '@/data/longDay';
import { specials } from '@/data/specials';
import { startDay } from '@/features/campaign/save/endurance';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/shared/ui/Button';
import { useUntranslated, useWords } from '@/shared/language';
import { go, openGuide } from '@/shared/lib/navigation';
import { pad2, starRow } from '@/shared/lib/format';
import { useCafeName, useGame, useNarrative, useProgress } from '@/state/GameStore';
import { actIndexFor, acts } from './rail/acts';
import { Ticket, type ActState } from './rail/Ticket';
import { RAIL_WORDS } from './rail/railWords';
import { DrillsWindow } from './DrillsWindow';
import { GuestbookWindow } from './GuestbookWindow';
import { keepsakes, shelved } from './shelf';
import { ShelfWindow } from './ShelfWindow';
import { SpecialsWindow } from './SpecialsWindow';
import { MemoriesWindow } from './MemoriesWindow';
import { RepairBayWindow } from './RepairBayWindow';
import { useUnseen } from './unseen';
import { ShellBar } from './ShellBar';

/** How long "Order up!" stays on the specials board before the shift opens. */
const ORDER_UP_MS = 650;

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
  const { save, update, select, launch, completeDrill, completeRepair } = useGame();
  const progress = useProgress();
  const shop = useCafeName();
  const say = useWords(RAIL_WORDS);
  const english = useUntranslated();
  const narrative = useNarrative();
  const titles = useMemo(() => narrative.map((row) => row.title), [narrative]);
  const reducedMotion = useReducedMotion(save.settings.reduced_motion);
  const rail = useRef<HTMLDivElement>(null);
  const orderTimer = useRef<number | undefined>(undefined);
  const [ordering, setOrdering] = useState<number | null>(null);
  // A scene waiting before the selected shift is what the rail opens on.
  const [scene, setScene] = useState<Cutscene | undefined>(() => waitingScene(save, save.selected));
  const gated = waitingScene(save, save.unlocked)?.before;
  const notes = guestbookNotes(save);
  const earned = shelved(save);
  // What came in since the book or the shelf was last opened is marked on its button, and in it while it is open.
  const newNotes = useUnseen(
    'guestbook',
    notes.map((note) => String(note.shift)),
  );
  const newKeepsakes = useUnseen(
    'shelf',
    earned.map((keepsake) => keepsake.id),
  );
  const [reading, setReading] = useState<readonly string[] | null>(null);
  const [looking, setLooking] = useState<readonly string[] | null>(null);
  const isServed = ({ shift }: { shift: number }) => save.stars[shift - 1] !== undefined;
  const gaps = drills.filter(isServed),
    moments = predictions.filter(isServed),
    builds = kits.filter(isServed);
  const served = [...gaps, ...moments, ...builds];
  const newDrills = useUnseen(
    'drills',
    served.map((drill) => drill.id),
  );
  const [drilling, setDrilling] = useState<readonly string[] | null>(null);
  // The regulars ask for their specials once the campaign is finished.
  const offered = save.complete ? specials : [];
  // The Long Day is chalked up with them, after the last.
  const newSpecials = useUnseen('specials', save.complete ? [...offered.map((special) => special.id), longDay.id] : []);
  const [choosing, setChoosing] = useState<readonly string[] | null>(null);
  // The crew's memories of Lou's café come out as the shifts that bring them are served.
  const remembered = memories.filter((memory) => memoryOpen(save, memory));
  const newMemories = useUnseen(
    'memories',
    remembered.map((memory) => memory.id),
  );
  const [recalling, setRecalling] = useState<readonly string[] | null>(null);
  // The robots come to the repair bench once the shift that teaches their last sensor is served.
  const benches = repairs.filter((repair) => repairOpen(save, repair));
  const newBenches = useUnseen(
    'repairs',
    benches.map((repair) => repair.id),
  );
  const [repairing, setRepairing] = useState<readonly string[] | null>(null);
  // The robot just mended, its scene playing over the rail; the bay's button takes focus back after it.
  const [closingUp, setClosingUp] = useState<Repair>();
  const bayButton = useRef<HTMLButtonElement>(null);

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
  const shift = narrative[selected];
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

  // Left and right move along the order unless focus is in a text field.
  // Pressed from a line on the ticket, the arrows carry focus along, so the focus ring stays on the chosen line; there
  // up and down work too, as the lines run down the ticket, and Home and End reach the first and the latest open line.
  // Elsewhere up and down, Home and End are left to scroll the page.
  const followFocus = useRef(false);
  const step = (direction: -1 | 1 | 'first' | 'last', fromLine: boolean) => {
    const entry =
      direction === 'first'
        ? entries.find(opens)
        : direction === 'last'
          ? entries.findLast(opens)
          : neighbour(direction);
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
      const onLine = target instanceof Element && !!target.closest('.shift-card');
      const direction =
        event.key === 'ArrowLeft' || (onLine && event.key === 'ArrowUp')
          ? -1
          : event.key === 'ArrowRight' || (onLine && event.key === 'ArrowDown')
            ? 1
            : onLine && event.key === 'Home'
              ? 'first'
              : onLine && event.key === 'End'
                ? 'last'
                : 0;
      if (!direction) return;
      keys.current(direction, onLine);
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className={`campaign-page ${reducedMotion ? 'still' : ''} ${ordering !== null ? 'ordering' : ''}`}>
      <ShellBar label={say.bar} back="Caffeine Protocol" onBack={() => go('/')}>
        <button
          className="shell-icon"
          aria-label={say.howToPlay}
          aria-haspopup="dialog"
          title={say.howToPlay}
          onClick={openGuide}
        >
          <CircleHelp size={18} aria-hidden="true" />
        </button>
        {/* The regulars start writing once a shift they were part of has been served. */}
        {notes.length > 0 && (
          <button
            className="shell-icon"
            aria-label={say.guestbook.label(notes.length, newNotes.fresh.length)}
            aria-haspopup="dialog"
            title={say.guestbook.title}
            onClick={() => setReading(newNotes.markSeen())}
          >
            <BookOpen size={18} aria-hidden="true" />
            {newNotes.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
        {/* The shelf goes up with its first keepsake; from then on it shows what is left to earn too. */}
        {earned.length > 0 && (
          <button
            className="shell-icon"
            aria-label={say.shelf.label(earned.length, keepsakes.length, newKeepsakes.fresh.length)}
            aria-haspopup="dialog"
            title={say.shelf.title}
            onClick={() => setLooking(newKeepsakes.markSeen())}
          >
            <Award size={18} aria-hidden="true" />
            {newKeepsakes.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
        {offered.length > 0 && (
          <button
            className="shell-icon"
            aria-label={say.specials.label(offered.length + 1, newSpecials.fresh.length)}
            aria-haspopup="dialog"
            title={say.specials.title}
            onClick={() => setChoosing(newSpecials.markSeen())}
          >
            <Sparkles size={18} aria-hidden="true" />
            {newSpecials.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
        {remembered.length > 0 && (
          <button
            className="shell-icon"
            aria-label={say.memories.label(remembered.length, newMemories.fresh.length)}
            aria-haspopup="dialog"
            title={say.memories.title}
            onClick={() => setRecalling(newMemories.markSeen())}
          >
            <History size={18} aria-hidden="true" />
            {newMemories.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
        {benches.length > 0 && (
          <button
            ref={bayButton}
            className="shell-icon"
            aria-label={say.repairs.label(benches.length, newBenches.fresh.length)}
            aria-haspopup="dialog"
            title={say.repairs.title}
            onClick={() => setRepairing(newBenches.markSeen())}
          >
            <Wrench size={18} aria-hidden="true" />
            {newBenches.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
        {/* Drills come out with the first served shift that has one. */}
        {served.length > 0 && (
          <button
            className="shell-icon"
            aria-label={say.drills.label(served.length, newDrills.fresh.length)}
            aria-haspopup="dialog"
            title={say.drills.title}
            onClick={() => setDrilling(newDrills.markSeen())}
          >
            <Dumbbell size={18} aria-hidden="true" />
            {newDrills.fresh.length > 0 && <span className="shell-icon-new" aria-hidden="true" />}
          </button>
        )}
      </ShellBar>
      {drilling && (
        <DrillsWindow
          drills={gaps}
          predictions={moments}
          kits={builds}
          waiting={drills.length + predictions.length + kits.length - served.length}
          fresh={drilling}
          done={save.drills}
          onDone={completeDrill}
          onClose={() => setDrilling(null)}
        />
      )}
      {choosing && (
        <SpecialsWindow
          specials={offered}
          save={save}
          fresh={choosing}
          onServe={(special) => go(`/special/${special.id}`)}
          onDay={(afresh) => {
            if (afresh) update((s) => startDay(s, longDay.version));
            go(`/${longDay.id}/${afresh ? 1 : (save.endurance?.wave ?? 1)}`);
          }}
          onClose={() => setChoosing(null)}
        />
      )}
      {recalling && (
        <MemoriesWindow
          memories={remembered}
          save={save}
          fresh={recalling}
          onPlay={(memory) => go(`/memory/${memory.id}`)}
          onClose={() => setRecalling(null)}
        />
      )}
      {repairing && (
        <RepairBayWindow
          repairs={benches}
          mended={save.repairs ?? []}
          waiting={repairs.length - benches.length}
          fresh={repairing}
          onMend={(repair) => {
            completeRepair(repair.id);
            setRepairing(null);
            setClosingUp(repair);
          }}
          onClose={() => setRepairing(null)}
        />
      )}
      {closingUp && (
        <DialogueBox
          lines={closingUp.scene}
          kicker={closingUp.title}
          kickerLang={english}
          kickerLabel={say.repairs.title}
          doneLabel={say.backToRail}
          instant={reducedMotion}
          onDone={() => {
            setClosingUp(undefined);
            bayButton.current?.focus();
          }}
        />
      )}
      {reading && <GuestbookWindow notes={notes} fresh={reading} onClose={() => setReading(null)} />}
      {looking && <ShelfWindow save={save} earned={earned} fresh={looking} onClose={() => setLooking(null)} />}

      <header className="pass-title">
        <p className="pass-kicker">{say.kicker(shop)}</p>
        <h1 data-screen-title tabIndex={-1}>
          {say.title}
        </h1>
        <p className="pass-progress">
          <strong>{progress.done}</strong>
          {say.progress(progress.total, progress.done)}
        </p>
      </header>

      <div className="pass-stage">
        <div className="pass" ref={rail}>
          <nav className="pass-track" aria-label={say.shifts}>
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
        <aside className="recipe" aria-label={say.selectedShift} aria-live="polite" aria-atomic="true">
          <div className="board">
            <div className="board-chalk" key={selected}>
              <p className="board-kicker">
                <span>
                  {say.special} <span className="board-no">{say.number(pad2(selected + 1))}</span>
                </span>
                {(upNext || isComplete(selected)) && (
                  <span className={`board-tag ${isComplete(selected) ? 'done' : 'next'}`}>
                    {isComplete(selected) ? say.servedTag : say.upNext}
                  </span>
                )}
              </p>
              <h2>{shift.title}</h2>
              <svg className="board-swash" viewBox="0 0 200 12" aria-hidden="true">
                <path d="M2 8 C 30 2, 50 12, 80 6 S 130 2, 160 7 S 190 9, 198 4" />
              </svg>
              <dl className="board-menu">
                <div>
                  <dt>{say.tables}</dt>
                  <dd>{level.active_tables}</dd>
                </div>
                {observation ? (
                  <div>
                    <dt>{say.service}</dt>
                    <dd>{say.watchOnly}</dd>
                  </div>
                ) : (
                  <>
                    <div>
                      <dt>
                        <span aria-hidden="true">★★</span>
                        <span className="sr-only">{say.twoStars}</span>
                      </dt>
                      <dd>
                        <span aria-hidden="true">{say.blocks(level.block_target)}</span>
                        <span className="sr-only">{say.blocksSaid(level.block_target)}</span>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <span aria-hidden="true">★★★</span>
                        <span className="sr-only">{say.threeStars}</span>
                      </dt>
                      <dd>
                        <span aria-hidden="true">{say.steps(level.instruction_target)}</span>
                        <span className="sr-only">{say.stepsSaid(level.instruction_target)}</span>
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="board-story">{shift.story}</p>
              <p className="board-note">
                <strong>{say.chefsNote}</strong> {shift.hint}
              </p>
              <svg className="board-doodle" viewBox="0 0 120 100" aria-hidden="true">
                <path className="board-steam" d="M44 32c-6-8 6-14 0-24M58 32c-6-8 6-14 0-24M72 32c-6-8 6-14 0-24" />
                <path d="M24 42h68v16c0 14-15 22-34 22s-34-8-34-22z" />
                <path d="M92 47c12 0 14 8 12 13-2 6-8 8-13 7" />
                <path d="M14 86c10 5 78 5 90 0" />
              </svg>
              <p className="board-foot">
                {observation ? (
                  <span className="board-scene">{isComplete(selected) ? say.watched : say.sitBack}</span>
                ) : (
                  <span
                    className="board-stars"
                    role="img"
                    // Every pass earns a star, so none means the shift hasn't been served yet.
                    aria-label={save.stars[selected] ? say.starsOf(save.stars[selected]) : say.noStars}
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
                  ? say.ordering
                  : isComplete(selected)
                    ? observation
                      ? say.watchAgain
                      : say.serveAgain
                    : say.start}
              </Button>
              <p className="board-hint" aria-hidden="true">
                <kbd>←</kbd> <kbd>→</kbd> {say.browse} · <kbd>↵</kbd> {say.toStart}
              </p>
            </div>
            {ordering !== null && (
              <span className="board-order-up" aria-hidden="true">
                {say.orderUp}
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
  const say = useWords(RAIL_WORDS);
  const english = useUntranslated();
  return (
    <aside className="recipe scene-recipe" aria-label={say.selectedScene} aria-live="polite" aria-atomic="true">
      <div className="board">
        <div className="board-chalk" key={scene.id}>
          <p className="board-kicker">
            <span>
              {say.cutscene} <Clapperboard className="board-clapper" size={14} aria-hidden="true" />
            </span>
            <span className={`board-tag ${seen ? 'done' : 'next'}`}>{seen ? say.seen : say.fresh}</span>
          </p>
          <h2 lang={english}>{scene.title}</h2>
          <svg className="board-swash" viewBox="0 0 200 12" aria-hidden="true">
            <path d="M2 8 C 30 2, 50 12, 80 6 S 130 2, 160 7 S 190 9, 198 4" />
          </svg>
          <dl className="board-menu">
            <div>
              <dt>{say.shots}</dt>
              <dd>{scene.panels.length}</dd>
            </div>
            <div>
              <dt>{closing ? say.after : say.before}</dt>
              <dd>{closing ? say.lastShift : say.beforeShift(pad2(scene.before + 1))}</dd>
            </div>
          </dl>
          <p className="board-story" lang={english}>
            {scene.logline}
          </p>
          <p className="board-note">
            <strong>{say.chefsNote}</strong> {say.sceneNote}
          </p>
        </div>
        <div className="board-launch">
          <Button className="recipe-start" variant="primary" onClick={onWatch}>
            <Clapperboard size={17} aria-hidden="true" /> {seen ? say.watchAgain : say.watchScene}
          </Button>
          <p className="board-hint" aria-hidden="true">
            <kbd>←</kbd> <kbd>→</kbd> {say.browse} · <kbd>↵</kbd> {say.toWatch}
          </p>
        </div>
      </div>
    </aside>
  );
}
