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
  if (expected.ask_help && !actual.asked_help) return 'Expected Query to ask for help.';
  if (!expected.ask_help && actual.asked_help) return 'Query asked for help on a supported phrase.';
  if (expected.ask_help && !tickets.length)
    return actual.tickets.length ? 'Do not guess a drink when no clarification is available.' : '';
  if (!actual.tickets.length) return 'No ticket was created.';
  const units = actual.tickets.flatMap(ticketUnits);
  if (units.length !== tickets.length) return `Wrong ticket count: expected ${tickets.length}, got ${units.length}.`;
  for (const [i, e] of tickets.entries()) {
    const a = units[i];
    if (e.item !== undefined && a.item !== e.item)
      return `Wrong item on ticket ${i + 1}: expected ${e.item}, got ${a.item}.`;
    if (e.with_sugar !== undefined && a.with_sugar !== e.with_sugar)
      return `Wrong binary sugar modifier on ticket ${i + 1}.`;
    if (e.sugar_count !== undefined && a.sugar_count !== e.sugar_count) return `Wrong sugar count on ticket ${i + 1}.`;
    if ((e.to_go ?? false) !== (a.to_go ?? false))
      return e.to_go
        ? `Ticket ${i + 1} is to go: Write To go on it.`
        : `Ticket ${i + 1} is staying in, but it says To go.`;
    if ((e.rush ?? false) !== (a.rush ?? false))
      return e.rush
        ? `Ticket ${i + 1} is for someone in a rush: Write Rush on it.`
        : `Ticket ${i + 1} isn’t in a rush, but it says Rush.`;
  }
  if (!actual.payment) return 'Return to the register after submitting all tickets to finish automatic checkout.';
  if (actual.payment.amount !== orderTotal(actual.tickets) || actual.payment.ticketIds.length !== actual.tickets.length)
    return 'The customer payment does not match the submitted order.';
  return '';
}
