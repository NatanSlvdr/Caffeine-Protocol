/** Operand value classification shared by editor selectors and order displays. */
export type OperandKind =
  | { kind: 'variable'; slot: 1 | 2 | 3 | 4 }
  | { kind: 'model'; model: 'coffee' | 'tea' | 'sugar' }
  | { kind: 'icon'; icon: 'receipt' | 'speech' | 'count' | 'paper' }
  | { kind: 'none' };

export function operandKind(value: string): OperandKind {
  const normalized = value.toLowerCase();
  const variable = /^var ?([1-4])$/.exec(normalized);
  if (variable) return { kind: 'variable', slot: Number(variable[1]) as 1 | 2 | 3 | 4 };
  if (normalized === 'coffee' || normalized === 'tea' || normalized === 'sugar') return { kind: 'model', model: normalized };
  if (normalized.includes('sugar') || normalized.includes('sweet')) return { kind: 'model', model: 'sugar' };
  if (normalized === 'item') return { kind: 'icon', icon: 'receipt' };
  if (normalized.includes('speech') || normalized.includes('heard')) return { kind: 'icon', icon: 'speech' };
  if (normalized.includes('count') || normalized.includes('number')) return { kind: 'icon', icon: 'count' };
  if (normalized.includes('paper') || normalized.includes('ticket') || normalized.includes('order'))
    return { kind: 'icon', icon: 'paper' };
  return { kind: 'none' };
}
