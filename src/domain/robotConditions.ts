import type { SpeechIntent } from './types';

/** Kitchen/floor ticket comparisons retained independently of Query speech tokens. */
export const CONDITION_OPERATORS = ['IN', '=', '!='] as const;
/** Retained only so existing saved numeric-comparison programs keep running. */
type LegacyConditionOperator = '<' | '>' | '<=' | '>=';
export const CONDITION_VALUES = ['coffee', 'tea', 'sugar', 'count', 'ambiguous'] as const;
export const CONDITION_SOURCES = ['CUSTOMER SPEECH', 'SUGAR COUNT', '0', '1', '2', 'TRUE', 'FALSE'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number] | LegacyConditionOperator;
export interface ComparisonCondition {
  left: (typeof CONDITION_VALUES)[number];
  operator: ConditionOperator;
  right: (typeof CONDITION_SOURCES)[number];
}
const comparisonPattern =
  /^IF (coffee|tea|sugar|count|ambiguous) (IN|!=|<=|>=|=|<|>) (CUSTOMER SPEECH|SUGAR COUNT|0|1|2|TRUE|FALSE)$/;
export function parseComparison(command: string): ComparisonCondition | undefined {
  const match = comparisonPattern.exec(command);
  return match
    ? {
        left: match[1] as ComparisonCondition['left'],
        operator: match[2] as ConditionOperator,
        right: match[3] as ComparisonCondition['right'],
      }
    : undefined;
}
export function isComparisonCondition(command: string) {
  return !!parseComparison(command);
}
const comparisonUsesCount = (condition: ComparisonCondition) =>
  condition.left === 'count' || condition.right === 'SUGAR COUNT' || ['0', '1', '2'].includes(condition.right);
export function comparisonUnlocked(command: string, level: number) {
  const condition = parseComparison(command);
  return !!condition && level >= (comparisonUsesCount(condition) ? 10 : 4);
}
/** Evaluate existing worker conditions against their selected ticket fields. */
export function evaluateComparison(condition: ComparisonCondition, order: SpeechIntent, intent = order) {
  const speechValue = () =>
    condition.left === 'coffee' || condition.left === 'tea'
      ? order.drink
      : condition.left === 'sugar'
        ? order.with_sugar
        : condition.left === 'count'
          ? order.sugar_count
          : intent.confidence === 'ambiguous';
  const left = speechValue();
  if (condition.operator === 'IN') {
    if (condition.right === 'CUSTOMER SPEECH') {
      return condition.left === 'coffee' || condition.left === 'tea'
        ? order.drink === condition.left
        : condition.left === 'sugar'
          ? order.with_sugar === true
          : condition.left === 'count'
            ? order.sugar_count !== undefined
            : intent.confidence === 'ambiguous';
    }
    if (condition.right === 'SUGAR COUNT') return condition.left === 'count' && left !== undefined;
    const number = Number(condition.right);
    return typeof left === 'number' ? left === number : false;
  }
  if (condition.right === 'CUSTOMER SPEECH') {
    // A direct equality against speech is useful for drink and boolean chips.
    const present =
      condition.left === 'coffee' || condition.left === 'tea'
        ? order.drink === condition.left
        : condition.left === 'sugar'
          ? order.with_sugar === true
          : condition.left === 'count'
            ? order.sugar_count !== undefined
            : intent.confidence === 'ambiguous';
    return condition.operator === '=' ? present : condition.operator === '!=' ? !present : false;
  }
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
