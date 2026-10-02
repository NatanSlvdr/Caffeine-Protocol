import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelpModal } from '../../../src/features/workspace/modals/HelpModal';
import { levels } from '../../../src/data';

const lesson = { note: 'Note', solution: 'serve' };
const help = (source: string) => {
  const onUseExample = vi.fn();
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
      running={false}
      showSolution
      onToggleSolution={() => {}}
      onUseExample={onUseExample}
      onReplayIntro={() => {}}
      onClose={() => {}}
    />,
  );
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
      'The example replaces Query’s routine, and your edits to it are lost.',
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep my edits' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep my edits' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use this example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
    fireEvent.click(screen.getByRole('button', { name: /Replace my edits/ }));
    expect(onUseExample).toHaveBeenCalledWith('serve');
  });
});
