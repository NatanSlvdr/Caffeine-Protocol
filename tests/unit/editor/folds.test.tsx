import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Editor } from '../../../src/components/Editor';
import { carryFolds } from '../../../src/components/editor/folds';
import { Harness, choose, currentSource as source, staticEditorProps } from '../../helpers/editorHarness';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`);
const foldButton = (name: string) => screen.getByRole('button', { name });
const GROUP = 'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nELSE\nDEPOSIT RIGHT\nEND\nTAKE UP';

describe('folding a group', () => {
  it('hides what’s inside, says how much, and shows it again', () => {
    render(<Harness initial={GROUP} />);
    // Only a group with blocks in it can fold.
    expect(screen.getAllByRole('button', { name: /^Fold block/ })).toHaveLength(1);
    fireEvent.click(foldButton('Fold block 2'));
    expect(said()).toBe('Folded block 2 (if tea in orders), with 3 blocks inside.');
    expect(block(2)).toBeNull();
    expect(block(4)).toBeNull();
    expect(block(1)?.getAttribute('aria-label')).toBe(
      'Drag block 2 (if tea in orders) and its group, folded with 3 blocks inside',
    );
    const unfold = foldButton('Unfold block 2');
    expect(unfold.getAttribute('aria-expanded')).toBe('false');
    expect(unfold.textContent).toBe('3');
    // The numbers below carry on as if it were open, as an editor's line numbers do.
    expect(block(6)?.getAttribute('aria-label')).toBe('Drag block 6 (take up)');
    // Tapping the button folds; it doesn't pick the block.
    expect(block(1)?.classList.contains('picked')).toBe(false);
    fireEvent.click(unfold);
    expect(said()).toBe('Unfolded block 2 (if tea in orders).');
    expect(block(2)).toBeTruthy();
  });

  it('stays folded through an edit above it and through moves', () => {
    render(<Harness initial={GROUP} />);
    fireEvent.click(foldButton('Fold block 2'));
    fireEvent.keyDown(block(0)!, { key: 'Delete' });
    expect(source()).toBe('IF tea IN CUSTOMER SPEECH\n  TAKE UP\nELSE\n  DEPOSIT RIGHT\nEND\nTAKE UP');
    expect(block(1)).toBeNull();
    // Moved with the buttons, it lands folded.
    fireEvent.click(block(5)!);
    fireEvent.click(within(screen.getByRole('group', { name: 'Block 5' })).getByRole('button', { name: 'Move up' }));
    expect(source()).toBe('TAKE UP\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nELSE\n  DEPOSIT RIGHT\nEND');
    // A neighbour moved past it leaves it folded.
    expect(block(2)).toBeNull();
    // Still picked after its move, it goes back down.
    fireEvent.click(within(screen.getByRole('group', { name: 'Block 1' })).getByRole('button', { name: 'Move down' }));
    expect(source()).toBe('IF tea IN CUSTOMER SPEECH\n  TAKE UP\nELSE\n  DEPOSIT RIGHT\nEND\nTAKE UP');
    expect(block(1)).toBeNull();
    expect(foldButton('Unfold block 1')).toBeTruthy();
  });

  it('carries folds across edits by the lines that changed', async () => {
    const before = 'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nEND\nTAKE UP';
    // A line added above moves the fold down; one below leaves it.
    expect([...carryFolds(before, 'TAKE UP\n' + before, new Set([1]))]).toEqual([2]);
    expect([...carryFolds(before, before + '\nTAKE UP', new Set([1]))]).toEqual([1]);
    // A neighbour moved past it, or a drag of the group itself, takes the fold along.
    expect([...carryFolds(before, 'IF tea IN CUSTOMER SPEECH\nTAKE UP\nEND\nLISTEN\nTAKE UP', new Set([1]))]).toEqual([
      0,
    ]);
    // A new condition keeps it; a change to a block it hides opens it.
    expect([...carryFolds(before, before.replace('tea', 'coffee'), new Set([1]))]).toEqual([1]);
    expect([...carryFolds(before, before.replace('TAKE UP\nEND', 'DEPOSIT UP\nEND'), new Set([1]))]).toEqual([]);

    render(<Harness initial={before} />);
    fireEvent.click(foldButton('Fold block 2'));
    await choose('Block 2 value', 'coffee');
    expect(source()).toBe('LISTEN\nIF coffee IN CUSTOMER SPEECH\n  TAKE UP\nEND\nTAKE UP');
    expect(block(2)).toBeNull();
  });

  it('lets go of a pick it would hide', () => {
    render(<Harness initial={GROUP} />);
    fireEvent.click(block(2)!);
    fireEvent.click(foldButton('Fold block 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Insert take up' }));
    expect(source().split('\n').at(-1)).toBe('TAKE UP');
    expect(said()).toBe('Added block 7 (take up) at the end of the routine.');
  });

  it('shows the running block or the failure inside a folded group', () => {
    const props = { role: 'query' as const, ...staticEditorProps(GROUP, { level: 21 }) };
    const { rerender } = render(<Editor {...props} />);
    fireEvent.click(foldButton('Fold block 2'));
    expect(block(4)).toBeNull();
    rerender(<Editor {...props} failureLine={4} />);
    expect(block(4)?.classList.contains('failure')).toBe(true);
    rerender(<Editor {...props} activeLine={2} />);
    expect(block(2)?.classList.contains('active')).toBe(true);
    expect(block(4)).toBeTruthy();
    // Once it moves on, the group folds back.
    rerender(<Editor {...props} activeLine={6} />);
    expect(block(2)).toBeNull();
  });
});
