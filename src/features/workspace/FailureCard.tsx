import { Fragment, useId, useState } from 'react';
import {
  Armchair,
  Candy,
  ChevronDown,
  Coffee,
  Compass,
  CupSoda,
  Crosshair,
  History,
  Receipt,
  RotateCcw,
  Route,
  ShoppingBag,
  TriangleAlert,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROBOT_DISPLAY_NAMES, variableLabels } from '@/domain';
import type { FailureCode } from '@/domain';
import { useUntranslated, useWords } from '@/shared/language';
import { comparisonOf } from './evidence';
import type { Aspect, RunEvidence } from './evidence';
import { failureHint } from './reactions';
import { easedWords } from './bench';
import { FAILURE_WORDS } from './failureWords';
import { BENCH_WORDS } from './modals/benchWords';

const ASPECT_ICONS: Record<Aspect, LucideIcon> = {
  drink: Coffee,
  tickets: Receipt,
  sugar: Candy,
  'to-go': ShoppingBag,
  rush: Zap,
  together: Users,
  lid: CupSoda,
  table: Armchair,
  facing: Compass,
};

/** Failures in the routine itself, before any guest is involved: what the guest said has nothing to do with them. */
const ROUTINE_CODES: ReadonlySet<FailureCode> = new Set([
  'compile',
  'unsupported',
  'loop-limit',
  'jump-across-block',
  'return-outside-call',
  'recursive-call',
]);

/** Enough IFs to see the choice that led to the slip, without the card outgrowing the routine beside it. */
const DECISIONS_SHOWN = 4;

export interface FailureCardProps {
  evidence: RunEvidence;
  /** The routines changed since this run: the card is a record now, not a description of the code. */
  stale: boolean;
  /** How many rounds of guests the shift sends, so a one-round shift doesn't number its only round. */
  rounds: number;
  /** Open the robot that stopped and put focus on the block or line where it did. */
  onShowLine: () => void;
  /** Play just the round that failed again, with the routines as they are now. */
  onPractise: () => void;
  /** Set the routine against the last one that served this shift, to go back to it; only when they differ. */
  onCompareServed?: () => void;
  /** Follow the guest's order through the run that failed; only while that run is still on screen. */
  onFollow?: () => void;
}

/**
 * The last failed run, kept beside the code: where it stopped, why, what was wanted against what happened, and what
 * to try next. It stays while the player fixes, dimmed once the routines change, and goes when the next run starts.
 */
export function FailureCard({
  evidence,
  stale,
  rounds,
  onShowLine,
  onPractise,
  onCompareServed,
  onFollow,
}: FailureCardProps) {
  const [open, setOpen] = useState(true);
  const words = useWords(FAILURE_WORDS),
    benchWords = useWords(BENCH_WORDS),
    english = useUntranslated();
  const heading = useId(),
    body = useId(),
    decisionsHeading = useId();
  const { failure, round, guest, name, bench } = evidence;
  const robot = ROBOT_DISPLAY_NAMES[failure.role ?? 'query'],
    routine = ROUTINE_CODES.has(failure.code),
    comparison = comparisonOf(failure, words.compare),
    called = name ?? (guest && words.guest(guest));
  const title = words.title(robot, failure.code === 'compile');
  const when = routine
    ? undefined
    : [
        bench ? words.bench : evidence.practice && words.practice,
        !bench && rounds > 1 && words.round(round),
        called || words.closing,
      ]
        .filter(Boolean)
        .join(' · ');
  // One round of several, or the bench, can be played on its own to check a fix; a routine that won't run has no
  // round to play.
  const practisable = (rounds > 1 || bench) && !routine;
  const showable = !stale && failure.error_line >= 0;
  const followable = !routine && guest && onFollow;
  // Query's choices for the guest, when Query is the one who stopped: the latest few, which led to the slip.
  const decisions = routine || (failure.role ?? 'query') !== 'query' ? [] : evidence.decisions.slice(-DECISIONS_SHOWN);
  const earlier = evidence.decisions.length - decisions.length;
  return (
    <section className={'failure-card' + (stale ? ' stale' : '')} aria-labelledby={heading}>
      <header>
        <button type="button" aria-expanded={open} aria-controls={body} onClick={() => setOpen((o) => !o)}>
          {stale ? <History size={15} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />}
          <span id={heading} className="failure-card-title">
            {title}
            {when && <span className="failure-card-when"> · {when}</span>}
          </span>
          <ChevronDown size={15} className="failure-card-chevron" aria-hidden="true" />
        </button>
      </header>
      <div id={body} className="failure-card-body" hidden={!open}>
        {stale && (
          <p className="failure-card-stale">
            {words.stale} {words.recheck(bench ? 'bench' : practisable ? 'round' : 'run')}
          </p>
        )}
        {!routine && guest && failure.phrase && <blockquote lang={english}>“{failure.phrase}”</blockquote>}
        <p className="failure-card-reason" lang={english}>
          {variableLabels(failure.reason)}
        </p>
        {evidence.eased && <p className="failure-card-eased">{words.eased(easedWords(evidence.eased, benchWords))}</p>}
        {comparison && (
          <table className="failure-compare">
            <caption className="sr-only">{words.caption(comparison.ticket)}</caption>
            <thead>
              <tr>
                <td>{comparison.ticket && <span>{words.ticket(comparison.ticket)}</span>}</td>
                <th scope="col">{comparison.columns[0]}</th>
                <th scope="col">{comparison.columns[1]}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row) => {
                const Icon = ASPECT_ICONS[row.aspect];
                return (
                  <tr key={row.label}>
                    <th scope="row">
                      <Icon size={14} aria-hidden="true" />
                      {row.label}
                    </th>
                    <td>{row.wanted}</td>
                    <td className="failure-compare-got">{row.got}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {decisions.length > 0 && (
          <section className="failure-decisions" aria-labelledby={decisionsHeading}>
            <h3 id={decisionsHeading}>
              {words.decided(ROBOT_DISPLAY_NAMES.query)}
              {earlier > 0 && <span>{words.last(decisions.length)}</span>}
            </h3>
            <ol>
              {decisions.map((decision, i) => (
                <li key={i}>
                  <span className="failure-decision-block">{words.block(decision.line + 1)}</span>
                  <span className="failure-decision-if">
                    <span lang={english}>{decision.condition}</span>
                    {words.asked}{' '}
                    <strong className={decision.holds ? 'yes' : 'no'}>{words.holds(decision.holds)}</strong>
                  </span>
                  {decision.parts.length > 0 && (
                    <span className="failure-decision-parts">
                      {decision.parts.map((part, j) => (
                        <Fragment key={j}>
                          {j > 0 && ' · '}
                          <span lang={english}>{part.text}</span>
                          {words.part(part.holds)}
                        </Fragment>
                      ))}
                    </span>
                  )}
                  <span className="failure-decision-heard">
                    {words.heard} <span lang={english}>{decision.heard.join('; ')}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="failure-card-next">
          <strong>{words.try}</strong> {failureHint(failure.code, words.hints)}
        </p>
        {(showable || practisable || onCompareServed || followable) && (
          <div className="failure-card-actions">
            {showable && (
              <button type="button" className="failure-card-show" onClick={onShowLine}>
                <Crosshair size={14} aria-hidden="true" />
                {words.show(robot)}
              </button>
            )}
            {followable && (
              <button type="button" className="failure-card-show" onClick={onFollow}>
                <Route size={14} aria-hidden="true" />
                {words.follow(called || '')}
              </button>
            )}
            {practisable && (
              <button type="button" className="failure-card-show" onClick={onPractise}>
                <RotateCcw size={14} aria-hidden="true" />
                {bench ? words.again : words.practise(round)}
              </button>
            )}
            {onCompareServed && (
              <button type="button" className="failure-card-show" aria-haspopup="dialog" onClick={onCompareServed}>
                <History size={14} aria-hidden="true" />
                {words.compareServed}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
