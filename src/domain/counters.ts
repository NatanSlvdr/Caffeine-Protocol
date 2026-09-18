import { ticketUnits } from './tickets';
import type { ExecutionEvent, OrderTicket, ReplayEvent } from './types';

/** Latest brewed-drink pickup contents per ticket id. */
export function samplePickupCounter(
  logs: ExecutionEvent[],
  tickets: OrderTicket[],
  local: number,
): Map<string, string> {
  const pickup = new Map<string, string>();
  for (const e of logs.filter((e) => e.end <= local)) {
    if (e.role === 'prep' && e.command.startsWith('DEPOSIT') && e.ticketId)
      pickup.set(e.ticketId, tickets.flatMap(ticketUnits).find((t) => t.ticket_id === e.ticketId)?.item ?? 'coffee');
    if (e.role === 'floor' && (e.command.startsWith('PICKUP') || e.command.startsWith('TAKE ')) && e.ticketId)
      pickup.delete(e.ticketId);
  }
  return pickup;
}

/** Ticket units already claimed from the shared counter. */
export function sampleClaimedTickets(logs: ExecutionEvent[], local: number): Set<string | undefined> {
  return new Set(logs.filter((e) => e.command === 'WAIT TICKET' && e.end <= local).map((e) => e.ticketId));
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
