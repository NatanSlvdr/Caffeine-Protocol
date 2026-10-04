import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelpModal } from '../../../src/features/workspace/modals/HelpModal';
import { levels } from '../../../src/data';

const lesson = { note: 'Note', solution: 'serve' };
const open = (source: string, running = false, onUseExample = vi.fn()) =>
  render(
    <HelpModal
      index={2}
      title="Shift"
      lesson={lesson}
      brief={{ story: 'Story', objective: 'Goal' }}
      level={levels[2]}
      role="query"
      source={source}
      opening="take_order"
      observation={false}
      running={running}
      showSolution
      onToggleSolution={() => {}}
      onUseExample={onUseExample}
      onReplayIntro={() => {}}
      onClose={() => {}}
    />,
  );
const help = (source: string, running = false) => {
  const onUseExample = vi.fn();
  open(source, running, onUseExample);
  fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
  return onUseExample;
};

describe('worked example', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });
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
