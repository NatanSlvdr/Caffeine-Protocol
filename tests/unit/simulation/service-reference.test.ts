import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { UNLOCKS } from '../../../src/domain/unlocks';

describe('complete campaign reference programs', () => {
  for (const [i, level] of levels.entries())
    it(`${level.id} completes all seeds`, () => {
      const programs = i + 1 >= UNLOCKS.prep ? referencePrograms(i + 1) : undefined;
      const result = runLevel(level, compileProgram(lessons[i].solution, i + 1), programs);
      expect(result.first_failure).toBeNull();
      expect(result.passed).toBe(true);
      expect(result.passed_seeds).toBe(level.seeds.length);
      if (i + 1 >= UNLOCKS.query) expect(result.stars).toBe(3);
    });
});
