import { describe, expect, it } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { FailureCode } from '../../../src/domain/failures';
import type { RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { incomingRobotPrograms, newSave } from '../../../src/features/campaign/save/persistence';

/**
 * What each shift asks for that the one before it didn't, as the failure the routines carried in from the shift
 * before run into first. docs/campaign/AUDIT.md gives the reasons; a shift whose carried routines pass would be a
 * repeat, and one that fails for some other reason would be teaching something its lesson doesn't name.
 */
const NEW_IN: Record<string, FailureCode> = {
  L03: 'stopped-listening',
  L04: 'ticket-item',
  L05: 'ticket-sugar',
  L06: 'ticket-count',
  L07: 'ticket-sugar',
  L08: 'unclear-order',
  // Brew and Porter arrive with a starter that leaves out the one step their first lesson is about.
  L09: 'recipe-order',
  L10: 'recipe-order',
  L11: 'sugar-count',
  L12: 'recipe-not-function',
  L13: 'carry-more',
  L14: 'unset-variable',
  L15: 'table-not-cleared',
  L16: 'carry-more',
  L17: 'ticket-to-go-missing',
  L18: 'no-clean-cups',
  L19: 'ticket-rush-missing',
  L20: 'closing-ticket',
};

/** The routines a player who served shift `n` with the reference brings into the next shift. */
const servedAt = (n: number): RobotPrograms =>
  n >= UNLOCKS.prep ? referencePrograms(n) : { query: lessons[n - 1].solution, prep: '', floor: '' };

function carriedInto(n: number) {
  const index = n - 1,
    previous = servedAt(n - 1);
  const save = { ...newSave(), solutions: { [index - 1]: previous.query }, robotSolutions: { [index - 1]: previous } };
  const programs = incomingRobotPrograms(save, index, lessons);
  return runLevel(levels[index], compileProgram(programs.query, n), n >= UNLOCKS.prep ? programs : undefined);
}

describe('every shift asks for something new', () => {
  it('names every shift between the first program and the finale', () => {
    expect(Object.keys(NEW_IN)).toEqual(levels.slice(2, -1).map((level) => level.id));
  });
  it.each(Object.entries(NEW_IN))('%s turns away the routines carried in, for its own lesson', (id, code) => {
    const result = carriedInto(Number(id.slice(1)));
    expect(result.passed).toBe(false);
    expect(result.first_failure?.code).toBe(code);
  });
  it('lets the finale run on the routines that served Last Orders: it asks for every rule at once, not a new one', () => {
    expect(carriedInto(levels.length).passed).toBe(true);
  });
});
