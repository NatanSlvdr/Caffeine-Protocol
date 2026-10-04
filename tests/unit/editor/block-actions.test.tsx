import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Harness, currentSource as source } from '../../helpers/editorHarness';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`)!;
const toolbar = () => screen.getByRole('group', { name: /^Block \d+$/ });
const press = (label: string) => fireEvent.click(within(toolbar()).getByRole('button', { name: label }));

describe('the picked block’s buttons', () => {
  it('copy a block, or a group whole, just below it, and keep the copy picked', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nEND\nDEPOSIT RIGHT'} />);
    fireEvent.click(block(4));
    press('Copy');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nDEPOSIT RIGHT\nDEPOSIT RIGHT');
    expect(said()).toBe('Copied block 4 (deposit right). The copy is block 5.');
    expect(block(5).classList.contains('picked')).toBe(true);
    // Focus is back on the button, in the toolbar now beside the copy.
    expect(document.activeElement).toBe(within(toolbar()).getByRole('button', { name: 'Copy' }));
    expect(toolbar().getAttribute('aria-label')).toBe('Block 5');

    fireEvent.click(block(1));
    press('Copy');
    expect(source()).toBe(
      'LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nDEPOSIT RIGHT\nDEPOSIT RIGHT',
    );
    expect(said()).toBe('Copied block 2 (if tea in orders) and its group. The copy is block 4.');
  });

  it('won’t copy a jump’s landing spot, and says why', () => {
    render(<Harness initial={'POSITION listen\nLISTEN\nJUMP listen'} />);
    fireEvent.click(block(0));
    const copy = within(toolbar()).getByRole('button', { name: 'Copy' });
    expect(copy.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(copy);
    expect(source()).toBe('POSITION listen\nLISTEN\nJUMP listen');
    expect(said()).toBe(
      'Block 1 can’t be copied: a jump lands in only one place, so add a new jump from the library instead.',
    );
    // The jump itself can be copied: both go to the same place.
    fireEvent.click(block(2));
    press('Copy');
    expect(source()).toBe('POSITION listen\nLISTEN\nJUMP listen\nJUMP listen');
  });

  it('move a block a step at a time, past a whole group and over a group’s edges', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nEND\nDEPOSIT RIGHT'} />);
    fireEvent.click(block(4));
    press('Move up');
    expect(source()).toBe('LISTEN\nDEPOSIT RIGHT\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND');
    expect(said()).toBe('Moved block 4 (deposit right) up. It is block 2 now.');
    expect(document.activeElement).toBe(within(toolbar()).getByRole('button', { name: 'Move up' }));
    press('Move down');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nDEPOSIT RIGHT');

    // A block inside a group steps out over its edge, and a group moves whole.
    fireEvent.click(block(2));
    press('Move up');
    expect(source()).toBe('LISTEN\nTAKE UP\nIF tea IN CUSTOMER SPEECH\nEND\nDEPOSIT RIGHT');
    fireEvent.click(block(2));
    press('Move up');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\nEND\nTAKE UP\nDEPOSIT RIGHT');
    expect(said()).toBe('Moved block 3 (if tea in orders) and its group up. It is block 2 now.');
  });

  it('move a block over an else line as one step, and leave no empty else behind', () => {
    render(<Harness initial={'IF tea IN CUSTOMER SPEECH\nTAKE UP\nELSE\nDEPOSIT RIGHT\nEND\nLISTEN'} />);
    fireEvent.click(block(1));
    press('Move down');
    expect(source()).toBe('IF tea IN CUSTOMER SPEECH\nELSE\n  TAKE UP\n  DEPOSIT RIGHT\nEND\nLISTEN');
    press('Move down');
    press('Move down');
    expect(source()).toBe('IF tea IN CUSTOMER SPEECH\nELSE\n  DEPOSIT RIGHT\nEND\nTAKE UP\nLISTEN');
    fireEvent.click(block(2));
    press('Move down');
    // The else held only this block, so it goes with it; the moved block is still the picked one.
    expect(source()).toBe('IF tea IN CUSTOMER SPEECH\nEND\nDEPOSIT RIGHT\nTAKE UP\nLISTEN');
    expect(block(2).classList.contains('picked')).toBe(true);
  });

  it('say so at the top or bottom, without moving anything', () => {
    render(<Harness initial={'LISTEN\nTAKE UP'} />);
    fireEvent.click(block(0));
    const up = within(toolbar()).getByRole('button', { name: 'Move up' });
    expect(up.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(up);
    expect(source()).toBe('LISTEN\nTAKE UP');
    expect(said()).toBe('Block 1 is already at the top of the routine.');
    fireEvent.click(block(1));
    press('Move down');
    expect(said()).toBe('Block 2 is already at the bottom of the routine.');
  });

  it('remove a block and its group, and offer only that on an else', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nELSE\nTAKE UP\nEND\nDEPOSIT RIGHT'} />);
    fireEvent.click(block(3));
    expect(
      within(toolbar())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Remove']);
    press('Remove');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nDEPOSIT RIGHT');
    fireEvent.click(block(1));
    press('Remove');
    expect(source()).toBe('LISTEN\nDEPOSIT RIGHT');
    expect(said()).toBe('Removed block 2 (if tea in orders) and its group.');
    expect(document.activeElement).toBe(block(1));
  });

  it('only show for a picked block in an unlocked routine', () => {
    render(<Harness initial={'LISTEN\nTAKE UP'} locked />);
    fireEvent.click(block(0));
    expect(screen.queryByRole('group', { name: /^Block \d+$/ })).toBeNull();
  });
});
