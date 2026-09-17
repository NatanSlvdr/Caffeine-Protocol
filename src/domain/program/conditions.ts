/** Query language: conditions shared by the compiler, interpreter, and editor. */
import type { HeardOrder } from '../types';

export const QUERY_CONDITION_OPERATORS = ['IN', 'NOT IN'] as const;
export const QUERY_CONDITION_VALUES = ['coffee', 'tea', 'sugar', 'negation', 'number', 'ambiguous'] as const;
export const QUERY_CONDITION_SOURCES = ['CUSTOMER SPEECH', 'item'] as const;
export interface QueryComparisonCondition { left: string; operator: typeof QUERY_CONDITION_OPERATORS[number]; right: string }
/** Membership operands stay independent of the token vocabulary and source registry. */
export function parseQueryComparison(command: string): QueryComparisonCondition | undefined {
  const match = /^IF ([a-z][a-z0-9_]*) (IN|NOT IN) (CUSTOMER SPEECH|[a-z][a-z0-9_]*)$/.exec(command);
  return match ? { left: match[1], operator: match[2] as QueryComparisonCondition['operator'], right: match[3] } : undefined;
}

export const CONDITION_CONNECTORS = ['AND', 'OR'] as const;
export interface ConditionExpression { conditions: QueryComparisonCondition[]; connectors: (typeof CONDITION_CONNECTORS[number])[] }
/** AND binds more tightly than OR; compound conditions remain one IF instruction. */
export function parseConditionExpression(command: string): ConditionExpression | undefined {
  const parts = command.split(/ (AND|OR) /);
  const conditions: QueryComparisonCondition[] = [];
  const connectors: ConditionExpression['connectors'] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const condition = parseQueryComparison(index === 0 ? parts[index] : `IF ${parts[index]}`);
    if (!condition) return undefined;
    conditions.push(condition);
    if (index > 0) connectors.push(parts[index - 1] as typeof CONDITION_CONNECTORS[number]);
  }
  return { conditions, connectors };
}
export function formatConditionExpression(expression: ConditionExpression) {
  return 'IF ' + expression.conditions.map((condition, index) => `${index ? expression.connectors[index - 1] + ' ' : ''}${condition.left} ${condition.operator} ${condition.right}`).join(' ');
}
export function isQueryComparison(command: string) { return !!parseConditionExpression(command); }

/** Token membership never consults the expected ticket or semantic intent. */
export function evaluateQueryComparison(condition: QueryComparisonCondition, bindings: Record<string, HeardOrder | undefined>) {
  const present = bindings[condition.right]?.tokens.includes(condition.left) ?? false;
  return condition.operator === 'NOT IN' ? !present : present;
}

/** Evaluate OR-separated groups of AND terms against the same current bindings. */
export function evaluateConditionExpression(expression: ConditionExpression, bindings: Record<string, HeardOrder | undefined>) {
  let group = evaluateQueryComparison(expression.conditions[0], bindings);
  for (let index = 1; index < expression.conditions.length; index++) {
    if (expression.connectors[index - 1] === 'OR') {
      if (group) return true;
      group = evaluateQueryComparison(expression.conditions[index], bindings);
    } else group = group && evaluateQueryComparison(expression.conditions[index], bindings);
  }
  return group;
}
