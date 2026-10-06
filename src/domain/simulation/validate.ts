/** Offline order validation against the expected tickets and payment. */
import { CLOSING_TICKET, count, ticketMismatch, ticketUnits } from '../tickets';
import { orderTotal } from '../pricing';
import { parseMarkWrite, parseSugarWrite } from '../program/vars';
import type { Customer, CustomerExecution } from '../types';
import type { Failure, FailureCode } from '../failures';

/** A seed that ran past every robot's step budget, live or offline. */
export const INSTRUCTION_LIMIT_FAILURE: Failure = {
  code: 'loop-limit',
  reason: 'Instruction limit reached (10,000 per robot).',
};

/** What's wrong with how Query took this order, against the expected tickets and payment; nothing when it's right. */
export function validate(customer: Customer, actual: CustomerExecution): Failure | undefined {
  const expected = customer.expected,
    tickets = expected.tickets ?? (expected.item ? [expected] : []);
  if (actual.error)
    return { code: actual.error_code ?? 'unsupported', reason: actual.error, context: actual.error_context };
  if (expected.closing)
    return actual.tickets.length
      ? CLOSING_TICKET
      : actual.state.stopped
        ? undefined
        : { code: 'open-after-closing', reason: 'It’s closing time: Stop Query instead of waiting for more guests.' };
  if (expected.ask_help && !actual.asked_help)
    return {
      code: 'help-needed',
      reason: 'This order was too unclear to write down: Query had to ask for help first.',
    };
  if (!expected.ask_help && actual.asked_help)
    return { code: 'help-unneeded', reason: 'Query asked for help on an order it could read just fine.' };
  if (expected.ask_help && !tickets.length)
    return actual.tickets.length
      ? { code: 'guessed-drink', reason: 'Nobody could clear the order up, so Query shouldn’t guess a drink.' }
      : undefined;
  if (!actual.tickets.length)
    return {
      code: 'no-ticket',
      reason: 'No ticket was written for this order.',
      context: { expected: tickets.length, actual: 0 },
    };
  const units = actual.tickets.flatMap(ticketUnits);
  if (units.length !== tickets.length)
    return {
      code: 'ticket-count',
      reason: `They ordered ${count(tickets.length, 'drink')}, but Query wrote ${count(units.length, 'ticket')}.`,
      context: { expected: tickets.length, actual: units.length },
    };
  for (const [i, e] of tickets.entries()) {
    const mismatch = ticketMismatch(i, e, units[i]);
    if (mismatch) return mismatch;
  }
  if (!actual.payment)
    return {
      code: 'checkout',
      reason: 'Query has to be back at the register after the last ticket, so the guest can pay at checkout.',
    };
  if (actual.payment.amount !== orderTotal(actual.tickets) || actual.payment.ticketIds.length !== actual.tickets.length)
    return { code: 'checkout', reason: 'The payment doesn’t match the tickets Query handed over.' };
  return undefined;
}

const isHandOver = (command: string) => command === 'SUBMIT' || command === 'DEPOSIT' || command.startsWith('DEPOSIT ');
const writesItem = (command: string) =>
  command === 'ITEM' || command.startsWith('ITEM ') || /^WRITE (coffee|tea|heard)$/.test(command);

const writesSugar = (command: string) => command.startsWith('SUGAR ') || parseSugarWrite(command) !== undefined;

/** Which instruction each kind of slip comes from, so the editor can point at it. */
const SLIP_SOURCES: Partial<Record<FailureCode, (command: string) => boolean>> = {
  checkout: isHandOver,
  'ticket-to-go-missing': (command) => parseMarkWrite(command) === 'togo',
  'ticket-to-go-extra': (command) => parseMarkWrite(command) === 'togo',
  'ticket-rush-missing': (command) => parseMarkWrite(command) === 'rush',
  'ticket-rush-extra': (command) => parseMarkWrite(command) === 'rush',
  'ticket-together-missing': (command) => parseMarkWrite(command) === 'together',
  'ticket-together-extra': (command) => parseMarkWrite(command) === 'together',
  'ticket-sugar': writesSugar,
  'ticket-item': writesItem,
  'help-needed': writesItem,
  'guessed-drink': writesItem,
  'help-unneeded': (command) => command === 'HELP',
  'ticket-count': isHandOver,
  'no-ticket': isHandOver,
  'closing-ticket': isHandOver,
};

/**
 * The program line behind a failed order: the line that errored, else the instruction that wrote the slip
 * (or the hand-over, when that never ran). Anything else points at whatever ran last.
 */
export function failureLine(failure: Failure, actual: CustomerExecution): number | undefined {
  if (actual.error) return actual.error_line;
  const last = (runs: (command: string) => boolean) => actual.trace.findLast((step) => runs(step.command))?.line;
  const source = SLIP_SOURCES[failure.code];
  return (source && (last(source) ?? last(isHandOver))) ?? actual.trace.at(-1)?.line;
}
