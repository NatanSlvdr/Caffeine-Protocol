import type { SpeechIntent } from './types';
import { WORKER_COMPARISON_LEVEL, WORKER_COUNT_COMPARISON_LEVEL } from './constants';

/** Kitchen/floor ticket comparisons retained independently of Query speech tokens. */
export const WORKER_CONDITION_OPERATORS = ['IN', '=', '!='] as const;
/** Retained only so existing saved numeric-comparison programs keep running. */
type LegacyConditionOperator = '<' | '>' | '<=' | '>=';
export const WORKER_CONDITION_VALUES = ['coffee', 'tea', 'sugar', 'count', 'ambiguous'] as const;
export const WORKER_CONDITION_SOURCES = ['CUSTOMER SPEECH', 'SUGAR COUNT', '0', '1', '2', 'TRUE', 'FALSE'] as const;
export type WorkerConditionOperator = (typeof WORKER_CONDITION_OPERATORS)[number] | LegacyConditionOperator;
export interface WorkerComparisonCondition {
  left: (typeof WORKER_CONDITION_VALUES)[number];
  operator: WorkerConditionOperator;
  right: (typeof WORKER_CONDITION_SOURCES)[number];
}
const comparisonPattern =
  /^IF (coffee|tea|sugar|count|ambiguous) (IN|!=|<=|>=|=|<|>) (CUSTOMER SPEECH|SUGAR COUNT|0|1|2|TRUE|FALSE)$/;
export function parseWorkerComparison(command: string): WorkerComparisonCondition | undefined {
  const match = comparisonPattern.exec(command);
  return match
    ? {
        left: match[1] as WorkerComparisonCondition['left'],
        operator: match[2] as WorkerConditionOperator,
        right: match[3] as WorkerComparisonCondition['right'],
      }
    : undefined;
}
export function isWorkerComparison(command: string) {
  return !!parseWorkerComparison(command);
}
const comparisonUsesCount = (condition: WorkerComparisonCondition) =>
  condition.left === 'count' || condition.right === 'SUGAR COUNT' || ['0', '1', '2'].includes(condition.right);
export function comparisonUnlocked(command: string, level: number) {
  const condition = parseWorkerComparison(command);
  return (
    !!condition && level >= (comparisonUsesCount(condition) ? WORKER_COUNT_COMPARISON_LEVEL : WORKER_COMPARISON_LEVEL)
  );
}
/** Raw ticket field selected by the condition's left operand. */
function resolveLeft(condition: WorkerComparisonCondition, order: SpeechIntent, intent: SpeechIntent): unknown {
  return condition.left === 'coffee' || condition.left === 'tea'
    ? order.drink
    : condition.left === 'sugar'
      ? order.with_sugar
      : condition.left === 'count'
        ? order.sugar_count
        : intent.confidence === 'ambiguous';
}
/** Whether the selected ticket field is present in the heard order. */
function resolvePresent(condition: WorkerComparisonCondition, order: SpeechIntent, intent: SpeechIntent): boolean {
  return condition.left === 'coffee' || condition.left === 'tea'
    ? order.drink === condition.left
    : condition.left === 'sugar'
      ? order.with_sugar === true
      : condition.left === 'count'
        ? order.sugar_count !== undefined
        : intent.confidence === 'ambiguous';
}
/** Membership against speech, sugar count, or a numeric literal. */
function evaluateIn(
  condition: WorkerComparisonCondition,
  order: SpeechIntent,
  intent: SpeechIntent,
  left: unknown,
): boolean {
  if (condition.right === 'CUSTOMER SPEECH') return resolvePresent(condition, order, intent);
  if (condition.right === 'SUGAR COUNT') return condition.left === 'count' && left !== undefined;
  const number = Number(condition.right);
  return typeof left === 'number' ? left === number : false;
}
/** Equality and ordered comparison against sugar count, booleans, or numbers. */
function evaluateNumeric(condition: WorkerComparisonCondition, order: SpeechIntent, left: unknown): boolean {
  const right =
    condition.right === 'SUGAR COUNT'
      ? order.sugar_count
      : ['TRUE', 'FALSE'].includes(condition.right)
        ? condition.right === 'TRUE'
        : Number(condition.right);
  if (left === undefined || right === undefined) return false;
  if (condition.operator === '=') return left === right;
  if (condition.operator === '!=') return left !== right;
  if (typeof left !== 'number' || typeof right !== 'number') return false;
  if (condition.operator === '<') return left < right;
  if (condition.operator === '>') return left > right;
  if (condition.operator === '<=') return left <= right;
  if (condition.operator === '>=') return left >= right;
  return false;
}
/** Evaluate existing worker conditions against their selected ticket fields. */
export function evaluateWorkerComparison(condition: WorkerComparisonCondition, order: SpeechIntent, intent = order) {
  const left = resolveLeft(condition, order, intent);
  if (condition.operator === 'IN') return evaluateIn(condition, order, intent, left);
  if (condition.right === 'CUSTOMER SPEECH') {
    // A direct equality against speech is useful for drink and boolean chips.
    const present = resolvePresent(condition, order, intent);
    return condition.operator === '=' ? present : condition.operator === '!=' ? !present : false;
  }
  return evaluateNumeric(condition, order, left);
}
