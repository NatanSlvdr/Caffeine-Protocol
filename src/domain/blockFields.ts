/** Presentation-only operands serialize to the existing, role-gated instruction language. */
export function blockFields(command: string) {
  if (command === 'LISTEN') return { family: 'WAIT', verb: 'WAIT', value: 'Customer speech' };
  if (command.startsWith('WAIT ')) return {
    family: 'WAIT', verb: 'WAIT', value: ({ TICKET: 'Order ticket', DRINK: 'Ready drink', DIRTY: 'Dirty cups' } as Record<string, string>)[command.slice(5)] ?? command.slice(5),
  };
  const [verb, ...parts] = command.split(' ');
  if (['IF', 'ITEM', 'SUGAR', 'READ', 'TAKE', 'FILL', 'ADD', 'MOVE', 'FUNCTION', 'CALL', 'POSITION', 'JUMP'].includes(verb)) {
    const operand = parts.join(' ');
    return { family: verb, verb, value: operand.toLowerCase().replaceAll('_', ' ') };
  }
  return { family: command, verb: command, value: '' };
}

export function blockVariants(command: string, available: readonly string[]) {
  const family = blockFields(command).family;
  return available.filter(candidate => blockFields(candidate).family === family);
}

/** One library block per action; operands are chosen inside that block. */
export function blockPrototypes(available: readonly string[]) {
  const families = new Set<string>();
  return available.filter(command => {
    const family = blockFields(command).family;
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
}
