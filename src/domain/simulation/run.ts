/** Level runs: validate orders, run service, then score. */
import { orderTotal } from '../pricing';
import { streamService } from '../service';
import type { ServiceResult } from '../service';
import { INSTRUCTION_LIMIT } from '../constants';
import { countProgramBlocks, starsFor } from '../scoring';
import type {
  CustomerExecution,
  LevelDefinition,
  Program,
  ReplayEvent,
  RobotPrograms,
  RunFailure,
  RunResult,
} from '../types';
import { closingCall, createTicket } from '../tickets';
import { executeCustomerEvent } from '../program';
import { failureLine, validate } from './validate';

const round = (n: number) => Math.round(n * 10) / 10;

/** Batch validation uses the exact service rules without presentation delays. */
export function simulateService(
  level: LevelDefinition,
  events: ReplayEvent[],
  programs: RobotPrograms,
  start = 0,
): ServiceResult {
  const execution = streamService(level, events, programs, start);
  let step = execution.next();
  while (!step.done) step = execution.next();
  return step.value;
}

/** Empty result shell; phases fill events, execution, and scores. */
function createEmptyResult(level: LevelDefinition, program: Program): RunResult {
  const result: RunResult = {
    passed: true,
    observation: !level.programming_enabled,
    events: [],
    level_id: level.id,
    level_title: level.title,
    passed_seeds: 0,
    required_seeds: level.seeds.length,
    tickets: [],
    executed_instructions: 0,
    average_satisfaction: 100,
    stars: 0,
    first_failure: null,
  };
  if (level.programming_enabled) result.block_count = program.block_count;
  return result;
}

/** Validate every customer across ordered seeds; stops at the first failure. */
function runQueryPhase(level: LevelDefinition, program: Program, result: RunResult): boolean {
  outer: for (const seed of level.seeds) {
    let state = { pc: 0, stopped: false },
      seedInstructions = 0;
    for (const customer of seed.customers) {
      const id = `${seed.id}_T${String(result.tickets.length + 1).padStart(2, '0')}`;
      let actual: CustomerExecution;
      if (level.programming_enabled) actual = executeCustomerEvent(program, customer, id, state);
      else {
        const ticket = createTicket(customer, id);
        ticket.item = 'coffee';
        ticket.created_at = 0;
        ticket.due_at = 0;
        ticket.status = 'served';
        actual = {
          payment: { amount: orderTotal([ticket]), ticketIds: [ticket.ticket_id] },
          tickets: [ticket],
          asked_help: false,
          error: '',
          trace: [],
          executed_instructions: 0,
          state,
        };
      }
      state = actual.state;
      seedInstructions += actual.executed_instructions;
      if (seedInstructions > INSTRUCTION_LIMIT) actual.error = 'Instruction limit reached (10,000 per robot).';
      result.executed_instructions += actual.executed_instructions;
      const reason = validate(customer, actual);
      const line = reason ? (failureLine(reason, actual) ?? -1) : -1;
      const event: ReplayEvent = {
        payment: actual.payment,
        seed_id: seed.id,
        customer: structuredClone(customer),
        tickets: actual.tickets,
        asked_help: actual.asked_help,
        passed: !reason,
        trace: actual.trace,
        timing: { arrival: 0, created: 0, seated: 0, ready: 0, served: 0, left: 0, cleaned: 0 },
        table: 0,
        satisfaction: 100,
      };
      if (level.programming_enabled) {
        event.reason = reason;
        event.failure_line = reason ? line : -1;
      }
      result.events.push(event);
      result.tickets.push(...actual.tickets);
      if (reason) {
        const failure: RunFailure = {
          seed_id: seed.id,
          error_line: line,
          customer_id: customer.customer_id,
          event_time: customer.arrival,
          phrase: customer.phrase,
          intent: customer.intent,
          expected: customer.expected,
          actual: actual.tickets,
          reason,
        };
        result.first_failure = failure;
        result.passed = false;
        break outer;
      }
    }
    if (level.service?.closing && level.programming_enabled) {
      const call = closingCall(seed.customers.at(-1)?.arrival ?? 0);
      const actual = executeCustomerEvent(program, call, `${seed.id}_CLOSING`, state);
      result.executed_instructions += actual.executed_instructions;
      const reason = validate(call, actual);
      if (reason) {
        // The closing call has no guest of its own: the service stops with the last guest's, as it does live.
        const last = result.events.at(-1)!;
        last.passed = false;
        last.reason = reason;
        last.failure_line = actual.error_line ?? actual.trace.at(-1)?.line ?? -1;
        result.first_failure = {
          seed_id: seed.id,
          error_line: actual.error_line ?? actual.trace.at(-1)?.line ?? -1,
          customer_id: call.customer_id,
          event_time: call.arrival,
          phrase: call.phrase,
          intent: call.intent,
          expected: call.expected,
          actual: actual.tickets,
          reason,
        };
        result.passed = false;
        break outer;
      }
    }
    result.passed_seeds++;
  }
  return result.passed;
}

/** Run the kitchen/floor service for every validated seed. */
function runServicePhase(level: LevelDefinition, result: RunResult, programs: RobotPrograms): void {
  result.execution = [];
  let offset = 0;
  for (const seed of level.seeds) {
    const events = result.events.filter((e) => e.seed_id === seed.id);
    if (!events.length) continue;
    const service = simulateService(level, events, programs, offset);
    result.execution.push(service.execution);
    offset += service.execution.duration;
    result.executed_instructions += service.instructions;
    if (service.failure) {
      const f = service.failure,
        e = f.event ?? events[0];
      result.passed = false;
      e.passed = false;
      e.reason = f.reason;
      e.failure_line = f.line;
      result.passed_seeds = level.seeds.indexOf(seed);
      result.first_failure = {
        role: f.role,
        seed_id: seed.id,
        error_line: f.line,
        customer_id: e.customer.customer_id,
        event_time: f.time,
        phrase: e.customer.phrase,
        intent: e.customer.intent,
        expected: e.customer.expected,
        actual: e.tickets,
        reason: f.reason,
      };
      break;
    }
  }
}

/** Trim to the failed seed, then score blocks, satisfaction, and stars. */
function finalizeResult(
  level: LevelDefinition,
  result: RunResult,
  orderPassed: boolean,
  program: Program,
  programs: RobotPrograms,
): void {
  const levelNumber = Number(level.id.slice(1));
  if (result.first_failure) {
    const failedIndex = level.seeds.findIndex((s) => s.id === result.first_failure?.seed_id);
    result.events = result.events.filter((e) => level.seeds.findIndex((s) => s.id === e.seed_id) <= failedIndex);
    result.tickets = result.events.flatMap((e) => e.tickets);
  }
  if (!orderPassed && result.first_failure && !result.first_failure.role) result.first_failure.role = 'query';
  if (level.programming_enabled) result.block_count = countProgramBlocks(programs, program.block_count, levelNumber);
  result.average_satisfaction = result.events.length
    ? round(result.events.reduce((a, e) => a + e.satisfaction, 0) / result.events.length)
    : 100;
  result.stars = starsFor({
    passed: result.passed,
    programmingEnabled: level.programming_enabled,
    blockCount: result.block_count ?? 0,
    blockTarget: level.block_target,
    executedInstructions: result.executed_instructions,
    instructionTarget: level.instruction_target,
  });
}

/** Stop on the first failure across ordered validation seeds. */
export function runLevel(level: LevelDefinition, program: Program, robotPrograms?: RobotPrograms): RunResult {
  const result = createEmptyResult(level, program);
  const orderPassed = runQueryPhase(level, program, result);
  const programs = robotPrograms ?? { query: program.source, prep: '', floor: '' };
  result.programs = programs;
  runServicePhase(level, result, programs);
  finalizeResult(level, result, orderPassed, program, programs);
  return result;
}
