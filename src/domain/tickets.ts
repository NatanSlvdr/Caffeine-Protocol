import type { Customer, ExpectedTicket, OrderTicket, SpeechIntent } from './types';
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

/** Why a ticket written at closing time is wrong. */
export const CLOSING_TICKET_ERROR = 'It’s closing time: there’s nobody left to write a ticket for.';

/** At closing time Query hears one last call, after the last guest: it must stop without writing a ticket. */
export function closingCall(arrival: number): Customer {
  return {
    customer_id: 'CLOSING',
    arrival,
    phrase: 'Closing time!',
    heard_orders: [{ tokens: ['closed'] }],
    intent: {},
    expected: { closing: true },
  };
}

/** A customer who takes their order away: they wait by the to-go shelf instead of taking a table. */
export function customerToGo(customer: Customer): boolean {
  return !!(customer.expected.to_go || customer.expected.tickets?.some((ticket) => ticket.to_go));
}

/** Effective sugar amount for a submitted ticket: explicit count, else the binary modifier. */
export function ticketSugar(ticket: Pick<OrderTicket, 'sugar_count' | 'with_sugar'>): number {
  return ticket.sugar_count ?? (ticket.with_sugar ? 1 : 0);
}

/** "1 sugar", "2 sugars". */
export const count = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;

/** What's wrong with ticket `index` against what the guest asked for, in words Niko can read out; empty when it matches. */
export function ticketMismatch(index: number, e: ExpectedTicket, a: OrderTicket): string {
  const n = index + 1;
  if (e.item !== undefined && a.item !== e.item)
    return `Ticket ${n} has the wrong item: they asked for ${e.item}, ${a.item ? `not ${a.item}` : 'but no drink is written on it'}.`;
  if (e.with_sugar !== undefined && a.with_sugar !== e.with_sugar)
    return e.with_sugar
      ? `Ticket ${n} needs sugar: they asked for some.`
      : `Ticket ${n} has sugar on it, but they didn’t want any.`;
  if (e.sugar_count !== undefined && a.sugar_count !== e.sugar_count)
    return `Ticket ${n} needs ${count(e.sugar_count, 'sugar')}, but it says ${a.sugar_count ?? 0}.`;
  if ((e.to_go ?? false) !== (a.to_go ?? false))
    return e.to_go ? `Ticket ${n} is to go: Write To go on it.` : `Ticket ${n} is staying in, but it says To go.`;
  if ((e.rush ?? false) !== (a.rush ?? false))
    return e.rush
      ? `Ticket ${n} is for someone in a rush: Write Rush on it.`
      : `Ticket ${n} isn’t in a rush, but it says Rush.`;
  return '';
}
