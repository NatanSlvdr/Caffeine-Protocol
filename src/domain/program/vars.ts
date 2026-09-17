/** Query language: loop selectors and variable slots. */
import type { HeardOrder } from '../types';

export interface ForInstruction { variable: string; selector: string }
export const LOOP_VARIABLES = ['item'] as const;
/** Selectors resolve collections; the loop engine only binds and advances values. */
export const collectionSelectors: Record<string, (orders: HeardOrder[]) => HeardOrder[]> = {
  'heard orders': orders => orders,
};
export const LOOP_SELECTORS = Object.keys(collectionSelectors);
export function parseFor(command: string): ForInstruction | undefined {
  const match = /^FOR ([a-z][a-z0-9_]*) IN ([a-z][a-z ]*)$/.exec(command);
  return match ? { variable: match[1], selector: match[2] } : undefined;
}

export const VARIABLES = ['var1', 'var2', 'var3', 'var4'] as const;
/** Letter labels distinguish variable slots from numeric values without changing saved programs. */
export function variableLabels(text: string) {
  return text.replace(/\bvar ?([1-4])\b/g, (_, slot: string) => `Var ${'ABCD'[Number(slot) - 1]}`);
}
export const STORE_VALUES = ['number', ...Array.from({length:20},(_,i)=>String(i)), ...VARIABLES];
/** Assignment operands select a local slot and a numeric data source. */
export function parseStore(command: string) {
  const match = /^STORE ([a-z][a-z0-9_]*) FROM (number|0|[1-9]|1[0-9]|var[1-4])$/.exec(command);
  return match ? { variable: match[1], value: match[2] } : undefined;
}
/** Sugar writes share the held paper with drink writes. */
export function parseSugarWrite(command: string) {
  return /^WRITE (0|[1-9]|1[0-9]|[a-z][a-z0-9_]*) sugar$/.exec(command)?.[1];
}
