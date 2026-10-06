import { Bot, Map, Puzzle, Star } from 'lucide-react';
import { Modal } from '@/components';
import { UNLOCKS } from '@/domain';
import { CAMPAIGN_LENGTH } from '@/data';
import { pad2, RUN_MODIFIER } from '@/shared/lib/format';
import { useCafeName, useGame } from '@/state/GameStore';

import { useWords } from '@/shared/language';
import { GUIDE_WORDS } from './guideWords';

/** A star count drawn as glyphs and read aloud in words. */
function Stars({ n, said }: { n: 1 | 2 | 3; said: string }) {
  return (
    <>
      <span className="guide-stars" aria-hidden="true">
        {'★'.repeat(n)}
      </span>
      <span className="sr-only">{said}</span>
    </>
  );
}

/** Each robot, the shift it starts, and who does its job by hand until it does. */
const CREW = [
  { robot: 'Query', from: UNLOCKS.query, hand: 'Niko' },
  { robot: 'Brew', from: UNLOCKS.prep, hand: 'Moka' },
  { robot: 'Porter', from: UNLOCKS.floor, hand: 'Pip' },
] as const;

/**
 * How to play, printed on the same slip of order paper as the house settings. It names a robot once its act has opened
 * on the rail, as the act's ticket does, so the handbook never tells who joins the crew before the story does.
 */
export function GuideWindow({ onClose }: { onClose: () => void }) {
  const cafe = useCafeName();
  const { save } = useGame();
  const say = useWords(GUIDE_WORDS);
  // An act opens on the rail once its first shift is unlocked; each robot's act starts on the shift it does.
  const met = CREW.filter(({ from }) => save.unlocked >= from - 1);
  const starts = met.map(({ robot, from }) => say.starts(robot, say.jobs[robot].job, pad2(from)));
  const crew = say.crew(CAMPAIGN_LENGTH, met.length === CREW.length, say.list(starts), met.length);
  // Whoever does each job now: the robot once it has joined, the one doing it by hand until then.
  const ticket = say.list(
    CREW.map(
      (job) => `${met.some(({ robot }) => robot === job.robot) ? job.robot : job.hand} ${say.jobs[job.robot].ticket}`,
    ),
  );
  const star = (n: 1 | 2 | 3) => <Stars n={n} said={say.stars[n - 1]} />;
  return (
    <Modal className="settings-window guide-window" kicker={say.kicker(cafe)} title={say.title} onClose={onClose} wide>
      <div className="settings-sheet">
        <section className="settings-block">
          <h3>
            <Bot size={16} aria-hidden="true" /> {say.crewHeading}
          </h3>
          <p>{say.guests(crew)}</p>
          <p>{say.byHand}</p>
        </section>
        <section className="settings-block">
          <h3>
            <Puzzle size={16} aria-hidden="true" /> {say.routineHeading}
          </h3>
          <p>{say.adding}</p>
          <p>{say.moving}</p>
          <p>{say.typing}</p>
          <p>{say.undo(RUN_MODIFIER)}</p>
          <p>{say.notebook}</p>
        </section>
        <section className="settings-block">
          <h3>
            <Map size={16} aria-hidden="true" /> {say.aroundHeading}
          </h3>
          <p>{say.moves}</p>
          <p>{say.ticket(ticket)}</p>
        </section>
        <section className="settings-block">
          <h3>
            <Star size={16} aria-hidden="true" /> {say.serviceHeading}
          </h3>
          <p>{say.running(RUN_MODIFIER)}</p>
          <p>{say.rating(star(1), star(2), star(3))}</p>
        </section>
      </div>
      <p className="settings-foot" aria-hidden="true">
        <span className="settings-barcode" />
        {say.foot}
      </p>
    </Modal>
  );
}
