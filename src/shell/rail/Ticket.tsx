import { LockKeyhole } from 'lucide-react';
import { pad2, starRow } from '@/shared/lib/format';
import type { Act } from './acts';

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

/**
 * One act printed as a kitchen order ticket. Only the open act unrolls into its full list of shifts;
 * the others hang folded on the rail as stubs to click through to.
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
  // A sealed ticket hasn't been printed yet: only the act number shows, never the crew or the shift names.
  const sealed = state === 'locked';

  return (
    <article className={`ticket ${state} ${current ? 'current' : 'stub'}`} data-act={number}>
      <span className="ticket-clip" aria-hidden="true" />
      <button
        className="ticket-head"
        disabled={sealed}
        aria-current={current ? 'step' : undefined}
        aria-label={
          sealed ? `${act.kicker}, sealed` : `${act.kicker} · ${act.crew}, ${served} of ${shifts.length} served`
        }
        onClick={onOpen}
      >
        <span className="ticket-shop">
          {current && 'Café Niko · '}Order #{pad2(number + 1)}
        </span>
        {sealed ? (
          <strong className="ticket-crew">{act.kicker}</strong>
        ) : (
          <>
            <span className="ticket-kicker">{act.kicker}</span>
            <strong className="ticket-crew">{act.crew}</strong>
            {current && <span className="ticket-tagline">{act.tagline}</span>}
          </>
        )}
        {!current && (
          <span className="ticket-tally" aria-hidden="true">
            {sealed ? (
              <LockKeyhole size={14} strokeWidth={2.4} />
            ) : (
              <>
                {served}/{shifts.length}
                {rated > 0 && <small>★ {earned}</small>}
              </>
            )}
          </span>
        )}
      </button>

      {current && (
        <>
          <ol className="ticket-lines">
            {shifts.map((shift) => {
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
            <small>{state === 'done' ? 'Thank you, come again' : 'Order in progress'}</small>
          </footer>
        </>
      )}
    </article>
  );
}
