import { describe, expect, it } from 'vitest';
import { availableCommands, blockFields, blockPrototypes, HIDDEN_LIBRARY_COMMANDS, robotCommands } from '../../../src/domain';

const allCommands = (level: number) => [
  ...availableCommands(level),
  ...robotCommands('prep', level),
  ...robotCommands('floor', level),
];

/** The BlockRegistry is the single discovery point for library blocks. */
describe('block registry', () => {
  it('hides operand-covered commands from every library', () => {
    for (const level of [3, 14, 22, 32]) {
      const protos = blockPrototypes(allCommands(level));
      for (const hidden of HIDDEN_LIBRARY_COMMANDS) expect(protos).not.toContain(hidden);
      expect(protos.some((p) => p.startsWith('POSITION '))).toBe(false);
    }
  });
  it('offers exactly one prototype per action family', () => {
    const protos = blockPrototypes(allCommands(32));
    const families = protos.map((p) => blockFields(p).family);
    expect(new Set(families).size).toBe(families.length);
  });
  it('classifies every unlockable command into a family', () => {
    for (const level of [3, 14, 22, 32])
      for (const command of allCommands(level)) expect(blockFields(command).family.length).toBeGreaterThan(0);
  });
});
