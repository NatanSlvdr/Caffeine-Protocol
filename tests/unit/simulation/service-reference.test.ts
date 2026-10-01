import { describe, it, expect } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { robotCommands } from '../../../src/domain/robotProgram';

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

describe('Porter learns one job per shift', () => {
  const PORTER = UNLOCKS.floor,
    CLEARING = UNLOCKS.clearing;
  it('delivers only on its first shift, while Pip still clears the tables', () => {
    expect(robotCommands('floor', PORTER)).not.toContain('WAIT DIRTY');
    expect(referencePrograms(PORTER).floor).not.toContain('WAIT DIRTY');
    expect(levels[PORTER - 1].service?.clearing).toBe(false);
  });
  it('has to clear the used cups from the next shift', () => {
    expect(robotCommands('floor', CLEARING)).toContain('WAIT DIRTY');
    expect(referencePrograms(CLEARING).floor).toContain('WAIT DIRTY');
    const deliveryOnly = { ...referencePrograms(CLEARING), floor: referencePrograms(PORTER).floor };
    const result = runLevel(levels[CLEARING - 1], compileProgram(deliveryOnly.query, CLEARING), deliveryOnly);
    expect(result.passed).toBe(false);
    expect(result.first_failure?.role).toBe('floor');
    expect(result.first_failure?.reason).toContain('Wait for Dirty cups');
  });
});
