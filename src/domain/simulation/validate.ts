/** Offline order validation against the expected tickets and payment. */
import { CLOSING_TICKET_ERROR, count, ticketMismatch, ticketUnits } from '../tickets';
import { orderTotal } from '../pricing';
import { parseMarkWrite, parseSugarWrite } from '../program/vars';
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
    const mismatch = ticketMismatch(i, e, units[i]);
    if (mismatch) return mismatch;
  }
  if (!actual.payment)
    return 'Query has to be back at the register after the last ticket, so the guest can pay at checkout.';
  if (actual.payment.amount !== orderTotal(actual.tickets) || actual.payment.ticketIds.length !== actual.tickets.length)
    return 'The payment doesn’t match the tickets Query handed over.';
  return '';
}

const isHandOver = (command: string) => command === 'SUBMIT' || command === 'DEPOSIT' || command.startsWith('DEPOSIT ');
const writesItem = (command: string) =>
  command === 'ITEM' || command.startsWith('ITEM ') || /^WRITE (coffee|tea|heard)$/.test(command);

/** Which instruction each kind of slip comes from, so the editor can point at it. */
const SLIP_SOURCES: [RegExp, (command: string) => boolean][] = [
  [/checkout|payment/, isHandOver],
  [/To go/, (command) => parseMarkWrite(command) === 'togo'],
  [/Rush/, (command) => parseMarkWrite(command) === 'rush'],
  [/sugar/, (command) => command.startsWith('SUGAR ') || parseSugarWrite(command) !== undefined],
  [/item|ask for help|guess a drink/, writesItem],
  [/asked for help on/, (command) => command === 'HELP'],
  [/ticket/i, isHandOver],
];

/**
 * The program line behind a failed order: the line that errored, else the instruction that wrote the slip
 * (or the hand-over, when that never ran). Anything else points at whatever ran last.
 */
export function failureLine(reason: string, actual: CustomerExecution): number | undefined {
  if (actual.error) return actual.error_line;
  const last = (runs: (command: string) => boolean) => actual.trace.findLast((step) => runs(step.command))?.line;
  const source = SLIP_SOURCES.find(([pattern]) => pattern.test(reason))?.[1];
  return (source && (last(source) ?? last(isHandOver))) ?? actual.trace.at(-1)?.line;
}

/** “1 drink”, “2 drinks”, “0 sugars”. */
