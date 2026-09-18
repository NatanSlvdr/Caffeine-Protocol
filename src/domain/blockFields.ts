/** Presentation-only family classification; operands serialize to the finite instruction language. */
export function familyFor(command: string): string {
  if (command.startsWith('WRITE ')) return 'ITEM';
  if (command.startsWith('STORE ')) return 'STORE';
  if (command.startsWith('POSITION ')) return 'POSITION';
  if (command === 'LISTEN') return 'WAIT';
  if (command === 'TICKET') return 'TAKE';
  if (command === 'SUBMIT') return 'DEPOSIT';
  if (command === 'PICKUP' || /^(PICKUP|TAKE) /.test(command)) return 'TAKE';
  if (command === 'DEPOSIT' || /^DEPOSIT /.test(command)) return 'DEPOSIT';
  if (command.startsWith('WAIT ')) return 'WAIT';
  const [verb] = command.split(' ');
  if (
    [
      'FOR',
      'IF',
      'ITEM',
      'SUGAR',
      'READ',
      'TAKE',
      'FILL',
      'ADD',
      'MOVE',
      'FUNCTION',
      'CALL',
      'POSITION',
      'JUMP',
    ].includes(verb)
  )
    return verb;
  return command;
}

/** Presentation-only verb/value labels for one serialized command. */
export function labelFor(command: string): { verb: string; value: string } {
  if (command.startsWith('WRITE ')) return { verb: 'Write', value: 'Sugar' };
  if (command.startsWith('STORE ')) return { verb: 'Store', value: command.split(' ')[1] };
  if (command.startsWith('POSITION ')) return { verb: '', value: '' };
  if (command === 'LISTEN') return { verb: 'Wait for', value: 'Orders' };
  if (command === 'TICKET') return { verb: 'Take', value: '' };
  if (command === 'SUBMIT') return { verb: 'Deposit', value: '' };
  if (command === 'PICKUP' || /^(PICKUP|TAKE) /.test(command)) return { verb: 'Take', value: '' };
  if (command === 'DEPOSIT' || /^DEPOSIT /.test(command)) return { verb: 'Deposit', value: '' };
  if (command.startsWith('WAIT '))
    return {
      verb: 'Wait for',
      value:
        ({ TICKET: 'Order ticket', DRINK: 'Ready drink', DIRTY: 'Dirty cups' } as Record<string, string>)[
          command.slice(5)
        ] ?? command.slice(5),
    };
  const [verb, ...parts] = command.split(' ');
  if (
    [
      'FOR',
      'IF',
      'ITEM',
      'SUGAR',
      'READ',
      'TAKE',
      'FILL',
      'ADD',
      'MOVE',
      'FUNCTION',
      'CALL',
      'POSITION',
      'JUMP',
    ].includes(verb)
  ) {
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
