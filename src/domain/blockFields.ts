import { parseMarkWrite, parseStore, parseTimes, variableLabels } from './program/vars';
import { parseMoveTo } from './commands';

/** Presentation-only family classification; operands serialize to the finite instruction language. */
export function familyFor(command: string): string {
  if (command.startsWith('WRITE ')) return 'ITEM';
  if (command.startsWith('STORE ')) return 'STORE';
  if (command.startsWith('POSITION ')) return 'POSITION';
  // Walking to a stored table or place is its own library block beside tile moves.
  if (parseMoveTo(command)) return 'MOVE TO';
  if (command === 'LISTEN') return 'WAIT';
  if (command === 'TICKET') return 'TAKE';
  if (command === 'SUBMIT') return 'DEPOSIT';
  if (command === 'PICKUP' || /^(PICKUP|TAKE) /.test(command)) return 'TAKE';
  if (command === 'DEPOSIT' || /^DEPOSIT /.test(command)) return 'DEPOSIT';
  if (command.startsWith('WAIT ')) return 'WAIT';
  const [verb] = command.split(' ');
  if (
    ['FOR', 'IF', 'ITEM', 'SUGAR', 'READ', 'TAKE', 'MOVE', 'USE', 'FUNCTION', 'CALL', 'POSITION', 'JUMP'].includes(verb)
  )
    return verb;
  return command;
}

/** The words a paper mark shows on its Write block. */
export const MARK_LABELS: Record<string, string> = { togo: 'To go', rush: 'Rush', together: 'Together' };

/** Presentation-only verb/value labels for one serialized command. */
export function labelFor(command: string): { verb: string; value: string } {
  const mark = parseMarkWrite(command);
  if (mark) return { verb: 'Write', value: MARK_LABELS[mark] };
  if (command.startsWith('WRITE ')) return { verb: 'Write', value: 'Sugar' };
  if (command.startsWith('STORE ')) return { verb: 'Store', value: command.split(' ')[1] };
  if (command.startsWith('POSITION ')) return { verb: '', value: '' };
  const moveTo = parseMoveTo(command);
  if (moveTo) return { verb: 'Move to', value: moveTo };
  const times = parseTimes(command);
  if (times) return { verb: 'For', value: `${times} times` };
  if (/^USE /.test(command)) return { verb: 'Use', value: '' };
  if (command === 'LISTEN') return { verb: 'Wait for', value: 'Orders' };
  if (command === 'TICKET') return { verb: 'Take', value: '' };
  if (command === 'SUBMIT') return { verb: 'Deposit', value: '' };
  if (command === 'PICKUP' || /^(PICKUP|TAKE) /.test(command)) return { verb: 'Take', value: '' };
  if (command === 'DEPOSIT' || /^DEPOSIT /.test(command)) return { verb: 'Deposit', value: '' };
  if (command.startsWith('WAIT '))
    return {
      verb: 'Wait for',
      value: ({ DIRTY: 'Dirty cups' } as Record<string, string>)[command.slice(5)] ?? command.slice(5),
    };
  const [verb, ...parts] = command.split(' ');
  if (['FOR', 'IF', 'ITEM', 'SUGAR', 'READ', 'TAKE', 'MOVE', 'FUNCTION', 'CALL', 'POSITION', 'JUMP'].includes(verb)) {
    const operand = parts.join(' ');
    return {
      verb: verb === 'ITEM' ? 'Write' : verb[0] + verb.slice(1).toLowerCase(),
      value: operand === 'coffee' ? 'Coffee' : operand === 'tea' ? 'Tea' : operand.toLowerCase().replaceAll('_', ' '),
    };
  }
  return { verb: command[0] + command.slice(1).toLowerCase(), value: '' };
}

/** Presentation-only operands serialize to the finite instruction language. */
export function blockFields(command: string) {
  return { family: familyFor(command), ...labelFor(command) };
}

/** What a Store block reads from, in the words its source field shows. */
export const STORE_SOURCE_LABELS: Record<string, string> = {
  number: 'Number in item',
  sugar: 'Sugar on order',
  table: 'Table on order',
  here: 'Here',
};

/** A block as a screen reader hears it, in the words its tile shows. */
export function spokenBlock(command: string): string {
  // Named, so a routine with several destinations tells them apart: "jump destination listen".
  if (command.startsWith('POSITION ')) return `jump destination ${command.slice(9).toLowerCase()}`;
  const store = parseStore(command);
  const { verb, value } = labelFor(command);
  // Directions and sugar counts sit in the tile's fields, so the command itself says them best.
  const mark = parseMarkWrite(command);
  const text = store
    ? `store ${store.variable} = ${STORE_SOURCE_LABELS[store.value] ?? store.value}`
    : mark
      ? `write ${MARK_LABELS[mark]}`
      : /^(TAKE|DEPOSIT|WRITE|USE) /.test(command)
        ? command
        : `${verb} ${value}`;
  return variableLabels(text.toLowerCase().replace('heard orders', 'order').replaceAll('customer speech', 'orders'))
    .toLowerCase()
    .trim();
}
