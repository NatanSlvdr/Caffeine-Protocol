import { ArrowRight, GitCompareArrows } from 'lucide-react';
import { Modal } from '@/components';
import { Button } from '@/shared/ui/Button';
import { count, type ChallengeMeasure, type LevelDefinition, type ReplayEvent, type RunResult } from '@/domain';
import { starRow } from '@/shared/lib/format';
import { guestWaits, WAIT_LABELS, WAIT_LEADS } from '../waits';
import { challengeOutcomes, type ChallengeOutcome } from '../challenges';

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
  onNext: () => void;
  onClose: () => void;
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
  onNext,
  onClose,
}: ReceiptModalProps) {
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
      ? `Steps are on target too, but stars climb in order: trim ${count(blocks - level.block_target, 'block')} first.`
      : !blocksMet
        ? `One more star: use ${count(blocks - level.block_target, 'fewer block')}, ${level.block_target} or fewer.`
        : !stepsMet
          ? `One more star: run ${count(result.executed_instructions - level.instruction_target, 'fewer step')}, ${level.instruction_target} or fewer.`
          : '';
  // A replay says whether it beat the shift's best, so going back for stars has a point.
  const replay =
    observation || best === undefined
      ? ''
      : result.stars > best
        ? `New best, up from ${count(best, 'star')}!`
        : result.stars < best
          ? `Your best stays at ${count(best, 'star')}.`
          : '';
  // Where the guests' time went, so a slow service says which part to look at. The opening day was served by hand.
  const waits = observation ? [] : guestWaits(result.events ?? []);
  // The challenges come to light with the first pass, and every service after says how it measured up.
  const challenges = observation ? [] : challengeOutcomes(level.challenges ?? [], result, metBefore);
  const together = level.service?.together === undefined ? undefined : servedTogether(result.events);
  return (
    <Modal
      title="Service complete"
      kicker={`${label} · Service receipt`}
      onClose={onClose}
      className="settings-window confirm-slip receipt-slip"
    >
      <p className="receipt-lead">
        {/* The watch-only shift is the opening day, before any robot: the café's people serve it by hand. */}
        {observation ? 'Niko, Moka and Pip served every order by hand.' : 'Every order, taken care of.'}
      </p>
      {!observation && (
        <p className="receipt-stars" role="img" aria-label={`${result.stars} of 3 stars`}>
          {starRow(result.stars)}
        </p>
      )}
      {replay && <p className="receipt-best">{replay}</p>}
      <dl className="receipt-totals">
        <div>
          <dt>Guests served</dt>
          <dd>{guests}</dd>
        </div>
        {!observation && (
          <>
            <div className={blocksMet ? 'met' : ''}>
              <dt>Blocks used</dt>
              <dd>
                {blocks} <small aria-hidden="true">/ {level.block_target}</small>
                <TargetMet target={level.block_target} met={blocksMet} />
              </dd>
            </div>
            <div className={stepsHeld ? 'met held' : stepsMet ? 'met' : ''}>
              <dt>Steps run</dt>
              <dd>
                {result.executed_instructions} <small aria-hidden="true">/ {level.instruction_target}</small>
                <TargetMet target={level.instruction_target} met={stepsMet} />
              </dd>
            </div>
          </>
        )}
        {together && (
          <div className="met">
            <dt>Tables served together</dt>
            <dd>
              {together.tables}{' '}
              <small>
                · {together.tables === 1 ? 'within' : 'all within'} {together.gap} s
              </small>
            </dd>
          </div>
        )}
      </dl>
      {nextStar && <p className="receipt-note">{nextStar}</p>}
      {compareWith !== undefined && onCompare && (
        <p className="receipt-compare">
          <button type="button" aria-haspopup="dialog" onClick={onCompare}>
            <GitCompareArrows size={14} aria-hidden="true" />
            Compare with run {compareWith}
          </button>
        </p>
      )}
      {waits.length > 0 && (
        <section className="receipt-waits" aria-labelledby="receipt-waits-lead">
          <p id="receipt-waits-lead">{WAIT_LEADS[waits[0].stage]}</p>
          <dl>
            {waits.map(({ stage, percent }) => (
              <div key={stage}>
                <dt>{WAIT_LABELS[stage]}</dt>
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
            Challenges <small>· optional, for no stars</small>
          </p>
          <ul>
            {challenges.map((outcome) => (
              <li key={outcome.challenge.measure} className={outcome.met ? 'met' : ''}>
                <span className="receipt-challenge-head">
                  <strong>{outcome.words.name}</strong> <span>{challengeVerdict(outcome)}</span>
                </span>
                <span className="receipt-challenge-goal">
                  {outcome.words.goal(outcome.challenge.target)} This service: {outcome.words.amount(outcome.value)}.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="receipt-thanks">
        {thanks ? (
          thanks
        ) : nextShift ? (
          <>
            Thank you. Next up: <strong>{nextShift}</strong>
          </>
        ) : (
          'Last order of the day.'
        )}
      </p>
      <div className="modal-buttons">
        <button className="settings-chip" onClick={onClose}>
          Stay on this shift
        </button>
        <Button
          variant="primary"
          data-autofocus
          onClick={() => {
            onClose();
            onNext();
          }}
        >
          {thanks ? 'Back to the campaign' : nextShift ? 'Next shift' : 'Closing time'}
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

/** Whether this service met a challenge, and whether that's news. */
function challengeVerdict({ met, before }: ChallengeOutcome): string {
  if (met) return before ? 'Met' : 'Met, for the first time';
  return before ? 'Not this time · met before' : 'Not yet';
}

/** The "/ 4" and the ✓ are drawn for the eye, so screen readers hear the target and the verdict here instead. */
function TargetMet({ target, met }: { target: number; met: boolean }) {
  return <span className="sr-only">{`, star target ${target}, ${met ? 'met' : 'missed'}`}</span>;
}
