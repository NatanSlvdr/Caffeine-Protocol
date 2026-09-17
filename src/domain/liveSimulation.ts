import { compileProgram, createTicket, streamCustomerEvent } from './program';
import { streamService } from './service';
import { validate } from './simulation';
import { STREET_APPROACH_SECONDS } from './street';
import { BLOCK_SECONDS } from './playback';
import { STARTS } from './layout';
import { moveQuery } from './queryMovement';
import { orderTotal } from './pricing';
import type { CustomerExecution, ExecutionEvent, LevelDefinition, ReplayEvent, RobotPrograms, RunResult, RuntimeState } from './types';

/** A suspended interpreter: constructing a run executes no player instruction. */
export function createLiveRun(level: LevelDefinition, programs: RobotPrograms) {
  const seed = level.seeds[0];
  const result: RunResult = {
    passed: true, observation: !level.programming_enabled, events: [], tickets: [], execution: [], programs,
    level_id: level.id, level_title: level.title, passed_seeds: 0, required_seeds: 1,
    executed_instructions: 0, average_satisfaction: 100, stars: 0, first_failure: null,
  };
  let time = -STREET_APPROACH_SECONDS, next = 0, done = false;
  let service: ReturnType<typeof streamService> | undefined;

  function initialize() {
    const program = compileProgram(programs.query, Math.min(Number(level.id.slice(1)), 14));
    const number = Number(level.id.slice(1));
    result.block_count = program.block_count + (number >= 15 ? programs.prep.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length : 0)
      + (number >= 23 ? programs.floor.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length : 0);
    result.events = seed.customers.map((customer, i): ReplayEvent => ({
      seed_id: seed.id, customer: structuredClone(customer), tickets: [], trace: [], asked_help: false, passed: true,
      table: i % level.active_tables + 1, satisfaction: 100,
      timing: { arrival: customer.arrival, created: Infinity, seated: Infinity, ready: Infinity, served: Infinity, left: Infinity, cleaned: Infinity },
    }));
    result.execution=[{seed_id:seed.id,start:0,duration:Infinity,events:[]}];
    const listenIndex = program.instructions.findIndex(command => command === 'LISTEN');
    const listenLine = listenIndex >= 0 ? program.source_lines[listenIndex] : -1;
    let index = 0, state: RuntimeState = { pc: 0, stopped: false }, queryNext = seed.customers[0]?.arrival ?? Infinity;
    let interpreter: ReturnType<typeof streamCustomerEvent> | undefined;
    let position = STARTS.query;
    let pending: ExecutionEvent | undefined;
    const markWaiting = (now: number, log: ExecutionEvent[]) => {
      if (listenLine < 0) return;
      const previous = log.at(-1);
      if (previous?.actor === 'query' && previous.line === listenLine && previous.command === 'LISTEN' && previous.start === now && previous.end === now) return;
      log.push({seed_id: seed.id, actor: 'query', role: 'query', start: now, end: now, line: listenLine, command: 'LISTEN', from: position, to: position, inventory: []});
    };
    const pump = (now: number, log: ExecutionEvent[]) => {
      // A zero-duration LISTEN event keeps the cursor on the real waiting
      // instruction between customers, without masking a block currently being read.
      if (now + 1e-8 < queryNext || index >= result.events.length) {
        if (!pending && !interpreter) markWaiting(now, log);
        return;
      }
      const event = result.events[index];
      const id = `${seed.id}_T${String(index + 1).padStart(2, '0')}`;
      let step: IteratorResult<CustomerExecution, CustomerExecution>;
      if (!level.programming_enabled) {
        if (!pending) {
          pending = { seed_id: seed.id, actor: 'niko', role: 'query', start: now, end: now + .75, line: -1, command: 'TAKE ORDER', from: STARTS.query, to: STARTS.query, inventory: [], customerId: event.customer.customer_id };
          log.push(pending); queryNext = pending.end; return;
        }
        const ticket = createTicket(event.customer, id); ticket.item = 'coffee';
        step = { done: true, value: { tickets: [ticket], payment: { amount: orderTotal([ticket]), ticketIds: [id] }, trace: [], asked_help: false, error: '', executed_instructions: 0, state } };
      } else {
        interpreter ??= streamCustomerEvent(program, event.customer, id, state, true);
        step = interpreter.next();
      }
      const actual = step.value;
      if (pending) { pending.variables={...actual.variables}; pending.heldPaper = actual.heldPaper ? structuredClone(actual.heldPaper) : undefined; position = pending.to; pending = undefined; }
      event.trace = [...actual.trace]; event.asked_help = actual.asked_help;
      for (const ticket of actual.tickets) if (!event.tickets.some(t => t.ticket_id === ticket.ticket_id)) {
        ticket.created_at = now; ticket.table_id = `T${String(event.table).padStart(2, '0')}`;
        event.tickets.push(ticket); result.tickets.push(ticket);
      }
      if (step.done) {
        state = actual.state; event.payment = actual.payment;
        event.timing.created = now;
        result.executed_instructions += actual.executed_instructions;
        const reason = result.executed_instructions > 10000 ? 'Instruction limit reached (10,000 per robot).' : validate(event.customer, actual);
        if (reason) {
          event.passed = false; event.reason = reason;
          event.failure_line = actual.error_line ?? program.error_line;
          queryNext = Infinity; return;
        }
        if (!event.tickets.length) { event.timing.left = now; event.timing.cleaned = now; }
        index++; interpreter = undefined;
        queryNext = index < result.events.length ? Math.max(now + .001, result.events[index].customer.arrival) : Infinity;
      } else {
        const instruction = actual.trace.at(-1)!;
        const to = instruction.command.startsWith('MOVE ') ? moveQuery(position, instruction.command) : position;
        pending = { seed_id: seed.id, actor: 'query', role: 'query', start: now, end: now + BLOCK_SECONDS, line: instruction.line, command: instruction.command, from: position, to, inventory: [], customerId: event.customer.customer_id };
        log.push(pending); queryNext = pending.end;
      }
    };
    service = streamService(level, result.events, programs, 0, {
      pump, next: () => queryNext, done: () => index >= result.events.length,
      attach: execution => { result.execution = [execution]; },
    });
  }

  /** Advance only to the requested game time; future instructions stay suspended. */
  function advance(seconds: number) {
    if (done) return snapshot();
    const target = time + Math.max(0, seconds);
    if (!service) initialize();
    while (!done && next <= target) {
      if (!service) initialize();
      const tick = service!.next();
      if (!tick.done) { next = tick.value; continue; }
      const completed = tick.value;
      result.execution = [completed.execution];
      result.executed_instructions += completed.instructions;
      const failure = completed.failure;
      result.passed = !failure;
      if (failure) {
        const event = failure.event ?? result.events[0];
        event.passed = false;
        result.first_failure = { role: failure.role, seed_id: seed.id, error_line: failure.line, customer_id: event.customer.customer_id,
          event_time: failure.time, phrase: event.customer.phrase, intent: event.customer.intent, expected: event.customer.expected, actual: event.tickets, reason: failure.reason };
      } else {
        result.passed_seeds = 1;
        result.stars = result.observation ? 0 : 1 + ((result.block_count ?? 0) <= level.block_target ? 1 + (result.executed_instructions <= level.instruction_target ? 1 : 0) : 0);
      }
      result.average_satisfaction = result.events.reduce((total, event) => total + event.satisfaction, 0) / Math.max(1, result.events.length);
      done = true;
    }
    time = done ? result.execution![0].duration : target;
    return snapshot();
  }
  function snapshot() { return { result: { ...result }, time, done }; }
  return { advance, snapshot };
}
