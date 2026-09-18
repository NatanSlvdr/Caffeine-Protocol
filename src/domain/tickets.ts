import type { Customer, OrderTicket, SpeechIntent } from './types';
import { TICKET_DUE_SECONDS, TICKET_UNIT_SEPARATOR } from './constants';

/** Kitchen jobs are individual cups; the submitted paper retains its quantity. */
export function ticketUnits(ticket: OrderTicket): OrderTicket[] {
  const quantity = ticket.quantity ?? 1;
  return Array.from({ length: quantity }, (_, index) => ({
    ...ticket,
    quantity: 1,
    ticket_id: quantity === 1 ? ticket.ticket_id : `${ticket.ticket_id}${TICKET_UNIT_SEPARATOR}${index + 1}`,
  }));
}
export function belongsToPaper(unitId: string, paper: OrderTicket) {
  return unitId === paper.ticket_id || unitId.startsWith(paper.ticket_id + TICKET_UNIT_SEPARATOR);
}

/** Fresh paper inherits the arrival clock; the item is written by later instructions. */
export function createTicket(customer: Customer, id: string, intent: SpeechIntent = {}): OrderTicket {
  return {
    ticket_id: id,
    customer_id: customer.customer_id,
    table_id: null,
    source_phrase: customer.phrase,
    source_intent: structuredClone(intent),
    item: '',
    with_sugar: false,
    sugar_count: null,
    status: 'created',
    created_at: customer.arrival,
    due_at: customer.arrival + TICKET_DUE_SECONDS,
    debug_notes: '',
  };
}

/** Effective sugar amount for a submitted ticket: explicit count, else the binary modifier. */
export function ticketSugar(ticket: Pick<OrderTicket, 'sugar_count' | 'with_sugar'>): number {
  return ticket.sugar_count ?? (ticket.with_sugar ? 1 : 0);
}
