import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { drills, drillRoutine, tryDrill } from '../../../src/data/drills';
import { referencePrograms } from '../../../src/data/extension';
import { UNLOCKS } from '../../../src/domain/unlocks';

/**
 * A drill is only as good as the café's verdict on it: the worked example's passage serves the shift, and every other
 * choice is turned away by the café with a reason the player can read. Each one is served here, so a changed rule or
 * a reworked example can't leave a drill with two right answers, or none.
 */

const unlockedBy = { query: UNLOCKS.query, prep: UNLOCKS.prep, floor: UNLOCKS.floor } as const;

describe('drills', () => {
  it('have their own ids, and run in campaign order', () => {
    expect(new Set(drills.map((drill) => drill.id)).size).toBe(drills.length);
    const shifts = drills.map((drill) => drill.shift);
    expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
  });

  it('come on every act, each on a shift that teaches with the robot it drills', () => {
    const acts = [UNLOCKS.query, UNLOCKS.prep, UNLOCKS.floor, UNLOCKS.toGo];
    for (const [i, from] of acts.entries()) {
      const to = acts[i + 1] ?? lessons.length + 1;
      expect(
        drills.some((drill) => drill.shift >= from && drill.shift < to),
        `a drill on shifts ${from}–${to - 1}`,
      ).toBe(true);
    }
    for (const drill of drills) expect(drill.shift, drill.id).toBeGreaterThanOrEqual(unlockedBy[drill.robot]);
  });

  describe.each(drills.map((drill) => [drill.id, drill] as const))('%s', (_, drill) => {
    it('cuts its gap from the worked example, on whole lines', () => {
      const { before, after } = drillRoutine(drill);
      expect(before === '' || before.endsWith('\n'), 'the gap starts a line').toBe(true);
      expect(after === '' || after.startsWith('\n'), 'the gap ends a line').toBe(true);
      const source =
        drill.shift >= UNLOCKS.prep ? referencePrograms(drill.shift)[drill.robot] : lessons[drill.shift - 1].solution;
      expect(before + drill.passage + after).toBe(source);
    });

    it('offers the passage among choices that all differ', () => {
      expect(drill.choices.length).toBeGreaterThanOrEqual(2);
      expect(new Set(drill.choices).size).toBe(drill.choices.length);
      expect(drill.choices).toContain(drill.passage);
    });

    it('is served by the passage alone, and turns every other choice away with a reason', () => {
      for (const choice of drill.choices) {
        const result = tryDrill(drill, choice);
        if (choice === drill.passage) {
          expect(result.passed, result.first_failure?.reason).toBe(true);
        } else {
          expect(result.passed, `${JSON.stringify(choice)} serves the shift`).toBe(false);
          expect(result.first_failure?.reason).toBeTruthy();
        }
      }
    });

    it('points Help to it only on failures a wrong choice here is turned away with', () => {
      const turned = drill.choices
        .filter((choice) => choice !== drill.passage)
        .map((choice) => tryDrill(drill, choice).first_failure?.code);
      for (const code of drill.misses) expect(turned, code).toContain(code);
    });
  });
});
