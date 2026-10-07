import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import type { ChallengeMeasure, LevelDefinition, ReplayEvent, RunResult } from '@/domain';
import { starRow } from '@/shared/lib/format';
import { useUntranslated, useWords } from '@/shared/language';
import { guestWaits } from '../waits';
import { challengeOutcomes, CHALLENGE_WORDS } from '../challenges';
import { RECEIPT_WORDS } from './receiptWords';

export interface ReceiptModalProps {
  /** What the kicker calls the shift: "Shift 03", or "Special". */
  label: string;
  level: LevelDefinition;
  result: RunResult;
  observation: boolean;
  /** The next shift's title, or nothing after the last shift. */
  nextShift?: string;
  /** A special's thanks, said in place of the next shift: its way on goes back to the campaign. */
  thanks?: string;
  /** This shift's stars before the run, if it had been served before. */
  best?: number;
  /** This shift's optional challenges met before the run. */
  metBefore?: ChallengeMeasure[];
  /** The run before this one that played the same rounds, to compare with; nothing on a first run. */
  compareWith?: number;
  onCompare?: () => void;
  /** A way on that can also stop here, like a wave of the Long Day: the primary button's words, and the other way. */
  onward?: Onward;
  onNext: () => void;
  onClose: () => void;
}

export interface Onward {
  /** The primary button's words: "Next wave". */
  next: string;
  /** The words of the way out: "Stop for now". */
  stop: string;
  onStop: () => void;
}

/** Service receipt: stars, the totals measured against this shift's targets, and the next shift. */
export function ReceiptModal({
  label,
  level,
  result,
  observation,
  nextShift,
  thanks,
  best,
  metBefore,
  compareWith,
  onCompare,
  onward,
  onNext,
  onClose,
}: ReceiptModalProps) {
  const say = useWords(RECEIPT_WORDS);
  const english = useUntranslated();
  const challengeWords = useWords(CHALLENGE_WORDS);
  const blocks = result.block_count ?? 0;
  // A passed service served every guest. Tickets count drinks, so a two-drink order would count twice.
  const guests = level.seeds.reduce(
    (sum, seed) => sum + seed.customers.filter((customer) => !customer.expected.closing).length,
    0,
  );
  const blocksMet = blocks <= level.block_target;
  const stepsMet = result.executed_instructions <= level.instruction_target;
  // Stars climb in order, so a step target beaten over the block target earns nothing yet: say so.
  const stepsHeld = stepsMet && !blocksMet;
  // A missed target says how far off it was, so the next star is a number to beat, not a guess.
  const nextStar = observation
    ? ''
    : stepsHeld
      ? say.held(blocks - level.block_target)
      : !blocksMet
        ? say.fewerBlocks(blocks - level.block_target, level.block_target)
        : !stepsMet
          ? say.fewerSteps(result.executed_instructions - level.instruction_target, level.instruction_target)
          : '';
  // A replay says whether it beat the shift's best, so going back for stars has a point.
  const replay =
    observation || best === undefined
      ? ''
      : result.stars > best
        ? say.newBest(best)
        : result.stars < best
          ? say.bestStays(best)
          : '';
  // Where the guests' time went, so a slow service says which part to look at. The opening day was served by hand.
  const waits = observation ? [] : guestWaits(result.events ?? []);
  // The challenges come to light with the first pass, and every service after says how it measured up.
  const challenges = observation ? [] : challengeOutcomes(level.challenges ?? [], result, metBefore, challengeWords);
  const together = level.service?.together === undefined ? undefined : servedTogether(result.events);
  return (
    <Modal
      title={say.title}
      kicker={say.kicker(label)}
      onClose={onClose}
      className="settings-window confirm-slip receipt-slip"
    >
      <p className="receipt-lead">{observation ? say.byHand : say.served}</p>
      {!observation && (
        <p className="receipt-stars" role="img" aria-label={say.stars(result.stars)}>
          {starRow(result.stars)}
        </p>
      )}
      {replay && <p className="receipt-best">{replay}</p>}
      <dl className="receipt-totals">
        <div>
          <dt>{say.guests}</dt>
          <dd>{guests}</dd>
        </div>
        {!observation && (
          <>
            <div className={blocksMet ? 'met' : ''}>
              <dt>{say.blocks}</dt>
              <dd>
                {blocks} <small aria-hidden="true">/ {level.block_target}</small>
                <span className="sr-only">{say.target(level.block_target, blocksMet)}</span>
              </dd>
            </div>
            <div className={stepsHeld ? 'met held' : stepsMet ? 'met' : ''}>
              <dt>{say.steps}</dt>
              <dd>
                {result.executed_instructions} <small aria-hidden="true">/ {level.instruction_target}</small>
                <span className="sr-only">{say.target(level.instruction_target, stepsMet)}</span>
              </dd>
            </div>
          </>
        )}
        {together && (
          <div className="met">
            <dt>{say.together}</dt>
            <dd>
              {together.tables} <small>{say.within(together.tables, together.gap)}</small>
            </dd>
          </div>
        )}
      </dl>
      {nextStar && <p className="receipt-note">{nextStar}</p>}
      {compareWith !== undefined && onCompare && (
        <p className="receipt-compare">
          <button type="button" aria-haspopup="dialog" onClick={onCompare}>
            <GitCompareArrows size={14} aria-hidden="true" />
            {say.compare(compareWith)}
          </button>
        </p>
      )}
      {waits.length > 0 && (
        <section className="receipt-waits" aria-labelledby="receipt-waits-lead">
          <p id="receipt-waits-lead">{say.waitedMost[waits[0].stage]}</p>
          <dl>
            {waits.map(({ stage, percent }) => (
              <div key={stage}>
                <dt>{say.waits[stage]}</dt>
                <dd>
                  <span className="receipt-wait-bar" style={{ inlineSize: `${percent}%` }} aria-hidden="true" />
                  {percent}%
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {challenges.length > 0 && (
        <section className="receipt-challenges" aria-labelledby="receipt-challenges-lead">
          <p id="receipt-challenges-lead">
            {say.challenges} <small>{say.optional}</small>
          </p>
          <ul>
            {challenges.map((outcome) => (
              <li key={outcome.challenge.measure} className={outcome.met ? 'met' : ''}>
                <span className="receipt-challenge-head">
                  <strong>{outcome.words.name}</strong> <span>{say.verdict(outcome.met, outcome.before)}</span>
                </span>
                <span className="receipt-challenge-goal">
                  {outcome.words.goal(outcome.challenge.target)} {say.thisService(outcome.words.amount(outcome.value))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="receipt-thanks">
        {thanks ? (
          <span lang={english}>{thanks}</span>
        ) : nextShift ? (
          <>
            {say.nextUp} <strong lang={english}>{nextShift}</strong>
          </>
        ) : (
          say.lastOrder
        )}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" onClick={onClose}>
          {say.stay}
        </button>
        {onward && (
          <Button
            onClick={() => {
              onClose();
              onward.onStop();
            }}
          >
            {onward.stop}
          </Button>
        )}
        <Button
          variant="primary"
          data-autofocus
          onClick={() => {
            onClose();
            onNext();
          }}
        >
          {onward ? onward.next : thanks ? say.backToCampaign : nextShift ? say.nextShift : say.closing}
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </Modal>
  );
}

/**
 * The tables that ordered together, and the longest any of them waited from its first drink to its last, in seconds:
 * the receipt of a shift whose guests order together says how close the drinks came.
 */
function servedTogether(events: readonly ReplayEvent[]): { tables: number; gap: number } | undefined {
  const tables = events.filter((event) => event.tickets.some((ticket) => ticket.together));
  if (!tables.length) return undefined;
  const gaps = tables.map(({ timing }) => timing.served - (timing.firstServed ?? timing.served));
  return { tables: tables.length, gap: Math.round(Math.max(...gaps) * 10) / 10 };
}
