import { useId, useState } from 'react';
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
  ShoppingBag,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROBOT_DISPLAY_NAMES, variableLabels } from '@/domain';
import type { FailureCode } from '@/domain';
import { comparisonOf } from './evidence';
import type { Aspect, RunEvidence } from './evidence';
import { failureHint } from './reactions';

const ASPECT_ICONS: Record<Aspect, LucideIcon> = {
  drink: Coffee,
  tickets: Receipt,
  sugar: Candy,
  'to-go': ShoppingBag,
  rush: Zap,
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

export interface FailureCardProps {
  evidence: RunEvidence;
  /** The routines changed since this run: the card is a record now, not a description of the code. */
  stale: boolean;
  /** How many rounds of guests the shift sends, so a one-round shift doesn't number its only round. */
  rounds: number;
  /** Open the robot that stopped and put focus on the block or line where it did. */
  onShowLine: () => void;
}

/**
 * The last failed run, kept beside the code: where it stopped, why, what was wanted against what happened, and what
 * to try next. It stays while the player fixes, dimmed once the routines change, and goes when the next run starts.
 */
export function FailureCard({ evidence, stale, rounds, onShowLine }: FailureCardProps) {
  const [open, setOpen] = useState(true);
  const heading = useId(),
    body = useId();
  const { failure, round, guest } = evidence;
  const robot = ROBOT_DISPLAY_NAMES[failure.role ?? 'query'],
    routine = ROUTINE_CODES.has(failure.code),
    comparison = comparisonOf(failure);
  const title = failure.code === 'compile' ? `${robot}’s routine won’t run` : `${robot} stopped`;
  const when = routine
    ? undefined
    : [rounds > 1 && `Round ${round}`, guest ? `Guest ${guest}` : 'Closing time'].filter(Boolean).join(' · ');
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
          <p className="failure-card-stale">From your last run. The routine has changed since: run again to check.</p>
        )}
        {!routine && guest && failure.phrase && <blockquote>“{failure.phrase}”</blockquote>}
        <p className="failure-card-reason">{variableLabels(failure.reason)}</p>
        {comparison && (
          <table className="failure-compare">
            <caption className="sr-only">
              What was wanted, against what happened{comparison.ticket ? `, on ticket ${comparison.ticket}` : ''}
            </caption>
            <thead>
              <tr>
                <td>{comparison.ticket && <span>Ticket {comparison.ticket}</span>}</td>
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
        <p className="failure-card-next">
          <strong>Try</strong> {failureHint(failure.code)}
        </p>
        {!stale && failure.error_line >= 0 && (
          <button type="button" className="failure-card-show" onClick={onShowLine}>
            <Crosshair size={14} aria-hidden="true" />
            Show where {robot} stopped
          </button>
        )}
      </div>
    </section>
  );
}
