import type { OrderTicket } from './types';
import { TICKET_UNIT_SEPARATOR } from './constants';

/** Kitchen jobs are individual cups; the submitted paper retains its quantity. */
export function ticketUnits(ticket: OrderTicket): OrderTicket[] {
  const quantity = ticket.quantity ?? 1;
  return Array.from({length:quantity}, (_, index) => ({...ticket, quantity:1, ticket_id:quantity === 1 ? ticket.ticket_id : `${ticket.ticket_id}${TICKET_UNIT_SEPARATOR}${index + 1}`}));
}
export function belongsToPaper(unitId: string, paper: OrderTicket) {
  return unitId === paper.ticket_id || unitId.startsWith(paper.ticket_id + TICKET_UNIT_SEPARATOR);
}
