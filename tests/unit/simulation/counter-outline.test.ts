import { describe, it, expect } from 'vitest';
import { counterOutlines, FURNITURE, insetOutline, type Furniture } from '@/domain';

const counter = (id: string, x: number, z: number, width = 1, depth = 1): Furniture => ({
  id,
  kind: 'counter',
  x,
  z,
  width,
  depth,
});

describe('counter outlines', () => {
  it('joins the register, back counter and handoff into one U-shaped run', () => {
    const pieces = FURNITURE.filter((f) => f.kind === 'counter' && f.id !== 'storage');
    const outlines = counterOutlines(pieces);
    expect(outlines).toHaveLength(2);
    const u = outlines.find((o) => o.some(([x]) => x === -6.5))!;
    // Eight corners: four outside, two at the inner bends of the U, two at the tips of its arms.
    expect(u).toHaveLength(8);
    expect(new Set(u.map((p) => p.join(',')))).toEqual(
      new Set(['-6.5,3.5', '-2.5,3.5', '-2.5,5.5', '-3.5,5.5', '-3.5,4.5', '-5.5,4.5', '-5.5,5.5', '-6.5,5.5']),
    );
    const equipment = outlines.find((o) => o.some(([x]) => x === 7.5))!;
    expect(new Set(equipment.map((p) => p.join(',')))).toEqual(new Set(['0.5,3.5', '7.5,3.5', '7.5,4.5', '0.5,4.5']));
  });

  it('covers every counter tile edge-to-edge, with no seam between neighbouring pieces', () => {
    const [run] = counterOutlines([counter('a', 0, 0, 2), counter('b', 2, 0), counter('c', 2, 1)]);
    expect(run).toHaveLength(6);
    expect(run).toContainEqual([2.5, 1.5]);
    expect(run).toContainEqual([-0.5, -0.5]);
  });

  it('pulls outside corners in and pushes inside corners out by the same distance', () => {
    const [run] = counterOutlines([counter('a', 0, 0, 2), counter('c', 1, 1)]);
    const inset = insetOutline(run, 0.1);
    expect(inset).toContainEqual([-0.4, -0.4]);
    // The inner bend of the L at (0.5, 0.5) moves diagonally into the counter.
    expect(inset).toContainEqual([0.6, 0.4]);
    expect(inset).toContainEqual([1.4, 1.4]);
  });
});
