import { blockFields } from '@/domain';
import { OperandIcon } from '../OperandIcon';

export function category(command: string) {
  const family = blockFields(command).family;
  if (['JUMP', 'POSITION'].includes(family)) return 'jump';
  if (['STORE', 'FUNCTION', 'CALL', 'RETURN'].includes(family)) return 'function';
  if (['MOVE', 'TAKE', 'DEPOSIT'].includes(family)) return 'motion';
  if (['IF', 'ELSE', 'FOR', 'REPEAT'].includes(family)) return 'flow';
  if (['HELP', 'ERROR'].includes(family)) return 'help';
  return 'data';
}

export const conditionLabels: Record<string, string> = {
  var1: 'Var A',
  var2: 'Var B',
  var3: 'Var C',
  var4: 'Var D',
  coffee: 'Coffee',
  tea: 'Tea',
  sugar: 'Sugar',
  negation: 'Negation',
  number: 'Number',
  count: 'Sugar count',
  ambiguous: 'Ambiguous',
  item: 'item',
  'CUSTOMER SPEECH': 'Orders',
  'heard orders': 'order',
  'SUGAR COUNT': 'Sugar count',
  TRUE: 'True',
  FALSE: 'False',
  IN: 'IN',
  'NOT IN': 'NOT IN',
  '=': '=',
  '!=': '!=',
  '<': 'less than',
  '>': 'greater than',
  '<=': 'at most',
  '>=': 'at least',
};

export function conditionOption(value: string) {
  return { value, label: conditionLabels[value] ?? value, icon: <OperandIcon value={value} /> };
}

export function operandOption(value: string) {
  const label = blockFields(value).value;
  return { value, label, icon: <OperandIcon value={label} /> };
}
