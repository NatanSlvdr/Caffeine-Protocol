import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '../../../src/components/Editor';

const said = () => document.querySelector('.editor-body ~ [role="status"]')?.textContent?.trim();
const help = () => document.querySelector('.text-help')?.textContent;
// Indented by hand, badly, so the text view keeps it as typed.
const MESSY = 'LISTEN\nIF tea IN CUSTOMER SPEECH\nTAKE UP\n    END\nMOVE RIGHT 2';
const TIDY = 'LISTEN\nIF tea IN CUSTOMER SPEECH\n  TAKE UP\nEND\nMOVE RIGHT 2';

function TextHarness({ initial, locked = false }: { initial: string; locked?: boolean }) {
  const [source, setSource] = useState(initial);
  return (
    <>
      <Editor
        role="query"
        source={source}
        onChange={setSource}
        level={21}
        locked={locked}
        observation={false}
        textMode
      />
      <output aria-label="Current source">{source}</output>
    </>
  );
}
const text = () => screen.getByRole('textbox', { name: 'Routine text' }) as HTMLTextAreaElement;
const source = () => screen.getByRole('status', { name: 'Current source' }).textContent;
const caret = (at: number) => {
  text().setSelectionRange(at, at);
  fireEvent.select(text());
};

describe('the text view’s tools', () => {
  it('say what the block on the caret’s line does, while the text has focus', () => {
    render(<TextHarness initial={MESSY} />);
    expect(help()).toBe('');
    fireEvent.focus(text());
    caret(MESSY.indexOf('MOVE') + 2);
    expect(help()).toMatch(/^Move Walks that many tiles in a screen direction\./);
    caret(MESSY.indexOf('IF') + 1);
    expect(help()).toMatch(/^If Runs the blocks inside only when its condition holds/);
    // An End, or a line that is no block, has nothing to say.
    caret(MESSY.indexOf('END'));
    expect(help()).toBe('');
    fireEvent.blur(text());
    expect(help()).toBe('');
  });

  it('tidy the layout as one edit, and say when there is nothing to tidy', () => {
    render(<TextHarness initial={MESSY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tidy up' }));
    expect(source()).toBe(TIDY);
    expect(said()).toBe('Laid the routine out by depth.');
    fireEvent.click(screen.getByRole('button', { name: 'Tidy up' }));
    expect(source()).toBe(TIDY);
    expect(said()).toBe('The routine is already laid out.');
  });

  it('tidy from the keyboard with the caret kept in its place in the line', () => {
    render(<TextHarness initial={MESSY} />);
    text().focus();
    caret(MESSY.indexOf('TAKE UP') + 2);
    fireEvent.keyDown(text(), { key: 'Ï', code: 'KeyF', altKey: true, shiftKey: true });
    expect(source()).toBe(TIDY);
    // Still between "TA" and "KE", two spaces further on.
    expect(text().selectionStart).toBe(TIDY.indexOf('TAKE UP') + 2);
    caret(TIDY.indexOf('END') + 1);
    fireEvent.keyDown(text(), { key: 'Ï', code: 'KeyF', altKey: true, shiftKey: true });
    expect(said()).toBe('The routine is already laid out.');
  });

  it('keep the help but not Tidy up in a routine that can’t change', () => {
    render(<TextHarness initial={MESSY} locked />);
    expect(screen.queryByRole('button', { name: 'Tidy up' })).toBeNull();
    fireEvent.focus(text());
    caret(MESSY.indexOf('MOVE'));
    expect(help()).toMatch(/^Move /);
  });
});
