import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';

describe('complete campaign reference programs', () => {
  for (const [i, level] of levels.entries())
    it(`${level.id} completes all seeds`, () => {
      const programs = i >= 14 ? referencePrograms(i + 1) : undefined;
      const result = runLevel(level, compileProgram(lessons[i].solution, Math.min(i + 1, 14)), programs);
      expect(result.first_failure).toBeNull();
      expect(result.passed).toBe(true);
      expect(result.passed_seeds).toBe(level.seeds.length);
      if (i >= 2) expect(result.stars).toBe(3);
    });
});
