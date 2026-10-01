/** Offline order validation against the expected tickets and payment. */
import { CLOSING_TICKET_ERROR, ticketUnits } from '../tickets';
import { orderTotal } from '../pricing';
import type { Customer, CustomerExecution } from '../types';

export function validate(customer: Customer, actual: CustomerExecution): string {
  const expected = customer.expected,
    tickets = expected.tickets ?? (expected.item ? [expected] : []);
  if (actual.error) return actual.error;
  if (expected.closing)
    return actual.tickets.length
      ? CLOSING_TICKET_ERROR
      : actual.state.stopped
        ? ''
        : 'It’s closing time: Stop Query instead of waiting for more guests.';
  if (expected.ask_help && !actual.asked_help)
    return 'This order was too unclear to write down: Query had to ask for help first.';
  if (!expected.ask_help && actual.asked_help) return 'Query asked for help on an order it could read just fine.';
  if (expected.ask_help && !tickets.length)
    return actual.tickets.length ? 'Nobody could clear the order up, so Query shouldn’t guess a drink.' : '';
  if (!actual.tickets.length) return 'No ticket was written for this order.';
  const units = actual.tickets.flatMap(ticketUnits);
  if (units.length !== tickets.length)
    return `They ordered ${count(tickets.length, 'drink')}, but Query wrote ${count(units.length, 'ticket')}.`;
  for (const [i, e] of tickets.entries()) {
    const a = units[i];
    if (e.item !== undefined && a.item !== e.item)
      return `Ticket ${i + 1} has the wrong item: they asked for ${e.item}, ${a.item ? `not ${a.item}` : 'but no drink is written on it'}.`;
    if (e.with_sugar !== undefined && a.with_sugar !== e.with_sugar)
      return e.with_sugar
        ? `Ticket ${i + 1} needs sugar: they asked for some.`
        : `Ticket ${i + 1} has sugar on it, but they didn’t want any.`;
    if (e.sugar_count !== undefined && a.sugar_count !== e.sugar_count)
      return `Ticket ${i + 1} needs ${count(e.sugar_count, 'sugar')}, but it says ${a.sugar_count ?? 0}.`;
    if ((e.to_go ?? false) !== (a.to_go ?? false))
      return e.to_go
        ? `Ticket ${i + 1} is to go: Write To go on it.`
        : `Ticket ${i + 1} is staying in, but it says To go.`;
    if ((e.rush ?? false) !== (a.rush ?? false))
      return e.rush
        ? `Ticket ${i + 1} is for someone in a rush: Write Rush on it.`
        : `Ticket ${i + 1} isn’t in a rush, but it says Rush.`;
  }
  if (!actual.payment)
    return 'Query has to be back at the register after the last ticket, so the guest can pay at checkout.';
  if (actual.payment.amount !== orderTotal(actual.tickets) || actual.payment.ticketIds.length !== actual.tickets.length)
    return 'The payment doesn’t match the tickets Query handed over.';
  return '';
}

/** “1 drink”, “2 drinks”, “0 sugars”. */
const count = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;
