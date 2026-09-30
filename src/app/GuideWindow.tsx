import { Bot, Map, Puzzle, Star } from 'lucide-react';
import { Modal } from '@/components';
import { UNLOCKS } from '@/domain';
import { CAMPAIGN_LENGTH } from '@/data';

/** How to play, printed on the same slip of order paper as the house settings. */
export function GuideWindow({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      className="settings-window guide-window"
      kicker="Café Niko · Staff handbook"
      title="How the café runs."
      onClose={onClose}
      wide
    >
      <div className="settings-sheet">
        <section className="settings-block">
          <h3>
            <Bot size={16} /> The crew
          </h3>
          <p>
            {CAMPAIGN_LENGTH} shifts, three robots. Query takes orders from shift {UNLOCKS.query}, Brew runs the kitchen
            from shift {UNLOCKS.prep}, and Porter works the floor from shift {UNLOCKS.floor}.
          </p>
          <p>Until you program those roles, Moka brews and Pip serves on their own.</p>
        </section>
        <section className="settings-block">
          <h3>
            <Puzzle size={16} /> Writing a routine
          </h3>
          <p>
            Click a block’s name in the library to add it to the end, or drag it exactly where it belongs. Set its
            values right in the code pane.
          </p>
          <p>
            Drag a grip to move a whole branch, loop or function. From the keyboard: <kbd>Space</kbd> to lift, arrow
            keys to move, <kbd>Space</kbd> to drop.
          </p>
        </section>
        <section className="settings-block">
          <h3>
            <Map size={16} /> Around the café
          </h3>
          <p>
            MOVE counts whole tiles in screen directions. A blocked move stops early, and customers never block the way.
            Station actions only work beside the matching equipment.
          </p>
          <p>Coffee costs 3 credits and tea 2; sugar is on the house. Checkout at the register is automatic.</p>
        </section>
        <section className="settings-block">
          <h3>
            <Star size={16} /> Service & stars
          </h3>
          <p>
            Run service with <kbd>Ctrl / ⌘ + Enter</kbd>. If an instruction fails, its line lights up and you can fix it
            straight away.
          </p>
          <p>
            <span className="guide-stars">★</span> serves every order correctly, <span className="guide-stars">★★</span>{' '}
            meets the block target, <span className="guide-stars">★★★</span> the step target. Each shift’s Help has its
            lesson and a worked example.
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
