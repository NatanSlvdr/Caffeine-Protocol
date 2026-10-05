import type { ActorId, ExecutionEvent, SeedExecution } from '../types';

/** The order simultaneous starts are told in: the way an order travels through the café. */
const CREW_ORDER: readonly ActorId[] = ['query', 'niko', 'prep', 'floor'];

/** A zero-length record of a robot waiting: it goes on being written, unchanged, for as long as the wait lasts. */
export const isWaitRecord = (event: ExecutionEvent) =>
  event.start === event.end &&
  !event.error &&
  (!!event.waiting || event.command === 'LISTEN' || event.command.startsWith('WAIT '));

const sameWait = (a: ExecutionEvent, b: ExecutionEvent) =>
  isWaitRecord(a) && isWaitRecord(b) && a.line === b.line && a.command === b.command && a.waiting === b.waiting;

/**
 * The records in a round's log that start something: a block, a slip, or a robot beginning to wait. The rest carry on
 * what already started: a wait recorded again as the clock moves, the later tiles of one Move, a Move arriving, an
 * Else passed over.
 */
export function startsIn(events: readonly ExecutionEvent[]): ExecutionEvent[] {
  const previous = new Map<ActorId, ExecutionEvent>(),
    starts: ExecutionEvent[] = [];
  for (const event of events) {
    const before = previous.get(event.actor);
    previous.set(event.actor, event);
    const start = event.error
      ? true
      : isWaitRecord(event)
        ? !before || !sameWait(before, event)
        : event.start < event.end && (event.completed ?? 1) <= 1;
    if (start) starts.push(event);
  }
  return starts;
}

/** What started after one moment of the service and by another, both on the service clock: in time, then crew order. */
export function startsBetween(execution: readonly SeedExecution[], after: number, until: number): ExecutionEvent[] {
  return execution
    .filter((round) => round.start <= until && round.start + round.duration > after)
    .flatMap((round) =>
      startsIn(round.events)
        .map((event) => ({ event, at: round.start + event.start }))
        .filter(({ at }) => at > after && at <= until),
    )
    .sort((a, b) => a.at - b.at || CREW_ORDER.indexOf(a.event.actor) - CREW_ORDER.indexOf(b.event.actor))
    .map(({ event }) => event);
}
