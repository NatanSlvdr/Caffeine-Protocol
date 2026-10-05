import { streamCustomerEvent } from '../program';
import { closingCall, createTicket } from '../tickets';
import { STARTS } from '../layout';
import { moveQuery } from '../queryMovement';
import { orderTotal } from '../pricing';
import { BLOCK_SECONDS, INSTRUCTION_LIMIT } from '../constants';
import { failureLine, INSTRUCTION_LIMIT_FAILURE, validate } from '../simulation';
import type {
  CustomerExecution,
  ExecutionEvent,
  LevelDefinition,
  Program,
  ReplayEvent,
  RuntimeState,
  RunResult,
} from '../types';
import type { Point } from '../layout';

/** Mutable interpreter cursor threaded through service-clock pump calls. */
export interface LivePumpState {
  index: number;
  rtState: RuntimeState;
  interpreter: ReturnType<typeof streamCustomerEvent> | undefined;
  position: Point;
  pending: ExecutionEvent | undefined;
  queryNext: number;
  /** The closing-time call after the last guest, while Query is handling it. */
  closing?: ReplayEvent;
  /** Query stopped at closing time. */
  closed: boolean;
  /**
   * Query's steps this round. The step limit counts each round on its own, as the offline run does, so a round
   * plays the same whether it follows others or is practised alone.
   */
  instructions: number;
}

export interface LivePumpDeps {
  level: LevelDefinition;
  program: Program;
  events: ReplayEvent[];
  result: RunResult;
  listenLine: number;
  seedId: string;
}

export function createLivePumpState(queryNext: number): LivePumpState {
  return {
    index: 0,
    rtState: { pc: 0, stopped: false },
    interpreter: undefined,
    position: STARTS.query,
    pending: undefined,
    queryNext,
    closed: false,
    instructions: 0,
  };
}

/** A closing shift keeps Query busy after the last guest, until it stops. */
const closingDue = (state: LivePumpState, deps: LivePumpDeps) =>
  !!deps.level.service?.closing && deps.level.programming_enabled && !state.closed;

/** Query has handled every guest, and at closing time has stopped. */
export const queryFinished = (state: LivePumpState, deps: LivePumpDeps) =>
  state.index >= deps.events.length && !closingDue(state, deps);

function markWaiting(now: number, log: ExecutionEvent[], state: LivePumpState, deps: LivePumpDeps): void {
  if (deps.listenLine < 0) return;
  const previous = log.at(-1);
  if (
    previous?.actor === 'query' &&
    previous.line === deps.listenLine &&
    previous.command === 'LISTEN' &&
    previous.start === now &&
    previous.end === now
  )
    return;
  log.push({
    seed_id: deps.seedId,
    actor: 'query',
    role: 'query',
    start: now,
    end: now,
    line: deps.listenLine,
    command: 'LISTEN',
    from: state.position,
    to: state.position,
    inventory: [],
    waiting: 'guest',
  });
}

/** Advance the query interpreter to the requested game time; future instructions stay suspended. */
export function pumpQuery(now: number, log: ExecutionEvent[], state: LivePumpState, deps: LivePumpDeps): void {
  // A zero-duration LISTEN event keeps the cursor on the real waiting
  // instruction between customers, without masking a block currently being read.
  if (now + 1e-8 < state.queryNext || queryFinished(state, deps)) {
    if (!state.pending && !state.interpreter) markWaiting(now, log, state, deps);
    return;
  }
  const closing = state.index >= deps.events.length;
  if (closing)
    state.closing ??= {
      seed_id: deps.seedId,
      customer: closingCall(now),
      tickets: [],
      trace: [],
      asked_help: false,
      passed: true,
      table: 0,
      satisfaction: 100,
      timing: { arrival: now, created: Infinity, seated: 0, ready: 0, served: 0, left: 0, cleaned: 0 },
    };
  const event = closing ? state.closing! : deps.events[state.index];
  const id = `${deps.seedId}_T${String(state.index + 1).padStart(2, '0')}`;
  let step: IteratorResult<CustomerExecution, CustomerExecution>;
  if (!deps.level.programming_enabled) {
    if (!state.pending) {
      state.pending = {
        seed_id: deps.seedId,
        actor: 'niko',
        role: 'query',
        start: now,
        end: now + 0.75,
        line: -1,
        command: 'TAKE ORDER',
        from: STARTS.query,
        to: STARTS.query,
        inventory: [],
        customerId: event.customer.customer_id,
      };
      log.push(state.pending);
      state.queryNext = state.pending.end;
      return;
    }
    const ticket = createTicket(event.customer, id);
    ticket.item = 'coffee';
    step = {
      done: true,
      value: {
        tickets: [ticket],
        payment: { amount: orderTotal([ticket]), ticketIds: [id] },
        trace: [],
        asked_help: false,
        error: '',
        executed_instructions: 0,
        state: state.rtState,
      },
    };
  } else {
    state.interpreter ??= streamCustomerEvent(deps.program, event.customer, id, state.rtState, true);
    step = state.interpreter.next();
  }
  const actual = step.value;
  if (state.pending) {
    state.pending.variables = { ...actual.variables };
    state.pending.heldPaper = actual.heldPaper ? structuredClone(actual.heldPaper) : undefined;
    state.pending.loop = actual.loop;
    state.position = state.pending.to;
    state.pending = undefined;
  }
  event.trace = [...actual.trace];
  event.asked_help = actual.asked_help;
  for (const ticket of actual.tickets)
    if (!event.tickets.some((t) => t.ticket_id === ticket.ticket_id)) {
      ticket.created_at = now;
      ticket.table_id = `T${String(event.table).padStart(2, '0')}`;
      event.tickets.push(ticket);
      deps.result.tickets.push(ticket);
    }
  if (step.done) {
    state.rtState = actual.state;
    event.payment = actual.payment;
    event.timing.created = now;
    deps.result.executed_instructions += actual.executed_instructions;
    state.instructions += actual.executed_instructions;
    const failure =
      state.instructions > INSTRUCTION_LIMIT ? INSTRUCTION_LIMIT_FAILURE : validate(event.customer, actual);
    if (failure) {
      // The closing call has no guest of its own: the last guest's service stops with it.
      const failed = closing ? deps.events.at(-1)! : event;
      failed.passed = false;
      failed.reason = failure.reason;
      failed.failure_code = failure.code;
      failed.failure_context = failure.context;
      failed.failure_line = failureLine(failure, actual) ?? deps.program.error_line;
      state.queryNext = Infinity;
      return;
    }
    if (closing) {
      state.closed = true;
      state.interpreter = undefined;
      state.queryNext = Infinity;
      return;
    }
    if (!event.tickets.length) {
      event.timing.left = now;
      event.timing.cleaned = now;
    }
    state.index++;
    state.interpreter = undefined;
    // After the last guest, a closing shift goes straight on to the closing-time call.
    state.queryNext =
      state.index < deps.events.length
        ? Math.max(now + 0.001, deps.events[state.index].customer.arrival)
        : closingDue(state, deps)
          ? now + 0.001
          : Infinity;
  } else {
    const instruction = actual.trace.at(-1)!;
    const to = instruction.command.startsWith('MOVE ')
      ? moveQuery(state.position, instruction.command)
      : state.position;
    state.pending = {
      seed_id: deps.seedId,
      actor: 'query',
      role: 'query',
      start: now,
      end: now + BLOCK_SECONDS,
      line: instruction.line,
      command: instruction.command,
      from: state.position,
      to,
      inventory: [],
      customerId: event.customer.customer_id,
    };
    log.push(state.pending);
    state.queryNext = state.pending.end;
  }
}
