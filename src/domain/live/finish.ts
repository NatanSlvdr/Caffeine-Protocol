import type { ServiceResult } from '../service';
import { starsFor } from '../scoring';
import type { LevelDefinition, RunResult } from '../types';

/** Commit a finished service clock: pass/fail, failure mapping, stars, and satisfaction. */
export function finishLiveRun(result: RunResult, completed: ServiceResult, level: LevelDefinition): void {
  result.execution = [completed.execution];
  result.executed_instructions += completed.instructions;
  const failure = completed.failure;
  result.passed = !failure;
  if (failure) {
    const event = failure.event ?? result.events[0];
    event.passed = false;
    result.first_failure = {
      role: failure.role,
      seed_id: level.seeds[0].id,
      error_line: failure.line,
      customer_id: event.customer.customer_id,
      event_time: failure.time,
      phrase: event.customer.phrase,
      intent: event.customer.intent,
      expected: event.customer.expected,
      actual: event.tickets,
      reason: failure.reason,
    };
  } else {
    result.passed_seeds = 1;
    result.stars = starsFor({
      passed: true,
      programmingEnabled: !result.observation,
      blockCount: result.block_count ?? 0,
      blockTarget: level.block_target,
      executedInstructions: result.executed_instructions,
      instructionTarget: level.instruction_target,
    });
  }
  result.average_satisfaction =
    result.events.reduce((total, event) => total + event.satisfaction, 0) / Math.max(1, result.events.length);
}
