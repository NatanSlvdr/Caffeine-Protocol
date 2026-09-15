/** Presentation-only operands serialize to the finite instruction language. */
export function blockFields(command: string) {
  if (command.startsWith('POSITION ')) return { family: 'POSITION', verb: '', value: '' };
  if (command === 'LISTEN') return { family: 'WAIT', verb: 'Wait for', value: 'Customer speech' };
  if (command === 'TICKET') return { family: 'TAKE', verb: 'Take', value: '' };
  if (command === 'SUBMIT') return { family: 'DEPOSIT', verb: 'Deposit', value: '' };
  if (command === 'PICKUP' || /^(PICKUP|TAKE) /.test(command)) return { family: 'TAKE', verb: 'Take', value: '' };
  if (command === 'DEPOSIT') return { family: 'DEPOSIT', verb: 'Deposit', value: '' };
  if (/^DEPOSIT /.test(command)) return { family: 'DEPOSIT', verb: 'Deposit', value: '' };
  if (command.startsWith('WAIT ')) return {
    family: 'WAIT', verb: 'Wait for', value: ({ TICKET: 'Order ticket', DRINK: 'Ready drink', DIRTY: 'Dirty cups' } as Record<string, string>)[command.slice(5)] ?? command.slice(5),
  };
  const [verb, ...parts] = command.split(' ');
  if (['IF', 'ITEM', 'SUGAR', 'READ', 'TAKE', 'FILL', 'ADD', 'MOVE', 'FUNCTION', 'CALL', 'POSITION', 'JUMP'].includes(verb)) {
    const operand = parts.join(' ');
    return { family: verb, verb: verb === 'ITEM' ? 'Write' : verb[0] + verb.slice(1).toLowerCase(), value: operand.toLowerCase().replaceAll('_', ' ') };
  }
  return { family: command, verb: command[0] + command.slice(1).toLowerCase(), value: '' };
}

export function blockVariants(command: string, available: readonly string[]) {
  const family = blockFields(command).family;
  return available.filter(candidate => candidate !== 'ITEM heard' && blockFields(candidate).family === family);
}

/** One library block per action; operands are chosen inside that block. */
export function blockPrototypes(available: readonly string[]) {
  const families = new Set<string>();
  return available.filter(command => {
    if (['END', 'ELSE', 'REPEAT', 'ITEM heard', 'TICKET', 'SUBMIT', 'DEPOSIT', 'WRITE coffee', 'WRITE tea', 'WRITE heard'].includes(command) || command.startsWith('POSITION ')) return false;
    const family = blockFields(command).family;
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
}
