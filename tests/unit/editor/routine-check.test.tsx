import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '../../../src/components/Editor';
import { Harness, currentSource as source, staticEditorProps } from '../../helpers/editorHarness';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const block = (line: number) => document.querySelector<HTMLElement>(`.block[data-line="${line}"]`);
const note = () => document.querySelector('.routine-check')?.textContent;

afterEach(() => {
  vi.useRealTimers();
});

describe('the check before Run', () => {
  it('marks a block the routine would stop on, says why, and goes there', () => {
    render(<Harness initial={'LISTEN\nTAKE UP'} />);
    expect(note()).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Insert wait for orders' }));
    expect(source()).toBe('LISTEN\nTAKE UP\nLISTEN');
    expect(note()).toBe('Block 3: Use one Wait for Orders; jump back to it for continuous service.Show');
    expect(block(2)?.classList.contains('flagged')).toBe(true);
    expect(block(2)?.getAttribute('aria-label')).toBe('Drag block 3 (wait for orders), which needs a fix before Run');
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(document.activeElement).toBe(block(2));
    // Fixed, the mark and the note go.
    fireEvent.keyDown(block(2)!, { key: 'Delete' });
    expect(note()).toBeUndefined();
    expect(document.querySelector('.flagged')).toBeNull();
  });

  it('opens a folded group to show the block', () => {
    render(<Harness initial={'LISTEN\nIF tea IN CUSTOMER SPEECH\nLISTEN\nEND'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fold block 2' }));
    expect(block(2)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(document.activeElement).toBe(block(2));
    expect(said()).toBe('Unfolded block 2 (if tea in orders) to show block 3 (wait for orders).');
  });

  it('says nothing of a routine that runs, an empty one, or one it can’t change', () => {
    const { rerender } = render(<Editor role="query" {...staticEditorProps('LISTEN\nTAKE UP')} />);
    expect(note()).toBeUndefined();
    rerender(<Editor role="query" {...staticEditorProps('')} />);
    expect(note()).toBeUndefined();
    rerender(<Editor role="query" {...staticEditorProps('TAKE UP')} />);
    expect(note()).toBe('Block 1: Start with Wait for Orders, or a jump destination.Show');
    // Running, or stopped with the failure on show, the run says it instead.
    rerender(<Editor role="query" {...staticEditorProps('TAKE UP', { locked: true })} />);
    expect(note()).toBeUndefined();
    rerender(<Editor role="query" {...staticEditorProps('TAKE UP')} failureLine={0} />);
    expect(note()).toBeUndefined();
  });

  it('waits for typing to pause, then marks the line and selects it', () => {
    vi.useFakeTimers();
    const props = { role: 'query' as const, ...staticEditorProps('LISTEN\nMOVE RIG', { textMode: true, level: 21 }) };
    const { rerender } = render(<Editor {...props} />);
    // The text is checked once typing pauses, so a half-typed line is left alone.
    act(() => vi.advanceTimersByTime(500));
    rerender(<Editor {...props} source={'LISTEN\nMOVE RIGHT'} />);
    act(() => vi.advanceTimersByTime(500));
    expect(note()).toBeUndefined();
    act(() => vi.advanceTimersByTime(500));
    expect(note()).toMatch(/^Line 2: Query doesn’t know “MOVE RIGHT”\./);
    expect(document.querySelectorAll('.code-text-lines > div')[1].className).toBe('flagged');
    const text = screen.getByRole('textbox', { name: 'Routine text' }) as HTMLTextAreaElement;
    expect(text.getAttribute('aria-description')).toMatch(/^Line 2 needs a fix before Run: Query doesn’t know/);
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(document.activeElement).toBe(text);
    expect([text.selectionStart, text.selectionEnd]).toEqual([7, 17]);
  });
});
