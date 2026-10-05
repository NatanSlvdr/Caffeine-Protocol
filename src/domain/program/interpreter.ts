/** Query language: the suspended customer-event interpreter used live and offline. */
import { orderTotal } from '../pricing';
import type { Customer, CustomerExecution, OrderTicket, Program, RuntimeState, HeardOrder } from '../types';
import type { Failure, FailureCode } from '../failures';
import { samePoint, STARTS, STATIONS } from '../layout';
import { interactionTarget, isOrderDeposit, isPaperPickup, moveQuery, queryPosition } from '../queryMovement';
import { CLOSING_TICKET, createTicket, ticketMismatch } from '../tickets';
import { QUERY_INSTRUCTION_LIMIT } from '../constants';
import { evaluateConditionExpression, parseConditionExpression } from './conditions';
import { collectionSelectors, parseFor, parseMarkWrite, parseStore, parseSugarWrite } from './vars';

/** Every robot words a stray Return or End the same way. An End without its opener means a Jump landed inside it. */
export const RETURN_OUTSIDE_CALL = 'Return only works inside a function that was called.';
export const FUNCTION_END_OUTSIDE_CALL =
  'This function’s End was reached without a Call: run a function with Call, not by jumping into it.';
const FOR_END_OUTSIDE_LOOP =
  'This For loop’s End was reached without its For: jump to the For line, not into the loop.';

/** Resume at the next speech event, returning a new state without mutating inputs. */
export function* streamCustomerEvent(
  p: Program,
  customer: Customer,
  id: string,
  initial: RuntimeState = { pc: 0, stopped: false },
  checkWrittenOrder = false,
): Generator<CustomerExecution, CustomerExecution> {
  const out: CustomerExecution = {
    tickets: [],
    asked_help: false,
    error: '',
    executed_instructions: 0,
    trace: [],
    state: { ...initial },
  };
  const fail = (code: FailureCode, message: string, context?: Failure['context']) => {
    out.error = message;
    out.error_code = code;
    if (context) out.error_context = context;
    return out;
  };
  const failWith = (failure: Failure) => fail(failure.code, failure.reason, failure.context);
  if (p.compile_error) {
    out.error_line = p.error_line;
    return fail('compile', p.compile_error);
  }
  if (initial.stopped)
    return fail('stopped-listening', 'Query stopped listening. Jump back to Wait for Orders after serving.');
  let orders = structuredClone(customer.heard_orders),
    vars: Record<string, number | undefined> = {},
    ticket: OrderTicket | undefined,
    heard = false;
  const bindings: Record<string, HeardOrder | undefined> = {
    'CUSTOMER SPEECH': { tokens: orders.flatMap((order) => order.tokens) },
    item: orders[0],
  };
  const ambiguous = () => orders.some((order) => order.tokens.includes('ambiguous'));
  // Checkout is automatic once the complete paper order is deposited.
  const finish = () => {
    // A written ticket still in Query's hand never reached the kitchen: that's the slip, not the count.
    if (!out.error && ticket)
      return fail(
        'ticket-not-handed-over',
        'Query is still holding a ticket the kitchen never got: Deposit right at the kitchen handoff.',
      );
    if (checkWrittenOrder && !out.error) {
      const expected = customer.expected.tickets ?? (customer.expected.item ? [customer.expected] : []);
      const count = out.tickets.reduce((sum, paper) => sum + (paper.quantity ?? 1), 0);
      if (count < expected.length) {
        out.error_line = out.trace.findLast((step) => isOrderDeposit(step.command))?.line ?? out.error_line;
        return fail('ticket-count', 'Query handed over too few tickets: every drink they ordered needs its own.', {
          expected: expected.length,
          actual: count,
        });
      }
    }
    if (!out.error && out.tickets.length && !out.payment) {
      if (out.state.counter) return fail('wrong-spot', 'Return to the register after depositing the order.');
      out.payment = { amount: orderTotal(out.tickets), ticketIds: out.tickets.map((t) => t.ticket_id) };
    }
    return out;
  };
  const loops: {
      start: number;
      variable: string;
      values: HeardOrder[];
      index: number;
      previous: HeardOrder | undefined;
    }[] = [],
    calls: { return: number; variables: typeof vars; loop_depth: number }[] = [];
  while (out.state.pc < p.instructions.length) {
    const pc = out.state.pc,
      raw = p.instructions[pc];
    const normalized =
      raw === 'READ number'
        ? 'STORE number FROM number'
        : raw === 'SUGAR true'
          ? 'WRITE 1 sugar'
          : raw === 'SUGAR false'
            ? 'WRITE 0 sugar'
            : raw === 'SUGAR number'
              ? 'WRITE number sugar'
              : raw;
    const c =
      normalized === 'TICKET'
        ? 'TAKE UP'
        : normalized === 'SUBMIT'
          ? 'DEPOSIT RIGHT'
          : normalized.replace(/^PICKUP /, 'TAKE ');
    if (out.executed_instructions >= QUERY_INSTRUCTION_LIMIT)
      return fail('loop-limit', 'Instruction limit reached. A loop must return to Wait for Orders.');
    if (c === 'LISTEN' && heard) return finish();
    out.executed_instructions++;
    out.error_line = p.source_lines[pc];
    out.trace.push({ line: p.source_lines[pc], command: p.instructions[pc], function_depth: calls.length });
    if (!checkWrittenOrder || (!['END', 'ELSE'].includes(c) && !c.startsWith('POSITION '))) yield out;
    if (!heard && (c === 'HELP' || c.startsWith('FOR ') || c.startsWith('STORE ')))
      return fail('no-job', 'Wait for Orders first: no customer has spoken yet.');
    let next = pc + 1;
    if (c.startsWith('IF ')) {
      if (!heard) return fail('no-job', 'Wait for Orders first: no customer has spoken yet.');
      const expression = parseConditionExpression(c);
      const yes = !!expression && evaluateConditionExpression(expression, bindings);
      // What it tested, from what Query heard: never the order the guest meant.
      const tested = new Set(expression?.conditions.map((condition) => condition.right));
      out.trace.at(-1)!.decision = {
        holds: yes,
        heard: Object.fromEntries([...tested].map((source) => [source, [...(bindings[source]?.tokens ?? [])]])),
      };
      if (!yes) next = (p.alternatives[pc] ?? p.ends[pc]) + 1;
    } else if (c.startsWith('FOR ')) {
      const loop = parseFor(c);
      const resolve = loop && collectionSelectors[loop.selector];
      if (!loop || !resolve) return fail('unsupported', 'Unsupported loop selector.');
      const values = resolve(orders);
      if (!values.length) next = p.ends[pc] + 1;
      else {
        loops.push({ start: pc, variable: loop.variable, values, index: 0, previous: bindings[loop.variable] });
        bindings[loop.variable] = values[0];
        vars = {};
      }
    } else if (c.startsWith('FUNCTION ')) next = p.ends[pc] + 1;
    else if (c.startsWith('CALL ')) {
      if (calls.length) return fail('recursive-call', 'A function can’t call itself.');
      calls.push({ return: next, variables: { ...vars }, loop_depth: loops.length });
      vars = {};
      next = p.functions[c.slice(5)] + 1;
    } else if (c.startsWith('JUMP ')) {
      if (calls.length || loops.length)
        return fail('jump-across-block', 'Finish the function or For loop before jumping back.');
      next = p.positions[c.slice(5)];
    } else if (c.startsWith('MOVE ')) {
      const position = moveQuery(queryPosition(out.state.counter), c);
      out.state.counter = position[0] === STARTS.query[0] ? 0 : 1;
    } else if (parseStore(c)) {
      const stored = parseStore(c)!;
      if (
        stored.value === 'number' &&
        (!bindings.item?.tokens.includes('number') || bindings.item.number === undefined)
      )
        return fail('no-number', 'This item has no number to store. Check If Number IN item first.');
      const value =
        stored.value === 'number'
          ? bindings.item?.number
          : /^\d+$/.test(stored.value)
            ? Number(stored.value)
            : vars[stored.value];
      if (value === undefined) return fail('unset-variable', `Store a value in ${stored.value} first.`);
      vars[stored.variable] = value;
    } else if (parseSugarWrite(c) !== undefined) {
      if (!ticket) return fail('no-paper', 'Take the order paper before writing sugar.');
      const value = parseSugarWrite(c)!;
      const amount = /^\d+$/.test(value) ? Number(value) : Object.hasOwn(vars, value) ? vars[value] : undefined;
      if (amount === undefined) return fail('unset-variable', `Store a number in ${value} first.`);
      if (!Number.isInteger(amount) || amount < 0)
        return fail('unsupported', 'Sugar must be a non-negative whole number.');
      ticket.sugar_count = amount;
      ticket.with_sugar = amount > 0;
    } else if (parseMarkWrite(c)) {
      if (!ticket) return fail('no-paper', 'Take the order paper before writing on it.');
      if (parseMarkWrite(c) === 'togo') ticket.to_go = true;
      else ticket.rush = true;
    } else if (c.startsWith('ITEM ')) {
      if (!ticket) return fail('no-paper', 'Take the order paper before writing its item.');
      const parts = c.split(' ');
      ticket.item = parts.at(-1)!;
      ticket.quantity = parts.length === 3 ? Number(parts[1]) : 1;
    } else
      switch (c) {
        case 'LISTEN':
          if (out.state.counter) return fail('wrong-spot', 'Move left 1 tile to the register before Wait for Orders.');
          heard = true;
          break;
        case 'HELP':
          if (ambiguous()) {
            if (ticket || loops.length)
              return fail('unclear-order', 'Use Help before taking paper or starting For item in order.');
            out.asked_help = true;
            orders = structuredClone(customer.clarification_heard_orders ?? []);
            bindings.item = orders[0];
            bindings['CUSTOMER SPEECH'] = { tokens: orders.flatMap((order) => order.tokens) };
            vars = {};
            if (!orders.length) {
              out.state = {
                pc: 0,
                stopped: !p.instructions.some((command) => command.startsWith('JUMP ')),
              };
              return out;
            }
          }
          break;
        case 'ERROR':
          return fail('unclear-order', 'Query reported an unsupported order. Ask Niko for help before taking paper.');
        case 'ELSE':
          next = p.ends[pc] + 1;
          break;
        case 'END': {
          const open = p.instructions[p.ends[pc]];
          if (open.startsWith('FOR ')) {
            const loop = loops.at(-1);
            if (!loop) return fail('jump-across-block', FOR_END_OUTSIDE_LOOP);
            if (ticket) return fail('paper-in-hand', 'Deposit this item’s paper before the For loop moves on.');
            loop.index++;
            vars = {};
            if (loop.index < loop.values.length) {
              bindings[loop.variable] = loop.values[loop.index];
              next = loop.start + 1;
            } else {
              loops.pop();
              bindings[loop.variable] = loop.previous;
            }
          } else if (open.startsWith('FUNCTION ')) {
            const frame = calls.pop();
            if (!frame) return fail('jump-across-block', FUNCTION_END_OUTSIDE_CALL);
            next = frame.return;
            vars = frame.variables;
          }
          break;
        }
        case 'RETURN': {
          const frame = calls.pop();
          if (!frame) return fail('return-outside-call', RETURN_OUTSIDE_CALL);
          next = frame.return;
          vars = frame.variables;
          loops.length = frame.loop_depth;
          break;
        }
        case 'TAKE UP':
        case 'TAKE UP_RIGHT':
        case 'TAKE RIGHT':
        case 'TAKE DOWN_RIGHT':
        case 'TAKE DOWN':
        case 'TAKE DOWN_LEFT':
        case 'TAKE LEFT':
        case 'TAKE UP_LEFT':
          if (!heard) return fail('no-job', 'Wait for Orders first: no customer has spoken yet.');
          if (ambiguous()) return fail('unclear-order', 'This order is unclear. Use Help before taking paper.');
          if (!bindings.item) return fail('guessed-drink', 'There’s no order to write down.');
          if (ticket) return fail('paper-in-hand', 'Deposit the current paper before taking another.');
          if (customer.expected.closing) return failWith(CLOSING_TICKET);
          {
            const target = interactionTarget(queryPosition(out.state.counter), c.slice(5));
            if (!target || !samePoint(target, [STARTS.query[0], STARTS.query[1] - 1]))
              return fail(
                'wrong-spot',
                'No paper in that direction. At the register, use Take up: the paper stack is above it.',
              );
          }
          ticket = createTicket(customer, `${id}_${String(out.tickets.length + 1).padStart(2, '0')}`);
          break;
        case 'DEPOSIT UP':
        case 'DEPOSIT UP_RIGHT':
        case 'DEPOSIT RIGHT':
        case 'DEPOSIT DOWN_RIGHT':
        case 'DEPOSIT DOWN':
        case 'DEPOSIT DOWN_LEFT':
        case 'DEPOSIT LEFT':
        case 'DEPOSIT UP_LEFT':
          if (!ticket)
            return fail(
              'no-paper',
              'Query isn’t holding a ticket to hand over: Take up a sheet and write on it first.',
            );
          if (!['coffee', 'tea'].includes(ticket.item))
            return fail('blank-ticket', 'This ticket has no drink written on it yet.');
          {
            const target = interactionTarget(queryPosition(out.state.counter), c.slice(8));
            if (!target || !samePoint(target, STATIONS.orders.cell))
              return fail('wrong-spot', 'Move right to the handoff tile, then Deposit right into the order counter.');
          }
          if (checkWrittenOrder) {
            const expected = customer.expected.tickets ?? (customer.expected.item ? [customer.expected] : []);
            const offset = out.tickets.reduce((sum, paper) => sum + (paper.quantity ?? 1), 0);
            const count = ticket.quantity ?? 1;
            if (offset + count > expected.length)
              return fail(
                'ticket-count',
                'Query handed over too many tickets: one per drink they ordered, and no more.',
                { expected: expected.length, actual: offset + count },
              );
            const moreLoopItems = loops.some((loop) => loop.index + 1 < loop.values.length);
            const morePaper = p.instructions
              .slice(pc + 1)
              .some(
                (command) =>
                  isPaperPickup(command) ||
                  (command.startsWith('JUMP ') &&
                    p.instructions
                      .slice(p.positions[command.slice(5)] + 1)
                      .find((next) => !next.startsWith('POSITION ')) !== 'LISTEN'),
              );
            if (!moreLoopItems && !morePaper && offset + count < expected.length)
              return fail(
                'ticket-count',
                'Query handed over too few tickets: every drink they ordered needs its own.',
                { expected: expected.length, actual: offset + count },
              );
            for (const [k, request] of expected.slice(offset, offset + count).entries()) {
              const mismatch = ticketMismatch(offset + k, request, ticket);
              if (mismatch) return failWith(mismatch);
            }
          }
          out.tickets.push(ticket);
          ticket = undefined;
          break;
        case 'STOP':
          if (ticket) return fail('paper-in-hand', 'Deposit the current paper before stopping.');
          out.state = { ...out.state, pc: 0, stopped: true };
          return finish();
      }
    out.heldPaper = ticket;
    out.variables = { ...vars };
    out.state.pc = next;
  }
  out.state.stopped = true;
  return finish();
}

/** Offline validation drains the same interpreter used by the live game. */
export function executeCustomerEvent(
  p: Program,
  customer: Customer,
  id: string,
  initial: RuntimeState = { pc: 0, stopped: false },
): CustomerExecution {
  const execution = streamCustomerEvent(p, customer, id, initial);
  let step = execution.next();
  while (!step.done) step = execution.next();
  return step.value;
}
