import { describe, expect, it } from 'vitest';
import { memories, memoryById, memoryOpen } from '../../../src/data/memories';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { shiftNumber, UNLOCKS } from '../../../src/domain/unlocks';

const memory = memoryById('day-one')!;
const { level, lesson } = memory;
const run = (query: string) =>
  runLevel(level, compileProgram(query, shiftNumber(level.id)), { query, prep: '', floor: '' });

/** Lou's routine with the coffee side mended in place: both copies of the sugar check, now the same. */
const mendedInPlace = lesson.starter.replace(
  '  IF sugar IN CUSTOMER SPEECH\n    WRITE 1 sugar\n  END',
  '  IF sugar IN CUSTOMER SPEECH\n    IF negation IN CUSTOMER SPEECH\n      WRITE 0 sugar\n    ELSE\n      WRITE 1 sugar\n    END\n  END',
);

describe('Day One, Query’s first morning at Lou’s', () => {
  it('is the one memory, with the tools of the shift that teaches sugar', () => {
    expect(memories.map((m) => m.id)).toEqual(['day-one']);
    expect(level.id).toBe('L05-day-one');
    expect(shiftNumber(level.id)).toBe(UNLOCKS.sugar);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });

  it('comes out once Act I is served, when the tools it plays with are long known', () => {
    expect(memory.opens).toBe(UNLOCKS.help);
    expect(memoryOpen({ stars: { [UNLOCKS.help - 2]: 3 } }, memory)).toBe(false);
    expect(memoryOpen({ stars: { [UNLOCKS.help - 1]: 1 } }, memory)).toBe(true);
  });

  it('serves every round with the steps written once, for every star', () => {
    const result = run(lesson.solution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
  });

  it('gets Lou’s three regulars right on her routine, and the bakery’s first “no sugar” wrong', () => {
    const result = run(lesson.starter);
    expect(result.passed).toBe(false);
    expect(result.first_failure?.code).toBe('ticket-sugar');
    expect(result.first_failure?.role).toBe('query');
    expect(result.first_failure?.seed_id).toBe(`${level.id}_A`);
    const regulars = level.seeds[0].customers.slice(0, 3).map((guest) => guest.phrase);
    expect(regulars).toEqual(['coffee with sugar', 'tea without sugar', 'coffee']);
    expect(level.seeds[0].customers[3].phrase).toBe('coffee no sugar');
  });

  it('passes with the copy mended in place, but only the steps written once earn every star', () => {
    const mended = run(mendedInPlace);
    expect(mended.passed).toBe(true);
    expect(mended.block_count).toBeGreaterThan(level.block_target);
    expect(mended.stars).toBeLessThan(3);
  });

  it('plays with the tools of its day: a block from a later shift isn’t one yet', () => {
    const later = lesson.solution
      .replace('TAKE UP', 'FOR item IN heard orders\n  TAKE UP')
      .replace('JUMP', 'END\nJUMP');
    expect(compileProgram(later, UNLOCKS.forEach).compile_error).toBe('');
    expect(compileProgram(later, shiftNumber(level.id)).compile_error).not.toBe('');
  });

  it('turns the queue a third of the way round each round, so no two rounds open alike', () => {
    const openings = level.seeds.map((seed) =>
      seed.customers
        .slice(0, 3)
        .map((guest) => guest.phrase)
        .join(' / '),
    );
    expect(new Set(openings).size).toBe(level.seeds.length);
  });
});
