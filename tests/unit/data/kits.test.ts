import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { drillRoutine, drills, tryDrill } from '../../../src/data/drills';
import { referencePrograms } from '../../../src/data/extension';
import { kitLines, kits } from '../../../src/data/kits';
import { predictions } from '../../../src/data/predictions';
import { UNLOCKS } from '../../../src/domain/unlocks';

/**
 * A kit is only worth building if it can't build the worked example, can build something the café serves, and doesn't
 * build itself: each one is served here with its own answer and with its blocks just as the tray lays them out.
 */

const unlockedBy = { query: UNLOCKS.query, prep: UNLOCKS.prep, floor: UNLOCKS.floor } as const;
/** The block each rule says the kit leaves out. */
const LEFT_OUT: Record<string, RegExp> = { 'No Else': /^ELSE$/, 'No Call': /^CALL / };
const lines = (passage: string) => passage.split('\n').map((line) => line.trim());
/** Whether every line of the passage can be had from the kit, each block once. */
const buildable = (passage: string, tiles: readonly string[]) => {
  const left = [...tiles];
  return lines(passage).every((line) => {
    const at = left.indexOf(line);
    return at >= 0 && left.splice(at, 1);
  });
};

describe('kits', () => {
  it('have ids of their own among every drill, and run in campaign order on shifts their robot works', () => {
    const ids = [...drills, ...predictions, ...kits].map((each) => each.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shifts = kits.map((kit) => kit.shift);
    expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
    for (const kit of kits) expect(kit.shift, kit.id).toBeGreaterThanOrEqual(unlockedBy[kit.robot]);
  });

  describe.each(kits.map((kit) => [kit.id, kit] as const))('%s', (_, kit) => {
    it('cuts its gap from the worked example, on whole lines', () => {
      const { before, after } = drillRoutine(kit);
      expect(before === '' || before.endsWith('\n')).toBe(true);
      expect(after === '' || after.startsWith('\n')).toBe(true);
      const source =
        kit.shift >= UNLOCKS.prep ? referencePrograms(kit.shift)[kit.robot] : lessons[kit.shift - 1].solution;
      expect(before + kit.passage + after).toBe(source);
    });

    it('leaves out the block its rule names, which the worked example needs', () => {
      const out = LEFT_OUT[kit.rule];
      expect(out, `a rule the test knows: ${kit.rule}`).toBeDefined();
      expect(lines(kit.passage).some((line) => out.test(line))).toBe(true);
      expect(kit.tiles.filter((tile) => out.test(tile))).toEqual([]);
      expect(buildable(kit.passage, kit.tiles)).toBe(false);
    });

    it('builds a passage the café serves, but not by taking its blocks as the tray lays them out', () => {
      expect(buildable(kit.answer, kit.tiles)).toBe(true);
      const served = tryDrill(kit, kit.answer);
      expect(served.passed, served.first_failure?.reason).toBe(true);
      expect(tryDrill(kit, kit.tiles.join('\n')).passed).toBe(false);
    });

    it('nests the answer as it is built, End and all', () => {
      const built = lines(kit.answer);
      const shown = kitLines(kit, built);
      expect(shown.map((line) => line.command)).toEqual(built);
      const ifAt = built.findIndex((line) => line.startsWith('IF '));
      if (ifAt >= 0) expect(shown[ifAt + 1].depth).toBe(shown[ifAt].depth + 1);
      // An End with nothing to close never sits shallower than the gap.
      expect(kitLines(kit, ['END'])[0].depth).toBe(kitLines(kit, [built[0]])[0].depth);
    });
  });
});
