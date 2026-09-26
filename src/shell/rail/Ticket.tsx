import { LockKeyhole } from 'lucide-react';
import { pad2, starRow } from '@/shared/lib/format';
import { acts, type Act } from './acts';

export type ActState = 'locked' | 'active' | 'done';

interface TicketProps {
  act: Act;
  number: number;
  state: ActState;
  current: boolean;
  selected: number;
  unlocked: number;
  stars: Record<number, number>;
  titles: string[];
  ordering: number | null;
  onOpen(): void;
  onSelect(index: number): void;
  onStart(index: number): void;
}

/** Line lengths for a sealed act's blanked-out shifts, so the ticket reads as printed but unreadable. */
const REDACTED_WIDTHS = [72, 54, 86, 62, 78, 48, 68, 58];

/**
 * One act printed as a kitchen order ticket, unrolled into its full list of shifts. Acts not yet
 * reached hang at full length with their lines blanked out and an "Opens soon" stamp.
 */
export function Ticket({
  act,
  number,
  state,
  current,
  selected,
  unlocked,
  stars,
  titles,
  ordering,
  onOpen,
  onSelect,
  onStart,
}: TicketProps) {
  const shifts = Array.from({ length: act.to - act.from }, (_, offset) => act.from + offset);
  const served = shifts.filter((shift) => stars[shift] !== undefined).length;
  const earned = shifts.reduce((sum, shift) => sum + (shift < 2 ? 0 : (stars[shift] ?? 0)), 0);
  const rated = shifts.filter((shift) => shift >= 2).length;
  // A sealed ticket shows only the act number, never the crew or the shift names.
  const sealed = state === 'locked';
  const unlockedBy = acts[number - 1]?.kicker;

  return (
    <article className={`ticket ${state} ${current ? 'current' : ''}`} data-act={number}>
      <span className="ticket-clip" aria-hidden="true" />
      <button
        className="ticket-head"
        disabled={sealed}
        aria-current={current ? 'step' : undefined}
        aria-label={
          sealed
            ? `${act.kicker}, locked until ${unlockedBy} is served`
            : `${act.kicker} · ${act.crew}, ${served} of ${shifts.length} served`
        }
        onClick={onOpen}
      >
        <span className="ticket-shop">
          {current && 'Café Niko · '}Order #{pad2(number + 1)}
        </span>
        <span className="ticket-kicker">{act.kicker}</span>
        <strong className="ticket-crew">
          {sealed ? <span className="ticket-redacted" style={{ width: '4.5em' }} aria-hidden="true" /> : act.crew}
        </strong>
        <span className="ticket-tagline">{sealed ? `Unlocks after ${unlockedBy}.` : act.tagline}</span>
      </button>

      {sealed && (
        <span className="ticket-stamp" aria-hidden="true">
          <LockKeyhole size={16} strokeWidth={2.6} />
          Opens soon
        </span>
      )}
      <ol className="ticket-lines" aria-hidden={sealed || undefined}>
        {shifts.map((shift, offset) => {
          // A sealed act keeps one blanked-out line per shift, so the ticket hangs as long as it will once open.
          if (sealed)
            return (
              <li key={shift}>
                <div className="shift-card redacted">
                  <span className="shift-no">{pad2(shift + 1)}</span>
                  <span
                    className="ticket-redacted"
                    style={{ width: `${REDACTED_WIDTHS[offset % REDACTED_WIDTHS.length]}%` }}
                  />
                </div>
              </li>
            );
          const locked = shift > unlocked;
          const done = stars[shift] !== undefined;
          const classes = [
            'shift-card',
            locked && 'locked',
            done && 'complete',
            !locked && !done && shift === unlocked && 'next',
            selected === shift && 'selected',
            ordering === shift && 'ordering',
          ];
          return (
            <li key={shift}>
              <button
                disabled={locked}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => onSelect(shift)}
                onDoubleClick={() => onStart(shift)}
                aria-label={`Shift ${shift + 1}: ${titles[shift]}${locked ? ', locked' : ''}`}
                aria-pressed={!locked && selected === shift}
                title={titles[shift]}
              >
                <span className="shift-no">{pad2(shift + 1)}</span>
                <span className="shift-name">{titles[shift]}</span>
                <span className="shift-leader" aria-hidden="true" />
                <span className="shift-mark" aria-hidden="true">
                  {locked ? (
                    <LockKeyhole size={12} strokeWidth={2.4} />
                  ) : !done ? (
                    shift === unlocked ? (
                      'NEXT'
                    ) : (
                      '···'
                    )
                  ) : shift < 2 ? (
                    'OK'
                  ) : (
                    starRow(stars[shift])
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <footer className="ticket-foot" aria-hidden="true">
        <p>
          <span>Served</span>
          <span>
            {served}/{shifts.length}
          </span>
        </p>
        {rated > 0 && (
          <p>
            <span>Stars</span>
            <span>
              {earned}/{rated * 3}
            </span>
          </p>
        )}
        <span className="ticket-barcode" />
        <small>{sealed ? 'Order on hold' : state === 'done' ? 'Thank you, come again' : 'Order in progress'}</small>
      </footer>
    </article>
  );
}
