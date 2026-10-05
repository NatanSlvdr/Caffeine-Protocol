import { Bot, Map, Puzzle, Star } from 'lucide-react';
import { Modal } from '@/components';
import { UNLOCKS } from '@/domain';
import { CAMPAIGN_LENGTH } from '@/data';
import { pad2, RUN_MODIFIER } from '@/shared/lib/format';
import { useCafeName, useGame } from '@/state/GameStore';

/** A star count drawn as glyphs and read aloud in words. */
function Stars({ n }: { n: 1 | 2 | 3 }) {
  return (
    <>
      <span className="guide-stars" aria-hidden="true">
        {'★'.repeat(n)}
      </span>
      <span className="sr-only">{['One star', 'Two stars', 'Three stars'][n - 1]}</span>
    </>
  );
}

/** "a", "a and b", "a, b, and c". */
const list = (parts: readonly string[]) =>
  parts.length < 3 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;

/** Each robot, the shift it starts, its job, and who does that job by hand until it does. */
const CREW = [
  {
    robot: 'Query',
    from: UNLOCKS.query,
    job: 'takes orders',
    hand: 'Niko',
    ticket: 'writes down what the guest asked for',
  },
  {
    robot: 'Brew',
    from: UNLOCKS.prep,
    job: 'runs the kitchen',
    hand: 'Moka',
    ticket: 'makes exactly what the ticket says',
  },
  {
    robot: 'Porter',
    from: UNLOCKS.floor,
    job: 'works the floor',
    hand: 'Pip',
    ticket: 'takes it to the table it names',
  },
];

/**
 * How to play, printed on the same slip of order paper as the house settings. It names a robot once its act has opened
 * on the rail, as the act's ticket does, so the handbook never tells who joins the crew before the story does.
 */
export function GuideWindow({ onClose }: { onClose: () => void }) {
  const cafe = useCafeName();
  const { save } = useGame();
  // An act opens on the rail once its first shift is unlocked; each robot's act starts on the shift it does.
  const met = CREW.filter(({ from }) => save.unlocked >= from - 1);
  const starts = met.map(({ robot, job, from }) => `${robot} ${job} from Shift ${pad2(from)}`);
  const all = met.length === CREW.length;
  const crew = `Over ${CAMPAIGN_LENGTH} shifts, you program ${all ? 'three ' : ''}secondhand robots until it runs by itself${
    starts.length > 0 ? `: ${list(starts)}` : ''
  }.${all ? '' : met.length > 0 ? ' More of the crew turn up as the café comes back.' : ' The first of them turns up after the opening day.'}`;
  // Whoever does each job now: the robot once it has joined, the one doing it by hand until then.
  const ticket = list(CREW.map((job) => `${met.includes(job) ? job.robot : job.hand} ${job.ticket}`));
  return (
    <Modal
      className="settings-window guide-window"
      kicker={`${cafe} · Staff handbook`}
      title="How the café runs."
      onClose={onClose}
      wide
    >
      <div className="settings-sheet">
        <section className="settings-block">
          <h3>
            <Bot size={16} aria-hidden="true" /> The crew
          </h3>
          <p>The café has more guests than one pair of hands can serve. {crew}</p>
          <p>Until a robot takes over, its job is done by hand: Niko writes the tickets, Moka brews and Pip serves.</p>
        </section>
        <section className="settings-block">
          <h3>
            <Puzzle size={16} aria-hidden="true" /> Writing a routine
          </h3>
          <p>
            Tap or click a block’s name in the library to add it to the end, or drag it exactly where it belongs. To add
            a few in the middle, tap a block in the routine first: new ones follow it, or fill it if it’s an empty
            branch, until you tap it again. A picked block also has buttons to copy it, move it a step or remove it,
            group and all. Set its values right in the code pane. From the keyboard, a value’s menu opens with the arrow
            keys, or by typing the first letters of the one you want.
          </p>
          <p>
            Drag a branch, loop or function by its first block to move it whole, or drag a block out of the code to
            remove it. On a touch screen, rest a finger on a block until it rises, then drag; a quicker swipe scrolls
            the routine. The arrow at the end of its first block folds it shut, to read a long routine at a glance; it
            opens by itself to show the block running or the one that failed. The target on a jump or a call takes you
            to where it lands, or to its function. A block the routine would stop on is ringed in amber before you run
            it, with a note under the code saying why. From the keyboard: <kbd>Space</kbd> to lift, arrow keys to move,{' '}
            <kbd>Space</kbd> to drop, <kbd>Esc</kbd> to put it back, <kbd>Delete</kbd> to remove it, <kbd>Enter</kbd> to
            pick it as the place new blocks go.
          </p>
          <p>
            Rather type? Turn on the <strong>Text editor</strong> in a shift’s Options: the same routine, one block per
            line, numbered down the side. With the caret inside an If, For or Function, a gold line in the margin joins
            it to its End. Under the text, a line says what the block on the caret’s line does, and{' '}
            <strong>Tidy up</strong> (<kbd>Shift + Alt + F</kbd>) lays the routine out by depth.
          </p>
          <p>
            Changed your mind? <strong>Undo</strong> (<kbd>{RUN_MODIFIER} + Z</kbd>) steps back through every edit,
            reset and worked example, one robot at a time, and <strong>Redo</strong> (
            <kbd>{RUN_MODIFIER} + Shift + Z</kbd>) steps forward again.
          </p>
        </section>
        <section className="settings-block">
          <h3>
            <Map size={16} aria-hidden="true" /> Around the café
          </h3>
          <p>
            Move counts whole tiles in screen directions. A blocked move stops early, and customers never block the way.
            Station actions only work beside the matching equipment.
          </p>
          <p>The ticket ties the crew together: {ticket}. So a slip at the counter ends up at the table.</p>
        </section>
        <section className="settings-block">
          <h3>
            <Star size={16} aria-hidden="true" /> Service & stars
          </h3>
          <p>
            <strong>Run service</strong> (or <kbd>{RUN_MODIFIER} + Enter</kbd>) sets the crew to work, and{' '}
            <strong>Stop &amp; edit</strong> (or <kbd>Esc</kbd>) takes you back to the code. If an instruction fails,
            its line lights up and you can fix it straight away. Most shifts send in a few rounds of guests, one after
            another, and every round has to go right. With the café idle, <kbd>Esc</kbd> heads back to the campaign.
          </p>
          <p>
            <Stars n={1} /> serves every order correctly, <Stars n={2} /> also meets the block target, and{' '}
            <Stars n={3} /> the step target on top. Each shift’s Help has its lesson, then hints one at a time: the
            idea, a clue about your routine, and a worked example.
          </p>
        </section>
      </div>
      <p className="settings-foot" aria-hidden="true">
        <span className="settings-barcode" />
        Welcome to the team
      </p>
    </Modal>
  );
}
