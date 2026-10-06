import { ticketUnits } from './tickets';
import type { ExecutionEvent, OrderTicket, ReplayEvent } from './types';

/** A drink waiting at pickup: take-away ones are in a lidded paper cup. */
export interface PickupDrink {
  item: string;
  toGo: boolean;
}

/** Latest brewed-drink pickup contents per ticket id. */
export function samplePickupCounter(
  logs: ExecutionEvent[],
  tickets: OrderTicket[],
  local: number,
): Map<string, PickupDrink> {
  const pickup = new Map<string, PickupDrink>();
  for (const e of logs.filter((e) => e.end <= local)) {
    if (e.role === 'prep' && e.action === 'DEPOSIT' && e.ticketId) {
      const ticket = tickets.flatMap(ticketUnits).find((t) => t.ticket_id === e.ticketId);
      pickup.set(e.ticketId, { item: ticket?.item ?? 'coffee', toGo: !!ticket?.to_go });
    }
    if (e.role === 'floor' && e.action === 'PICKUP' && e.ticketId) pickup.delete(e.ticketId);
  }
  return pickup;
}

/** A drink set down at pickup and not yet served, and how long it keeps warm for. */
export interface WarmDrink {
  ticketId: string;
  item: string;
  /** The table it goes to; 0 for the to-go shelf. */
  table: number;
  /** On Porter's tray rather than at pickup. */
  carried: boolean;
  /** Seconds left before it goes cold. */
  left: number;
}

/**
 * The drinks keeping warm at `local` on a shift where a drink goes cold `seconds` after Brew sets it down at pickup:
 * those at pickup and on Porter's tray, the coldest first.
 */
export function warmDrinks(
  logs: ExecutionEvent[],
  tickets: OrderTicket[],
  local: number,
  seconds: number,
): WarmDrink[] {
  const warm = new Map<string, WarmDrink>();
  for (const e of logs.filter((e) => e.end <= local && e.ticketId)) {
    const id = e.ticketId!;
    if (e.role === 'prep' && e.action === 'DEPOSIT') {
      const ticket = tickets.flatMap(ticketUnits).find((t) => t.ticket_id === id);
      warm.set(id, {
        ticketId: id,
        item: ticket?.item ?? 'coffee',
        table: ticket?.to_go || !ticket?.table_id ? 0 : Number(ticket.table_id.slice(1)),
        carried: false,
        left: e.end + seconds - local,
      });
    }
    const drink = warm.get(id);
    if (drink && e.role === 'floor' && e.action === 'PICKUP') drink.carried = true;
    if (e.role === 'floor' && (e.action === 'SERVE' || e.action === 'HAND OVER')) warm.delete(id);
  }
  return [...warm.values()].sort((a, b) => a.left - b.left);
}

/** Ticket units already claimed from the shared counter. */
export function sampleClaimedTickets(logs: ExecutionEvent[], local: number): Set<string | undefined> {
  return new Set(
    logs.filter((e) => e.role === 'prep' && e.command === 'LISTEN' && e.end <= local).map((e) => e.ticketId),
  );
}

/** Submitted tickets still awaiting a kitchen claim, with remaining unit counts. */
export function waitingCounterTickets(
  events: ReplayEvent[],
  seedId: string | undefined,
  local: number,
  claimed: Set<string | undefined>,
): OrderTicket[] {
  return events
    .filter((e) => e.seed_id === seedId && e.passed)
    .flatMap((e) => e.tickets)
    .filter((t) => t.created_at <= local)
    .flatMap((ticket) => {
      const remaining = ticketUnits(ticket).filter((unit) => !claimed.has(unit.ticket_id)).length;
      return remaining ? [{ ...ticket, quantity: remaining }] : [];
    });
}
