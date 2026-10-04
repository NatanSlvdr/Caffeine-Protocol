import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelpModal } from '../../../src/features/workspace/modals/HelpModal';
import { levels } from '../../../src/data';

const lesson = { note: 'Note', solution: 'serve' };
/** Help as the workspace holds it: the hints asked for so far outlive the slip, so a test can start at any tier. */
function Notes({ start, ...props }: { start: number } & Partial<Parameters<typeof HelpModal>[0]>) {
  const [hints, setHints] = useState(start);
  return (
    <HelpModal
      index={2}
      title="Shift"
      lesson={lesson}
      brief={{ story: 'Story', objective: 'Goal', concept: 'The idea behind it.' }}
      level={levels[2]}
      role="query"
      source="take_order"
      opening="take_order"
      observation={false}
      running={false}
      hints={hints}
      onHints={setHints}
      evidence={null}
      stale={false}
      onShowClue={() => {}}
      onUseExample={() => {}}
      onReplayIntro={() => {}}
      onClose={() => {}}
      {...props}
    />
  );
}
const open = (source: string, running = false, onUseExample = vi.fn()) =>
  render(<Notes start={3} source={source} running={running} onUseExample={onUseExample} />);
const help = (source: string, running = false) => {
  const onUseExample = vi.fn();
  open(source, running, onUseExample);
  fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
  return onUseExample;
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

describe('hints, one at a time', () => {
  it('climbs from the idea to a clue to the worked example, each only when asked', () => {
    const onShowClue = vi.fn();
    render(
      <Notes
        start={0}
        source={'LISTEN\nTAKE UP\nITEM coffee'}
        lesson={{ ...lesson, solution: 'LISTEN\nTAKE UP\nITEM tea' }}
        onShowClue={onShowClue}
      />,
    );
    expect(screen.queryByRole('list', { name: 'Hints' })).toBeNull();
    expect(document.getElementById('worked-example')).toBeNull();
    const next = screen.getByRole('button', { name: 'Remind me of the idea' });
    fireEvent.click(next);
    const hints = screen.getByRole('list', { name: 'Hints' });
    expect(
      within(hints)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['ReminderThe idea behind it.']);
    // The same button climbs on, keeping focus where the player is.
    expect(next.textContent).toBe('Give me a clue');
    fireEvent.click(next);
    const clue = within(hints).getAllByRole('listitem')[1];
    expect(clue.textContent).toBe(
      'ClueQuery’s routine follows the worked example as far as “take up”, then parts ways at “write coffee”. Show this block',
    );
    fireEvent.click(within(clue).getByRole('button', { name: 'Show this block' }));
    expect(onShowClue).toHaveBeenCalledWith({ role: 'query', line: 2 });
    expect(next.textContent).toBe('Reveal worked example');
    expect(next.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(next);
    expect(document.getElementById('worked-example')?.textContent).toBe('LISTEN\nTAKE UP\nITEM tea');
    // Hiding the example keeps the hints that came before it.
    fireEvent.click(screen.getByRole('button', { name: 'Hide worked example' }));
    expect(document.getElementById('worked-example')).toBeNull();
    expect(within(hints).getAllByRole('listitem')).toHaveLength(2);
  });

  it('leaves an observation shift to its notes', () => {
    render(<Notes start={0} observation />);
    expect(screen.queryByRole('button', { name: 'Remind me of the idea' })).toBeNull();
  });
});

describe('worked example', () => {
  it('replaces the opening routine straight away, since Reset brings it back', () => {
    expect(help('take_order\n')).toHaveBeenCalledWith('serve');
  });
  it('asks before it overwrites the player’s own edits', () => {
    const onUseExample = help('take_order\nwait');
    expect(onUseExample).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      'The example replaces Query’s routine. If you change your mind, Undo (Ctrl Z) brings your version back.',
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep my edits' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep my edits' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use this example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
    fireEvent.click(screen.getByRole('button', { name: /Replace my edits/ }));
    expect(onUseExample).toHaveBeenCalledWith('serve');
  });
  it('says when the routine already is the example', () => {
    open('serve\n', true);
    expect(screen.queryByRole('button', { name: 'Use this example' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Example in use' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Stop the service to replay the intro.')).toBeTruthy();
  });
  it('says why its buttons are greyed out mid-service', () => {
    expect(help('take_order\n', true)).not.toHaveBeenCalled();
    const note = 'Stop the service to replay the intro or use the example.';
    for (const name of ['Replay the intro', 'Use this example']) {
      const button = screen.getByRole('button', { name });
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe(note);
    }
    expect(screen.getByRole('button', { name: 'Hide worked example' }).getAttribute('aria-controls')).toBe(
      'worked-example',
    );
  });
});
