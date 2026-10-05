import type { ActorId, ExecutionEvent, SeedExecution } from '../types';

/** The order simultaneous starts are told in: the way an order travels through the café. */
const CREW_ORDER: readonly ActorId[] = ['query', 'niko', 'prep', 'floor'];

/** A zero-length record of a robot waiting: it goes on being written, unchanged, for as long as the wait lasts. */
export const isWaitRecord = (event: ExecutionEvent) =>
  event.start === event.end &&
  !event.error &&
  (!!event.waiting || event.command === 'LISTEN' || event.command.startsWith('WAIT '));

const sameBlock = (a: ExecutionEvent, b: ExecutionEvent) => a.line === b.line && a.command === b.command;
const sameWait = (a: ExecutionEvent, b: ExecutionEvent) =>
  isWaitRecord(a) && isWaitRecord(b) && sameBlock(a, b) && a.waiting === b.waiting;

/**
 * Whether a record starts something, given the same robot's record before it: a block, a slip, or a robot beginning
 * to wait. The rest carry on what already started: a wait recorded again as the clock moves, the later tiles of one
 * Move, a Move arriving, an Else passed over.
 */
function starts(event: ExecutionEvent, before: ExecutionEvent | undefined) {
  if (event.error) return true;
  if (isWaitRecord(event)) return !before || !sameWait(before, event);
  return event.start < event.end && (event.completed ?? 1) <= 1;
}

/** The records in a round's log that start something. */
export function startsIn(events: readonly ExecutionEvent[]): ExecutionEvent[] {
  const previous = new Map<ActorId, ExecutionEvent>();
  return events.filter((event) => {
    const before = previous.get(event.actor);
    previous.set(event.actor, event);
    return starts(event, before);
  });
}

/** Something a robot started, on the service clock. */
export interface Start {
  event: ExecutionEvent;
  /** When it started, on the service clock. */
  at: number;
  /** It ends a wait at the block the robot was already waiting at, as a claimed ticket does, rather than arriving. */
  resumed: boolean;
}

/**
 * Reads a growing run log as it is written, and hands over each start once it is due: what started after the last
 * call, up to the time given, in time and then crew order. A round's records are written in time order, some ahead of
 * the clock, and never change once written, so each is read once.
 */
export function startTracker() {
  const previous = new Map<ActorId, ExecutionEvent>();
  let round = 0,
    next = 0;
  return (execution: readonly SeedExecution[], until: number): Start[] => {
    const due: Start[] = [];
    while (round < execution.length) {
      const { events, start } = execution[round];
      for (; next < events.length && start + events[next].start <= until; next++) {
        const event = events[next],
          before = previous.get(event.actor);
        previous.set(event.actor, event);
        if (starts(event, before))
          due.push({
            event,
            at: start + event.start,
            resumed:
              !event.error && !!before && isWaitRecord(before) && !isWaitRecord(event) && sameBlock(before, event),
          });
      }
      // A round is read to its end only once the next has begun: until then, more of it may yet be written.
      if (next < events.length || round === execution.length - 1) break;
      round++;
      next = 0;
      previous.clear();
    }
    return due.sort((a, b) => a.at - b.at || CREW_ORDER.indexOf(a.event.actor) - CREW_ORDER.indexOf(b.event.actor));
  };
}
