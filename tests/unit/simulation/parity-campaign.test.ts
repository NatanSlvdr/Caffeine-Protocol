import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { availableCommands, compileProgram } from '../../../src/domain/program';
import { buildReplayTimeline } from '../../../src/domain/simulation';
import { runCampaignLevel as run } from '../../helpers/run';
import { UNLOCKS } from '../../../src/domain/unlocks';

/** The prologue and Act I, before Brew arrives. */
const ACT_I = levels.slice(0, UNLOCKS.prep - 1);

describe('redesigned Act I campaign', () => {
  for (const [i, level] of ACT_I.entries()) {
    it(`${level.id}: reference passes every authored seed with valid source traces`, () => {
      const actual = run(i);
      expect(actual.first_failure).toBeNull();
      expect(actual.passed).toBe(true);
      expect(actual.passed_seeds).toBe(level.seeds.length);
      for (const event of actual.events)
        for (const step of event.trace) expect(lessons[i].solution.split('\n')[step.line].trim()).toBe(step.command);
      if (i + 1 >= UNLOCKS.query) expect(actual.stars).toBe(3);
      expect(buildReplayTimeline(actual).every((t) => t.end >= t.start)).toBe(true);
    });
    if (i + 1 >= UNLOCKS.query)
      it(`${level.id}: incoming routine fails the new mechanic`, () =>
        expect(run(i, lessons[i].starter).passed).toBe(false));
  }
  it('repeated runs are deterministic without input mutation', () => {
    const before = JSON.stringify(levels);
    expect(run(ACT_I.length - 1)).toEqual(run(ACT_I.length - 1));
    expect(JSON.stringify(levels)).toBe(before);
  });
  it.each([
    ['coffee', ['coffee'], undefined],
    ['tea please', ['tea'], undefined],
    ['coffee with sugar', ['coffee', 'sugar'], undefined],
    ['coffee without sugar', ['coffee', 'sugar', 'negation'], undefined],
    ['coffee no sugar', ['coffee', 'sugar', 'negation'], undefined],
    ['coffee, but no sugar please', ['coffee', 'sugar', 'negation'], undefined],
    ['tea with 2 sugars', ['tea', 'sugar', 'number'], 2],
  ])('authors recognized tokens for %s', (phrase, tokens, number) => {
    const customer = ACT_I.flatMap((l) => l.seeds.flatMap((s) => s.customers)).find((c) => c.phrase === phrase)!;
    expect(customer.heard_orders).toEqual([{ tokens, ...(number === undefined ? {} : { number }) }]);
  });
  it('unlocks only the intended syntax at each milestone', () => {
    expect(availableCommands(UNLOCKS.sugar - 1)).not.toContain('IF sugar IN CUSTOMER SPEECH');
    expect(availableCommands(UNLOCKS.sugar - 1)).not.toContain('WRITE 1 sugar');
    expect(availableCommands(UNLOCKS.sugar)).toContain('IF sugar IN CUSTOMER SPEECH');
    expect(availableCommands(UNLOCKS.sugar)).toContain('IF negation IN CUSTOMER SPEECH');
    expect(availableCommands(UNLOCKS.forEach - 1)).not.toContain('FOR item IN heard orders');
    expect(availableCommands(UNLOCKS.forEach)).toContain('FOR item IN heard orders');
    expect(availableCommands(UNLOCKS.help - 1)).not.toContain('HELP');
    expect(availableCommands(UNLOCKS.help)).toContain('HELP');
    for (const command of [
      'EACH',
      'ITEM heard',
      'SUGAR heard',
      'SUGAR binary',
      'READ sugar',
      'SUGAR variable',
      'FUNCTION build_ticket',
      'CALL build_ticket',
      'RETURN',
      'IF tea',
    ])
      expect(compileProgram(`LISTEN\n${command}`).compile_error).toContain('locked');
  });
});
