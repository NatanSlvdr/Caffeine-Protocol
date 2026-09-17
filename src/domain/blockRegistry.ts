import { familyFor } from './blockFields';
import { isQueryComparison } from './program';
import { isWorkerComparison as isRobotComparison } from './robotConditions';

/** Single source of truth for the block library: commands hidden because operands cover them. */
export const HIDDEN_LIBRARY_COMMANDS = [
  'END',
  'ELSE',
  'REPEAT',
  'ITEM heard',
  'TICKET',
  'SUBMIT',
  'DEPOSIT',
  'WRITE coffee',
  'WRITE tea',
  'WRITE heard',
] as const;

export function blockVariants(command: string, available: readonly string[]) {
  const family = familyFor(command);
  return available.filter(
    (candidate) =>
      candidate !== 'ITEM heard' &&
      familyFor(candidate) === family &&
      // Legacy IF blocks keep their compact single selector; comparison blocks
      // expose their three operands separately in the editor.
      !(family === 'IF' && (isQueryComparison(candidate) || isRobotComparison(candidate))),
  );
}

/** One library block per action; operands are chosen inside that block. */
export function blockPrototypes(available: readonly string[]) {
  const families = new Set<string>();
  return available.filter((command) => {
    if ((HIDDEN_LIBRARY_COMMANDS as readonly string[]).includes(command) || command.startsWith('POSITION '))
      return false;
    const family = familyFor(command);
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
}
