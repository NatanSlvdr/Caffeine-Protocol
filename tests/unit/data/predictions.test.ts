import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { drills } from '../../../src/data/drills';
import { momentOf, predictions } from '../../../src/data/predictions';
import { UNLOCKS } from '../../../src/domain/unlocks';

/**
 * A moment's answer is whatever the café runs next, so these check the moment still exists in its shift's first
 * round and that what runs next is still one of the choices: a changed rule or a reworked example can't leave a
 * moment with no right call.
 */

const unlockedBy = { query: UNLOCKS.query, prep: UNLOCKS.prep, floor: UNLOCKS.floor } as const;

describe('moments to call', () => {
  it('have ids of their own, shared with no gap drill, and run in campaign order', () => {
    const ids = [...drills, ...predictions].map((each) => each.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shifts = predictions.map((each) => each.shift);
    expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
  });

  it('come on every act, each paused in a robot the shift has', () => {
    const acts = [UNLOCKS.query, UNLOCKS.prep, UNLOCKS.floor, UNLOCKS.toGo];
    for (const [i, from] of acts.entries()) {
      const to = acts[i + 1] ?? lessons.length + 1;
      expect(
        predictions.some((each) => each.shift >= from && each.shift < to),
        `shifts ${from}–${to - 1}`,
      ).toBe(true);
    }
    for (const each of predictions) expect(each.shift, each.id).toBeGreaterThanOrEqual(unlockedBy[each.robot]);
  });

  describe.each(predictions.map((each) => [each.id, each] as const))('%s', (_, prediction) => {
    const moment = momentOf(prediction);
    const shown = (line: number) => moment.lines.find((each) => each.line === line);

    it('pauses on a block the guest’s order really runs, and goes on to another', () => {
      expect(moment.phrase).toBeTruthy();
      expect(shown(prediction.after), 'the block just run is on show').toBeDefined();
      expect(moment.next).not.toBe(prediction.after);
    });

    it('offers what runs next among blocks that read apart', () => {
      expect(prediction.choices).toContain(moment.next);
      expect(prediction.choices).not.toContain(prediction.after);
      expect(new Set(prediction.choices).size).toBe(prediction.choices.length);
      const blocks = prediction.choices.map((line) => shown(line)?.command);
      expect(blocks.every(Boolean), 'every choice is on show').toBe(true);
      expect(new Set(blocks).size, 'no two choices read the same').toBe(blocks.length);
    });
  });
});
