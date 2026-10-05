import { startsIn } from './live/steps';
import type { ExecutionEvent, ReplayEvent, RunResult } from './types';

/** A moment worth jumping to in a run, on the service clock. */
export interface Moment {
  at: number;
  /** Query taking a guest's order, a worker taking a ticket or a drink, a slip, or any other start of a robot's. */
  kind: 'order' | 'handoff' | 'slip' | 'start';
  /** The round it falls in, counting from 1. */
  round: number;
  /** The robot's record of it. */
  event: ExecutionEvent;
  /** The guest whose order it is; nothing for the closing-time call. */
  guest?: ReplayEvent;
}

/** A worker's Listen that claims a ticket or a drink rather than waiting for one. */
export const isHandoff = (event: ExecutionEvent) =>
  event.role !== 'query' && event.command === 'LISTEN' && !event.waiting && !event.error;

/** Query's Listen that hears the next guest at the counter, or the closing-time call. */
const isOrder = (event: ExecutionEvent) =>
  event.role === 'query' && event.command === 'LISTEN' && !event.waiting && !event.error && !!event.customerId;

/**
 * Everything that happened in a run up to a time, read off its records, in time order: each start of a robot's, a
 * block, a slip or a robot beginning to wait, as stepping counts them, with the orders and handoffs among them told
 * apart. The run's records hold the whole story, so looking back never runs anything again.
 */
export function runMoments(result: RunResult, until: number): Moment[] {
  const moments: Moment[] = [];
  (result.execution ?? []).forEach(({ seed_id, start, events }, i) => {
    for (const event of startsIn(events)) {
      const at = start + event.start;
      if (at > until) continue;
      const kind = event.error ? 'slip' : isOrder(event) ? 'order' : isHandoff(event) ? 'handoff' : 'start';
      const guest =
        kind === 'order'
          ? result.events.find((e) => e.seed_id === seed_id && e.customer.customer_id === event.customerId)
          : undefined;
      moments.push({ at, kind, round: i + 1, event, ...(guest && { guest }) });
    }
  });
  // Robots at the same moment go in the order an order travels.
  const rank = (m: Moment) => ['query', 'niko', 'prep', 'floor'].indexOf(m.event.actor);
  return moments.sort((a, b) => a.at - b.at || rank(a) - rank(b));
}
