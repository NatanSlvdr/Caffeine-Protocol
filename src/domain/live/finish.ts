import type { ServiceResult } from '../service';
import { starsFor } from '../scoring';
import type { LevelDefinition, RunResult } from '../types';

/**
 * Commit a finished seed clock: pass/fail, failure mapping, stars, and satisfaction. `isLast` says it was the run's
 * last round; a practice run that passes it still earns no stars.
 */
export function finishLiveRun(
  result: RunResult,
  completed: ServiceResult,
  level: LevelDefinition,
  seedIndex: number,
  isLast: boolean,
): void {
  const seedId = level.seeds[seedIndex]?.id ?? completed.execution.seed_id;
  const existing = result.execution?.findIndex((e) => e.seed_id === seedId) ?? -1;
  if (result.execution && existing >= 0) result.execution[existing] = completed.execution;
  else result.execution?.push(completed.execution);
  result.executed_instructions += completed.instructions;
  const failure = completed.failure;
  if (failure) {
    const seedEvents = result.events.filter((e) => e.seed_id === seedId);
    const event = failure.event ?? seedEvents[0] ?? result.events[0];
    event.passed = false;
    result.passed = false;
    result.first_failure = {
      role: failure.role,
      seed_id: seedId,
      error_line: failure.line,
      customer_id: event.customer.customer_id,
      event_time: failure.time,
      phrase: event.customer.phrase,
      intent: event.customer.intent,
      expected: event.customer.expected,
      actual: event.tickets,
      code: failure.code,
      context: failure.context,
      reason: failure.reason,
    };
    result.average_satisfaction =
      result.events.reduce((total, e) => total + e.satisfaction, 0) / Math.max(1, result.events.length);
  } else {
    result.passed_seeds += 1;
    if (isLast) {
      result.passed = true;
      result.stars = result.practice
        ? 0
        : starsFor({
            passed: true,
            programmingEnabled: !result.observation,
            blockCount: result.block_count ?? 0,
            blockTarget: level.block_target,
            executedInstructions: result.executed_instructions,
            instructionTarget: level.instruction_target,
          });
      result.average_satisfaction =
        result.events.reduce((total, e) => total + e.satisfaction, 0) / Math.max(1, result.events.length);
    }
  }
}
