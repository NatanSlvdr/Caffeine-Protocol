import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '../../../src/components/Editor';
import { scopeAround } from '../../../src/components/editor/textScope';
import { staticEditorProps } from '../../helpers/editorHarness';

const ROUTINE = [
  'LISTEN',
  'IF tea IN CUSTOMER SPEECH',
  '  FOR item IN ORDER',
  '    TAKE UP',
  '  END',
  'ELSE',
  '  DEPOSIT RIGHT',
  'END',
  'TAKE UP',
];
const marks = () =>
  [...document.querySelectorAll('.code-text-lines > div')].map((line) =>
    line.classList.contains('scope-edge') ? 'edge' : line.classList.contains('in-scope') ? 'in' : '',
  );

describe('matching the group around the caret in the text view', () => {
  it('finds the innermost closed group, with its Else', () => {
    expect(scopeAround(ROUTINE, 3)).toEqual([2, 4]);
    expect(scopeAround(ROUTINE, 2)).toEqual([2, 4]);
    expect(scopeAround(ROUTINE, 6)).toEqual([1, 5, 7]);
    expect(scopeAround(ROUTINE, 5)).toEqual([1, 5, 7]);
    // Outside every group, or in one not closed yet, there's nothing to match.
    expect(scopeAround(ROUTINE, 8)).toEqual([]);
    expect(scopeAround(['LISTEN', 'IF tea IN CUSTOMER SPEECH', '  TAKE UP'], 2)).toEqual([]);
    expect(scopeAround(['IF tea IN CUSTOMER SPEECH', 'IF coffee IN CUSTOMER SPEECH', 'END'], 0)).toEqual([]);
  });

  it('marks its edges and the lines between while the caret is there', () => {
    render(<Editor role="query" {...staticEditorProps(ROUTINE.join('\n'), { textMode: true, level: 21 })} />);
    const text = screen.getByRole('textbox', { name: 'Routine text' }) as HTMLTextAreaElement;
    expect(marks().every((mark) => !mark)).toBe(true);
    const caretOn = (line: number) => {
      const at = ROUTINE.slice(0, line).join('\n').length + 3;
      text.setSelectionRange(at, at);
      fireEvent.select(text);
    };
    fireEvent.focus(text);
    caretOn(6);
    expect(marks()).toEqual(['', 'edge', 'in', 'in', 'in', 'edge', 'in', 'edge', '']);
    caretOn(3);
    expect(marks()).toEqual(['', '', 'edge', 'in', 'edge', '', '', '', '']);
    // Leaving the text puts the cue away.
    fireEvent.blur(text);
    expect(marks().every((mark) => !mark)).toBe(true);
  });

  it('keeps a run’s marks alongside it', () => {
    render(
      <Editor role="query" {...staticEditorProps(ROUTINE.join('\n'), { textMode: true, level: 21 })} failureLine={3} />,
    );
    const text = screen.getByRole('textbox', { name: 'Routine text' }) as HTMLTextAreaElement;
    text.setSelectionRange(text.value.indexOf('TAKE UP'), text.value.indexOf('TAKE UP'));
    fireEvent.select(text);
    expect(document.querySelectorAll('.code-text-lines > div')[3].className).toBe('failed in-scope');
  });
});
