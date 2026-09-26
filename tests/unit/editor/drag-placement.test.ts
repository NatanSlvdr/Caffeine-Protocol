import { describe, expect, it } from 'vitest';
import { keyboardDropSlot, pickDropSlot, settleDropSlots } from '../../../src/domain/dragPlacement';
import type { DropSlot } from '../../../src/domain/dragPlacement';
import { placeBlock } from '../../../src/domain/visualProgram';

const slot = (at: number, y: number, left = 48, alternative = false): DropSlot => ({
  id: (alternative ? 'else:' : 'gap:') + at,
  at,
  left,
  top: y - 6,
  height: 12,
  alternative,
});
describe('stable insertion-based dragging', () => {
  it('puts a block back through the slot above it, since its own trailing slot collapses with it', () => {
    const slots = [slot(0, 0), slot(1, 51), slot(2, 102), slot(3, 153)];
    const drag = { from: 0, end: 0, command: 'TICKET' };
    const back = pickDropSlot({ x: 48, y: 30 }, slots, drag);
    const below = pickDropSlot({ x: 48, y: 96 }, slots, drag);
    expect(back?.at).toBe(0);
    expect(below?.at).toBe(2);
    expect(placeBlock('TICKET\nITEM coffee\nSUBMIT', 'TICKET', below!.at, 0)).toBe('ITEM coffee\nTICKET\nSUBMIT');
  });
  it('moves up and appends at the bottom with the same insertion semantics', () => {
    const slots = [slot(0, 0), slot(1, 51), slot(2, 102), slot(3, 153)];
    expect(pickDropSlot({ x: 48, y: -10 }, slots, { from: 2, end: 2, command: 'SUBMIT' })?.at).toBe(0);
    expect(pickDropSlot({ x: 48, y: 230 }, slots, { from: 0, end: 0, command: 'TICKET' })?.at).toBe(3);
    expect(placeBlock('TICKET\nITEM coffee\nSUBMIT', 'TICKET', 3, 0)).toBe('ITEM coffee\nSUBMIT\nTICKET');
  });
  it('keeps the highlighted slot stable near a midpoint, then switches decisively', () => {
    const slots = [slot(1, 50), slot(2, 100)];
    expect(pickDropSlot({ x: 48, y: 76 }, slots, undefined, 'gap:1')?.at).toBe(1);
    expect(pickDropSlot({ x: 48, y: 80 }, slots, undefined, 'gap:1')?.at).toBe(2);
    expect(pickDropSlot({ x: 48, y: 74 }, slots, undefined, 'gap:2')?.at).toBe(2);
  });
  it('uses horizontal intent to distinguish inside a branch from after the entire branch', () => {
    const slots = [slot(3, 100, 90), slot(4, 100, 48)];
    expect(pickDropSlot({ x: 90, y: 100 }, slots)?.at).toBe(3);
    expect(pickDropSlot({ x: 48, y: 100 }, slots)?.at).toBe(4);
  });
  it('never targets the interior of the scope being dragged', () => {
    const slots = [slot(1, 0), slot(2, 50), slot(3, 100), slot(4, 150), slot(5, 200), slot(6, 250)];
    const drag = { from: 1, end: 4, command: 'IF tea' };
    expect(pickDropSlot({ x: 48, y: 100 }, slots, drag)?.at).toBe(1);
    expect(pickDropSlot({ x: 48, y: 175 }, slots, drag)?.at).toBe(6);
  });
  it("still offers the Else branch that shares the dragged group's trailing line", () => {
    expect(
      pickDropSlot({ x: 48, y: 50 }, [slot(1, 50), slot(1, 50, 48, true)], { from: 0, end: 0, command: 'TICKET' })?.id,
    ).toBe('else:1');
  });
  it('routes ELSE only to another conditional alternative and handles no valid target', () => {
    const drag = { from: 2, end: 3, command: 'ELSE' };
    expect(pickDropSlot({ x: 48, y: 50 }, [slot(0, 0), slot(6, 100, 200, true)], drag)?.id).toBe('else:6');
    expect(pickDropSlot({ x: 48, y: 50 }, [slot(0, 0)], drag)).toBeUndefined();
    expect(pickDropSlot({ x: 48, y: 50 }, [])).toBeUndefined();
  });
  it('supports one-slot keyboard movement and horizontal branch selection', () => {
    const slots = [slot(0, 0), slot(1, 51), slot(2, 102, 90), slot(3, 102, 48)];
    expect(keyboardDropSlot('ArrowDown', { x: 48, y: 0 }, slots)?.at).toBe(1);
    expect(keyboardDropSlot('ArrowUp', { x: 48, y: 102 }, slots)?.at).toBe(1);
    expect(keyboardDropSlot('ArrowRight', { x: 48, y: 102 }, slots)?.at).toBe(2);
    expect(keyboardDropSlot('ArrowLeft', { x: 90, y: 102 }, slots)?.at).toBe(3);
    // A block left a few pixels below its slot still moves up on the next press.
    expect(keyboardDropSlot('ArrowUp', { x: 48, y: 107 }, slots, undefined, 'gap:3')?.at).toBe(1);
  });
});

const edge = (at: number, top: number, left = 48): DropSlot => ({
  id: 'gap:' + at,
  at,
  left,
  top,
  height: 0,
  alternative: false,
});
describe('settling slots against the landing preview', () => {
  it('scores slots beneath a preview as if it were lifted out, so a resting block keeps its target', () => {
    // gap:2 shows a 40px preview at y=100, which pushed gap:3 and gap:4 down by 40.
    const settled = settleDropSlots([edge(1, 60), edge(2, 100), edge(3, 180), edge(4, 220)], { top: 100, shift: 40 });
    expect(settled.map((s) => s.top)).toEqual([60, 100, 140, 180]);
    expect(pickDropSlot({ x: 48, y: 100 }, settled, undefined, 'gap:2')?.id).toBe('gap:2');
  });
  it('swaps with a neighbour after the same half-row of travel up as down', () => {
    const settled = settleDropSlots([edge(1, 60), edge(2, 100), edge(3, 180), edge(4, 220)], { top: 100, shift: 40 });
    expect(pickDropSlot({ x: 48, y: 116 }, settled, undefined, 'gap:2')?.id).toBe('gap:2');
    expect(pickDropSlot({ x: 48, y: 84 }, settled, undefined, 'gap:2')?.id).toBe('gap:2');
    expect(pickDropSlot({ x: 48, y: 126 }, settled, undefined, 'gap:2')?.id).toBe('gap:3');
    expect(pickDropSlot({ x: 48, y: 74 }, settled, undefined, 'gap:2')?.id).toBe('gap:1');
  });
  it('leaves slots alone when nothing is being previewed', () => {
    const slots = [edge(1, 60), edge(2, 100)];
    expect(settleDropSlots(slots)).toBe(slots);
    expect(settleDropSlots(slots, { top: 60, shift: 0 })).toBe(slots);
  });
  it('does not keep a target that is no longer valid', () => {
    const slots = [edge(1, 50), edge(2, 100), edge(3, 150), edge(4, 200)];
    expect(pickDropSlot({ x: 48, y: 100 }, slots, { from: 0, end: 2, command: 'IF tea' }, 'gap:2')?.id).toBe('gap:4');
  });
  it('nests by the block edge past mid-indent, with a small band against flicker', () => {
    const inner = edge(10, 300, 90),
      outer = edge(11, 300, 48);
    expect(pickDropSlot({ x: 48, y: 300 }, [inner, outer])?.id).toBe('gap:11');
    expect(pickDropSlot({ x: 72, y: 300 }, [inner, outer], undefined, 'gap:11')?.id).toBe('gap:11');
    expect(pickDropSlot({ x: 78, y: 300 }, [inner, outer], undefined, 'gap:11')?.id).toBe('gap:10');
    expect(pickDropSlot({ x: 66, y: 300 }, [inner, outer], undefined, 'gap:10')?.id).toBe('gap:10');
    expect(pickDropSlot({ x: 60, y: 300 }, [inner, outer], undefined, 'gap:10')?.id).toBe('gap:11');
  });
});

describe('moving an existing JUMP preserves its destination', () => {
  const positionsOf = (code: string) =>
    code
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('POSITION '));
  const jumpsOf = (code: string) =>
    code
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('JUMP '));
  const expectNoOrphans = (code: string) => {
    const positions = positionsOf(code),
      jumps = jumpsOf(code);
    for (const p of positions) expect(jumps).toContain('JUMP ' + p.slice(9));
    for (const j of jumps) expect(positions).toContain('POSITION ' + j.slice(5));
  };
  it('moves JUMP above its target row without allocating a fresh POSITION', () => {
    const source = 'POSITION listen\nLISTEN\nITEM coffee\nJUMP listen';
    const moved = placeBlock(source, 'JUMP listen', 1, 3);
    expect(moved).toBe('POSITION listen\nJUMP listen\nLISTEN\nITEM coffee');
    expect(moved).not.toContain('jump_1');
    expect(positionsOf(moved)).toEqual(['POSITION listen']);
    expect(jumpsOf(moved)).toEqual(['JUMP listen']);
    expectNoOrphans(moved);
  });
  it('moves JUMP below its target row without allocating a fresh POSITION', () => {
    const source = 'POSITION listen\nJUMP listen\nLISTEN\nITEM coffee';
    const moved = placeBlock(source, 'JUMP listen', 4, 1);
    expect(moved).toBe('POSITION listen\nLISTEN\nITEM coffee\nJUMP listen');
    expect(moved).not.toContain('jump_1');
    expect(positionsOf(moved)).toEqual(['POSITION listen']);
    expect(jumpsOf(moved)).toEqual(['JUMP listen']);
    expectNoOrphans(moved);
  });
  it('moves JUMP out of a branch across valid scopes without orphaning its POSITION', () => {
    const source = 'POSITION listen\nLISTEN\nIF tea IN CUSTOMER SPEECH\nJUMP listen\nEND\nITEM coffee';
    const moved = placeBlock(source, 'JUMP listen', 5, 3);
    expect(moved).not.toContain('jump_1');
    expect(moved).toContain('JUMP listen');
    expect(moved).toContain('POSITION listen');
    expect(positionsOf(moved)).toEqual(['POSITION listen']);
    expect(jumpsOf(moved)).toEqual(['JUMP listen']);
    expectNoOrphans(moved);
  });
  it('moves JUMP into a branch across valid scopes without orphaning its POSITION', () => {
    const source = 'POSITION listen\nLISTEN\nIF tea IN CUSTOMER SPEECH\nITEM coffee\nEND\nJUMP listen';
    const moved = placeBlock(source, 'JUMP listen', 4, 5);
    expect(moved).not.toContain('jump_1');
    expect(moved).toContain('JUMP listen');
    expect(moved).toContain('POSITION listen');
    expect(positionsOf(moved)).toEqual(['POSITION listen']);
    expect(jumpsOf(moved)).toEqual(['JUMP listen']);
    expectNoOrphans(moved);
  });
  it('still allocates a fresh POSITION only for genuinely new JUMPs', () => {
    const source = 'POSITION listen\nLISTEN\nJUMP listen';
    const inserted = placeBlock(source, 'JUMP listen', 3);
    expect(inserted).toContain('JUMP jump_1');
    expect(inserted).toContain('POSITION jump_1');
    expect(inserted).toContain('JUMP listen');
    expectNoOrphans(inserted);
  });
});
