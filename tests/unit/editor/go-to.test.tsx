import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Harness } from '../../helpers/editorHarness';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`);
const PORTER =
  'POSITION listen\nLISTEN\nTAKE DOWN\nCALL deliver\nJUMP listen\nFUNCTION deliver\nMOVE RIGHT 2\nRETURN\nEND';

describe('going to where a jump or a call goes', () => {
  it('takes a jump to its landing spot and a call to its function', () => {
    render(<Harness role="floor" initial={PORTER} />);
    fireEvent.click(screen.getByRole('button', { name: /^Go to where the jump lands/ }));
    expect(document.activeElement).toBe(block(0));
    fireEvent.click(screen.getByRole('button', { name: /^Go to block 6/ }));
    expect(document.activeElement).toBe(block(5));
    // Going there doesn't pick the block it starts from.
    expect(document.querySelector('.picked')).toBeNull();
  });

  it('opens a folded group to show where the jump lands', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nPOSITION here\nTAKE UP\nEND\nJUMP here'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fold block 2' }));
    expect(block(2)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Go to where the jump lands/ }));
    expect(block(2)).toBeTruthy();
    expect(document.activeElement).toBe(block(2));
    expect(said()).toBe('Unfolded block 2 (if tea in orders) to show block 3 (jump destination here).');
  });

  it('shows no button for a jump or a call with nowhere to go', () => {
    render(<Harness role="floor" initial={'LISTEN\nCALL deliver'} />);
    expect(screen.queryByRole('button', { name: /^Go to/ })).toBeNull();
  });

  it('works in a locked routine, which can still be read', () => {
    render(<Harness role="floor" initial={PORTER} locked />);
    fireEvent.click(screen.getByRole('button', { name: /^Go to block 6/ }));
    expect(document.activeElement).toBe(block(5));
  });
});
