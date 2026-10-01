import { describe, expect, it } from 'vitest';
import { acts, actIndexFor } from '../../../src/shell/rail/acts';
import { levels } from '../../../src/data';

describe('acts on the order rail', () => {
  it('hang every shift on exactly one ticket, in order', () => {
    expect(acts[0].from).toBe(0);
    for (const [i, act] of acts.entries()) {
      expect(act.to).toBeGreaterThan(act.from);
      if (i) expect(act.from).toBe(acts[i - 1].to);
    }
    expect(acts.at(-1)!.to).toBe(levels.length);
    expect(actIndexFor(levels.length - 1)).toBe(acts.length - 1);
  });
});
