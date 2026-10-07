import { useState } from 'react';
import { Route, X } from 'lucide-react';
import type { Leg, ReplayEvent } from '@/domain';
import { legWords } from './route';
import { useWords } from '@/shared/language';
import { PAUSE_WORDS } from './pauseWords';

export interface OrderRouteProps {
  /** The guest, as the café knows them: "Guest 3", or a regular by name. */
  name: string;
  guest: ReplayEvent;
  /** The order's way so far. */
  route: readonly Leg[];
  /** It has gone all the way, or slipped: nothing more is coming. */
  done: boolean;
  /** Which round the guest came in, counting from 1, and when it began, to time each leg from the round's start. */
  round: number;
  rounds: number;
  start: number;
  /** The moment on screen, to mark the leg the order is on. */
  time: number;
  level: number;
  /** Look at a leg as it began, while the run can be looked back through, and at the routine of whoever did it. */
  onView?: (at: number, leg: Leg) => void;
  onStop: () => void;
}

/**
 * One guest's order followed through the café, as a card over its corner: each leg of its way so far, who did it and
 * when, from walking in to the cup going back to be washed. The leg on screen is marked, and while the run is paused
 * or has slipped, each leg is a way back to it.
 */
export function OrderRoute({
  name,
  guest,
  route,
  done,
  round,
  rounds,
  start,
  time,
  level,
  onView,
  onStop,
}: OrderRouteProps) {
  const [said, setSaid] = useState('');
  const pauseWords = useWords(PAUSE_WORDS);
  const current = route.findLastIndex((leg) => leg.at <= time + 1e-3);
  const when = (leg: Leg) => pauseWords.when(1, round, leg.at - start);
  return (
    <section className="order-route" aria-label={`Following ${name}’s order`}>
      <header>
        <Route size={14} aria-hidden="true" />
        <h3>
          Following {name}
          {rounds > 1 && <span> · Round {round}</span>}
        </h3>
        <button
          type="button"
          className="order-route-stop"
          aria-label="Stop following"
          title="Stop following"
          onClick={onStop}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <p className="order-route-phrase">“{guest.customer.phrase}”</p>
      {route.length === 0 ? (
        <p className="order-route-wait">Not in the café yet.</p>
      ) : (
        <ol>
          {route.map((leg, i) => {
            const words = legWords(leg, guest, level);
            const state = i === current ? 'current' : i < current ? 'past' : 'later';
            const body = (
              <>
                <span className="order-route-time">{when(leg)}</span>
                <span className="order-route-words">{words}</span>
              </>
            );
            return (
              <li
                key={`${leg.stage}-${leg.unit ?? ''}-${leg.at}`}
                className={`${state}${leg.stage === 'slip' ? ' slip' : ''}`}
                aria-current={i === current ? 'step' : undefined}
              >
                {onView ? (
                  <button
                    type="button"
                    onClick={() => {
                      onView(leg.at + 1e-4, leg);
                      setSaid(`${when(leg)}. ${words}.`);
                    }}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </li>
            );
          })}
          {!done && (
            <li className="order-route-more">
              <span className="order-route-words">On its way…</span>
            </li>
          )}
        </ol>
      )}
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </section>
  );
}
