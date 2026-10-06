import { ticketUnits } from './tickets';
import { STARTS } from './layout';
import type { ActorId, ActorSnapshot, ExecutionEvent, RunResult } from './types';
import { directionVectors } from './directions';
import { commandDirection } from './commands';
import { reachedName } from './blockPreview';
import { interactionTarget } from './queryMovement';
import { robotUnlocked } from './robots';
import { shiftNumber } from './unlocks';
import { DRINK_SECONDS, STREET_APPROACH_SECONDS, STREET_EXIT_SECONDS } from './street';
import { customerCrowd, isToGo } from './sidewalk';
import { sampleClaimedTickets, samplePickupCounter, waitingCounterTickets } from './counters';

/** Sample immutable execution records; presentation never invents a robot route. */
/** The station a Take, Deposit or Use reaches into, as the action chip names it: "Sugar", "Table 3". */
function withStation(event: ExecutionEvent): { at?: string } {
  const direction = /^(TAKE|PICKUP|DEPOSIT|USE) /.test(event.command) ? commandDirection(event.command) : undefined;
  const name = direction && reachedName(interactionTarget(event.from, direction)!);
  return name ? { at: name.replace(/^the /, '').replace(/^./, (first) => first.toUpperCase()) } : {};
}

/** Blocks that put a hand into a station. */
const REACHING = /^(TAKE|PICKUP|DEPOSIT|USE)( |$)/;
/** Seconds a hand takes to come back from a station once its block is done. */
export const REACH_FOLLOW_THROUGH = 0.35;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * How far out a hand is through a reaching block, from 0 at its side to 1 over the station, by the block's progress.
 * It draws back a little first, is over the station two thirds of the way through and stays there to the end, where
 * the service hands the cup over: so a cup leaves or meets the hand right at the station, never mid-air.
 */
export function reachAt(progress: number): number {
  if (progress <= 0 || progress >= 1) return progress >= 1 ? 1 : 0;
  if (progress < 0.15) return -0.12 * Math.sin((Math.PI * progress) / 0.15);
  return progress < 0.65 ? smooth((progress - 0.15) / 0.5) : 1;
}

/** A hand's reach at `local`: out through a reaching block, then brought back after it, or straight on to the next. */
function reachOf(history: readonly ExecutionEvent[], local: number): number {
  const reaching = history.filter((event) => !event.error && REACHING.test(event.command));
  const current = reaching.at(-1);
  if (!current) return 0;
  const during =
    current.end > local ? reachAt((local - current.start) / Math.max(0.001, current.end - current.start)) : 0;
  const before = current.end > local ? reaching.at(-2) : current;
  const since = before ? local - before.end : Infinity;
  const back = since < REACH_FOLLOW_THROUGH ? (1 + Math.cos((Math.PI * since) / REACH_FOLLOW_THROUGH)) / 2 : 0;
  return Math.abs(back) > Math.abs(during) ? back : during;
}

export function sampleReplay(result: RunResult, time: number) {
  const seed =
    (time < 0
      ? result.execution?.[0]
      : result.execution?.find((s) => time >= s.start && time < s.start + s.duration)) ?? result.execution?.at(-1);
  const local = time - (seed?.start ?? 0),
    level = shiftNumber(result.level_id);
  const actors: Partial<Record<ActorId, ActorSnapshot>> = {};
  if (robotUnlocked('query', level)) actors.query = { position: STARTS.query, inventory: [], role: 'query' };
  actors.prep = { position: STARTS.prep, inventory: [], role: 'prep' };
  actors.floor = { position: STARTS.floor, inventory: [], role: 'floor' };
  if (!robotUnlocked('query', level)) actors.niko = { position: STARTS.query, inventory: [], role: 'query' };
  const logs = [...(seed?.events ?? [])].sort((a, b) => a.start - b.start || a.end - b.end);
  for (const id of ['query', 'prep', 'floor', 'niko'] as const) {
    const history = logs.filter((e) => e.actor === id && e.start <= local);
    if (!history.length) {
      // The approach starts before the interpreter clock; Query is already waiting at the counter.
      const waitingForOrders =
        id === 'query' &&
        actors.query &&
        (/^\s*LISTEN(?:\s*#.*)?$/m.test(result.programs?.query ?? '') ||
          logs.find((e) => e.actor === 'query')?.command === 'LISTEN');
      if (waitingForOrders)
        actors.query!.action = { command: 'LISTEN', progress: 0, start: -STREET_APPROACH_SECONDS, waiting: 'guest' };
      continue;
    }
    const motion = history.filter((e) => e.from[0] !== e.to[0] || e.from[1] !== e.to[1]).at(-1),
      settled = history.filter((e) => e.end <= local && !e.error).at(-1),
      last = history.at(-1)!;
    let position = settled?.to ?? last.from;
    if (motion && motion.end > local) {
      const t = Math.max(0, Math.min(1, (local - motion.start) / (motion.end - motion.start)));
      position = [
        motion.from[0] + (motion.to[0] - motion.from[0]) * t,
        motion.from[1] + (motion.to[1] - motion.from[1]) * t,
      ];
    }
    // Move to a variable walks a route, so its steps face the way they go.
    const routed = (event: (typeof history)[number]) =>
      /^MOVE var/.test(event.command) && (event.from[0] !== event.to[0] || event.from[1] !== event.to[1]);
    const directional = history.findLast(
      (event) =>
        (id === 'query' && event.command === 'LISTEN') ||
        commandDirection(event.command) !== undefined ||
        routed(event),
    );
    const direction = directional && !routed(directional) ? commandDirection(directional.command) : undefined;
    const vector: readonly [number, number] | undefined =
      directional && routed(directional)
        ? [directional.to[0] - directional.from[0], directional.to[1] - directional.from[1]]
        : direction
          ? directionVectors[direction]
          : undefined;
    const facing =
      directional && !vector
        ? -Math.PI / 2
        : vector
          ? Math.atan2(vector[0], vector[1])
          : id === 'query'
            ? -Math.PI / 2
            : 0;
    const reach = reachOf(history, local);
    // Zero-duration wait records describe an idle state until another instruction starts.
    const waiting =
      !last.error &&
      last.start === last.end &&
      (!!last.waiting || last.command === 'LISTEN' || last.command.startsWith('WAIT ')) &&
      local < (seed?.duration ?? Infinity);
    actors[id] = {
      position,
      facing,
      reach,
      action: waiting
        ? { command: last.command, progress: 0, start: last.start, ...(last.waiting && { waiting: last.waiting }) }
        : last.end > local
          ? {
              command: last.command,
              progress: Math.max(0, Math.min(1, (local - last.start) / (last.end - last.start))),
              start: last.start,
              ...withStation(last),
            }
          : undefined,
      variables: settled?.variables,
      loop: settled?.loop,
      walking: !!motion && motion.end > local,
      inventory: settled?.inventory ?? [],
      heldPaper: settled?.heldPaper,
      role: last.role,
      ...((waiting || (last.end > local && /^WAIT( |$)/.test(last.command))) && { waiting: true }),
      ...(last.error && { failed: true }),
    };
  }
  const servedTimes = new Map(
    logs
      .filter((log) => log.action === 'SERVE' && log.ticketId && log.end <= local)
      .map((log) => [log.ticketId!, log.end]),
  );
  const collected = new Set(
    logs.filter((log) => log.action === 'COLLECT' && log.end <= local).map((log) => log.ticketId),
  );
  // Intake is serial: later arrivals line up behind customers still at the counter.
  const intakeEvents = result.events.filter((event) => event.seed_id === seed?.seed_id);
  const globalIndex = new Map(result.events.map((event, index) => [event, index]));
  const crowd = customerCrowd(intakeEvents, (event) => globalIndex.get(event)!);
  const customers = result.events
    .filter(
      (event) =>
        event.seed_id === seed?.seed_id &&
        local >= event.timing.arrival - STREET_APPROACH_SECONDS &&
        local < event.timing.left + STREET_EXIT_SECONDS,
    )
    .map((event) => {
      const timing = event.timing;
      const { position, facing, walking, sit, leaving } = crowd.sample(event, local);
      const toGo = isToGo(event);
      // The order bubble stays with the customer until they head out.
      const showOrder =
        !leaving &&
        (logs.some(
          (log) => log.customerId === event.customer.customer_id && log.role === 'query' && log.start <= local,
        ) ||
          local >= timing.created);
      const drinks = event.tickets
        .flatMap(ticketUnits)
        .filter((ticket) => servedTimes.has(ticket.ticket_id) && !collected.has(ticket.ticket_id));
      const sipping = drinks.find((ticket) => local < servedTimes.get(ticket.ticket_id)! + DRINK_SECONDS);
      // A take-away customer heads out with their cup.
      const takeaway = toGo && leaving && Number.isFinite(timing.served);
      return {
        id: event.customer.customer_id,
        toGo,
        showOrder,
        position,
        seated: sit === 1,
        sit,
        walking,
        facing,
        side: (globalIndex.get(event)! % 2) as 0 | 1,
        drinking: takeaway || (!!sipping && !leaving),
        drink: takeaway ? event.tickets[0].item : sipping?.item,
        sippingId: !leaving ? sipping?.ticket_id : undefined,
        table: event.table,
        drinks,
      };
    });
  const pickup = samplePickupCounter(logs, result.tickets, local);
  // A submitted ticket stays on the shared counter until prep finishes claiming it.
  const claimed = sampleClaimedTickets(logs, local);
  const waitingTickets = waitingCounterTickets(result.events, seed?.seed_id, local, claimed);
  const sippingIds = new Set(customers.map((customer) => customer.sippingId));
  const tableDrinks = result.events
    .filter((event) => event.seed_id === seed?.seed_id)
    .flatMap((event) =>
      event.tickets
        .flatMap(ticketUnits)
        .filter(
          (ticket) =>
            servedTimes.has(ticket.ticket_id) && !collected.has(ticket.ticket_id) && !sippingIds.has(ticket.ticket_id),
        )
        .map((ticket) => ({ id: ticket.ticket_id, item: ticket.item, table: event.table })),
    );
  return {
    actors,
    customers,
    tableDrinks,
    waitingTickets,
    pickup: [...pickup.entries()],
    seed,
    local,
    active: logs.filter((e) => e.start <= local).at(-1),
  };
}
