import { describe, expect, it } from 'vitest';
import type { Active, Over } from '@dnd-kit/core';
import { dragAnnouncements } from '../../../src/components/editor/dragAnnouncements';
import { spokenBlock } from '../../../src/domain';

// LISTEN / IF tea … / TICKET / ELSE / TAKE UP / END, as the code pane numbers them.
const rows = [
  { line: 0, command: 'LISTEN', end: 0 },
  { line: 1, command: 'IF tea IN CUSTOMER SPEECH', end: 5 },
  { line: 2, command: 'TICKET', end: 2 },
  { line: 3, command: 'ELSE', end: 4 },
  { line: 4, command: 'TAKE UP', end: 4 },
];
const say = dragAnnouncements(rows);
const active = (id: string) => ({ id }) as Active;
const over = (id: string) => ({ id }) as Over;

describe('drag announcements', () => {
  it('names blocks by the number and words shown in the code pane', () => {
    expect(say.onDragStart({ active: active('4') })).toBe('Picked up block 5 (take up).');
    expect(say.onDragStart({ active: active('library:MOVE RIGHT 1') })).toBe('Picked up a new move right 1 block.');
  });

  it('describes a spot by the block after it and the group around it', () => {
    expect(say.onDragOver!({ active: active('0'), over: over('gap:2') })).toBe(
      'Block 1 (wait for orders): before block 3 (take), inside block 2 (if tea in orders).',
    );
    expect(say.onDragOver!({ active: active('0'), over: over('gap:5') })).toBe(
      'Block 1 (wait for orders): at the end, inside block 4 (else).',
    );
    expect(say.onDragEnd({ active: active('2'), over: over('gap:6') })).toBe(
      'Dropped block 3 (take) at the end of the program.',
    );
    expect(say.onDragOver!({ active: active('0'), over: over('else:4') })).toBe(
      'Block 1 (wait for orders): as a new else branch.',
    );
  });

  it('recognises the spot a block already fills, and says when nothing moved', () => {
    expect(say.onDragOver!({ active: active('2'), over: over('gap:3') })).toBe('Block 3 (take): in its current spot.');
    expect(say.onDragCancel!({ active: active('2'), over: null })).toBe(
      'Cancelled. Block 3 (take) stays where it was.',
    );
    expect(say.onDragCancel!({ active: active('library:LISTEN'), over: null })).toBe('Cancelled. Nothing was added.');
  });
});

describe('spoken block names', () => {
  it.each([
    ['LISTEN', 'wait for orders'],
    ['WAIT DIRTY', 'wait for dirty cups'],
    ['IF coffee IN CUSTOMER SPEECH', 'if coffee in orders'],
    ['IF var1 >= 2', 'if var a >= 2'],
    ['FOR item IN heard orders', 'for item in order'],
    ['STORE var2 FROM number', 'store var b = number in item'],
    ['WRITE var1 sugar', 'write var a sugar'],
    ['ITEM tea', 'write tea'],
    ['DEPOSIT RIGHT', 'deposit right'],
    ['TAKE UP', 'take up'],
    ['USE UP', 'use up'],
    ['MOVE var1', 'move to var a'],
    ['FOR var1 TIMES', 'for var a times'],
    ['STORE var2 FROM here', 'store var b = here'],
    ['STORE var1 FROM sugar', 'store var a = sugar on order'],
    ['POSITION listen', 'jump destination'],
  ])('says %s as "%s"', (command, spoken) => expect(spokenBlock(command)).toBe(spoken));
});
