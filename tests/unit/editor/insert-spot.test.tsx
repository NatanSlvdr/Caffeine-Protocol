import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Harness, choose, currentSource as source } from '../../helpers/editorHarness';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`)!;
const add = (name: string) => fireEvent.click(screen.getByRole('button', { name: `Insert ${name}` }));

describe('choosing where library blocks go', () => {
  it('adds after a tapped block, then after each one added, and marks the spot', () => {
    render(<Harness initial={'LISTEN\nMOVE RIGHT 2\nTAKE UP'} />);
    fireEvent.click(block(0));
    expect(said()).toBe(
      'New blocks go after block 1 (wait for orders). Pick it again, or press Escape, to add at the end.',
    );
    expect(block(0).classList.contains('picked')).toBe(true);
    expect(block(0).getAttribute('aria-label')).toBe('Drag block 1 (wait for orders), where new blocks go');
    expect(document.querySelectorAll('.next-spot')).toHaveLength(1);
    expect(document.querySelector('[data-drop-slot="gap:1"] .next-spot')).toBeTruthy();

    add('take up');
    expect(source()).toBe('LISTEN\nTAKE UP\nMOVE RIGHT 2\nTAKE UP');
    expect(said()).toBe('Added block 2 (take up) after block 1 (wait for orders).');
    // The next follows the one just added, so a run of taps reads in order.
    add('deposit right');
    expect(source()).toBe('LISTEN\nTAKE UP\nDEPOSIT RIGHT\nMOVE RIGHT 2\nTAKE UP');
    expect(said()).toBe('Added block 3 (deposit right) after block 2 (take up).');
    expect(block(2).classList.contains('picked')).toBe(true);
  });

  it('fills an empty branch from the top, and passes over a full one whole', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nEND\nTAKE UP'} />);
    fireEvent.click(block(1));
    expect(said()).toMatch(/^New blocks go inside block 2 \(if tea in orders\)\./);
    expect(screen.getByText('The next block goes here')).toBeTruthy();
    add('take up');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nTAKE UP');
    expect(said()).toBe('Added block 3 (take up) inside block 2 (if tea in orders).');
    // Picking the branch again, now it has a block in it, carries on below the whole group.
    fireEvent.click(block(1));
    add('deposit right');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nDEPOSIT RIGHT\nTAKE UP');
    expect(said()).toBe('Added block 4 (deposit right) after block 2 (if tea in orders) and its group.');
  });

  it('fills an else branch from its top', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\nELSE\nTAKE UP\nEND'} />);
    fireEvent.click(block(3));
    add('deposit right');
    expect(source()).toBe('LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nELSE\n  DEPOSIT RIGHT\n  TAKE UP\nEND');
    expect(said()).toBe('Added block 5 (deposit right) inside block 4 (else).');
  });

  it('goes back to the end on a second tap, on Escape, or once the routine changes another way', () => {
    render(<Harness initial={'LISTEN\nMOVE RIGHT 2\nTAKE UP'} />);
    fireEvent.click(block(0));
    fireEvent.click(block(0));
    expect(said()).toBe('New blocks go at the end of the routine again.');
    expect(document.querySelector('.picked, .next-spot')).toBeNull();

    // From the keyboard, Enter picks and Escape lets go.
    fireEvent.keyDown(block(1), { key: 'Enter' });
    expect(said()).toMatch(/^New blocks go after block 2 \(move right 2\)\./);
    fireEvent.keyDown(block(1), { key: 'Escape' });
    expect(said()).toBe('New blocks go at the end of the routine again.');

    // A removal moves the lines the pick was made against, so the next block goes on the end.
    fireEvent.click(block(0));
    fireEvent.keyDown(block(1), { key: 'Delete' });
    add('deposit right');
    expect(source()).toBe('LISTEN\nTAKE UP\nDEPOSIT RIGHT');
    expect(said()).toBe('Added block 3 (deposit right) at the end of the routine.');
  });

  it('leaves a block’s own values to their menus', async () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nEND'} />);
    await choose('Block 2 value', 'coffee');
    expect(document.querySelector('.picked')).toBeNull();
    add('take up');
    expect(source()).toBe('LISTEN\nIF coffee IN CUSTOMER SPEECH\nEND\nTAKE UP');
  });

  it('counts a new jump’s destination, which goes on top', () => {
    render(<Harness initial={'LISTEN\nTAKE UP'} />);
    fireEvent.click(block(0));
    add('jump listen');
    expect(source()).toBe('POSITION listen\nLISTEN\nJUMP listen\nTAKE UP');
    expect(said()).toBe('Added block 3 (jump listen) after block 2 (wait for orders).');
    add('deposit right');
    expect(source()).toBe('POSITION listen\nLISTEN\nJUMP listen\nDEPOSIT RIGHT\nTAKE UP');
  });

  it('leaves a locked routine’s blocks unpicked', () => {
    render(<Harness initial={'LISTEN\nTAKE UP'} locked />);
    fireEvent.click(block(0));
    fireEvent.keyDown(block(0), { key: 'Enter' });
    expect(document.querySelector('.picked')).toBeNull();
  });
});
