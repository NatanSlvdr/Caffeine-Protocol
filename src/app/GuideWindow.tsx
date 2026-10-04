import { Bot, Map, Puzzle, Star } from 'lucide-react';
import { Modal } from '@/components';
import { UNLOCKS } from '@/domain';
import { CAMPAIGN_LENGTH } from '@/data';
import { pad2, RUN_MODIFIER } from '@/shared/lib/format';
import { useCafeName } from '@/state/GameStore';

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

/** How to play, printed on the same slip of order paper as the house settings. */
export function GuideWindow({ onClose }: { onClose: () => void }) {
  const cafe = useCafeName();
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
          <p>
            The café has more guests than one pair of hands can serve. Over {CAMPAIGN_LENGTH} shifts, you program three
            secondhand robots until it runs by itself: Query takes orders from Shift {pad2(UNLOCKS.query)}, Brew runs
            the kitchen from Shift {pad2(UNLOCKS.prep)}, and Porter works the floor from Shift {pad2(UNLOCKS.floor)}.
          </p>
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
            remove it. The arrow at the end of its first block folds it shut, to read a long routine at a glance; it
            opens by itself to show the block running or the one that failed. The target on a jump or a call takes you
            to where it lands, or to its function. From the keyboard: <kbd>Space</kbd> to lift, arrow keys to move,{' '}
            <kbd>Space</kbd> to drop, <kbd>Esc</kbd> to put it back, <kbd>Delete</kbd> to remove it, <kbd>Enter</kbd> to
            pick it as the place new blocks go.
          </p>
          <p>
            Rather type? Turn on the <strong>Text editor</strong> in a shift’s Options: the same routine, one block per
            line.
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
          <p>
            The ticket ties the crew together: Query writes down what the guest asked for, Brew makes exactly what the
            ticket says, and Porter takes it to the table it names. So a slip at the counter ends up at the table.
          </p>
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
