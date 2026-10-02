import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { OptionsModal } from '../../../src/features/workspace/modals/OptionsModal';
import { ResetModal } from '../../../src/features/workspace/modals/ResetModal';

vi.mock('../../../src/components/Cafe', () => ({
  Cafe: ({ serviceView, focusRole }: { serviceView?: boolean; focusRole?: string }) => (
    <div data-testid="cafe" data-service-view={serviceView} data-focus-role={focusRole} />
  ),
}));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.location.hash = '/shift/3';
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});
function open(source = lessons[2].solution) {
  seedLocalStorage({
    ...makeSave(),
    unlocked: 2,
    selected: 2,
    robotDrafts: { 2: { query: source, prep: '', floor: '' } },
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
}
function savedStars() {
  return JSON.parse(localStorage.getItem(SAVE_KEY)!).stars;
}
describe('live workspace lifecycle', () => {
  it('steps out of a text field on Escape before leaving the shift', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    expect(document.activeElement?.textContent).toMatch(/^Next/);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    // The scene took its focused button away; focus carries on from the shift's title.
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: narrativeFor(2).title }));
    const speed = screen.getByRole('slider', { name: 'Playback speed' });
    expect(speed.getAttribute('aria-valuetext')).toMatch(/^[\d.]+× speed$/);
    speed.focus();
    fireEvent.keyDown(speed, { key: 'Escape' });
    expect(window.location.hash).toBe('#/shift/3');
    expect(document.activeElement).not.toBe(speed);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/campaign');
  });
  it('names the way back without reading out the drawn arrow and slash', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Campaign Shift 03' }));
    expect(window.location.hash).toBe('#/campaign');
  });
  it('stops a running service on Escape, and only then leaves the shift', () => {
    open();
    expect(screen.getByRole('button', { name: /Stop & edit/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/shift/3');
    expect(screen.getByRole('button', { name: /Run service/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/campaign');
  });
  it('focuses the scene on the robot selected for editing', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13 });
    window.location.hash = '/shift/14';
    render(<App />);
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('floor');
    fireEvent.click(screen.getByRole('tab', { name: 'Query' }));
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('query');
    fireEvent.click(screen.getByRole('tab', { name: 'Brew' }));
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('prep');
    fireEvent.click(screen.getByRole('tab', { name: 'Porter' }));
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('floor');
    fireEvent.click(screen.getByRole('button', { name: 'Full café' }));
    expect(screen.getByTestId('cafe').hasAttribute('data-focus-role')).toBe(false);
    fireEvent.click(screen.getByRole('tab', { name: 'Query' }));
    expect(screen.getByTestId('cafe').hasAttribute('data-focus-role')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Query’s counter' }));
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('query');
    fireEvent.click(screen.getByRole('button', { name: 'Brew’s kitchen' }));
    expect(screen.getByTestId('cafe').getAttribute('data-focus-role')).toBe('prep');
    expect(screen.getByRole('tab', { name: 'Brew' }).getAttribute('aria-selected')).toBe('true');
  });
  it('moves between robot tabs with the arrow keys, Home and End', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13 });
    window.location.hash = '/shift/14';
    render(<App />);
    const tab = (name: string) => screen.getByRole('tab', { name });
    // Only the open tab is in the Tab order.
    expect(['Query', 'Brew', 'Porter'].map((name) => tab(name).tabIndex)).toEqual([-1, -1, 0]);
    fireEvent.keyDown(tab('Porter'), { key: 'ArrowLeft' });
    expect(tab('Brew').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab('Brew'));
    fireEvent.keyDown(tab('Brew'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('Query'));
    fireEvent.keyDown(tab('Query'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Porter'));
    fireEvent.keyDown(tab('Porter'), { key: 'ArrowRight' });
    expect(tab('Query').getAttribute('aria-selected')).toBe('true');
    expect(tab('Query').tabIndex).toBe(0);
    // The code zone is the panel the tabs switch, named after the open one.
    const panel = screen.getByRole('tabpanel', { name: 'Query' });
    expect(tab('Query').getAttribute('aria-controls')).toBe(panel.id);
  });
  it('shows locked robot areas and code tabs before their unlock shifts', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    for (const name of ['Brew’s kitchen', 'Porter’s dining room'])
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
    for (const name of ['Brew', 'Porter'])
      expect(screen.getByRole('tab', { name }).hasAttribute('disabled')).toBe(true);
    const brew = screen.getByRole('tab', { name: 'Brew' });
    expect(brew.getAttribute('aria-description')).toBe('Joins the crew on Shift 09');
    expect(brew.getAttribute('title')).toBe('Brew · Joins the crew on Shift 09');
    expect(screen.getByRole('button', { name: 'Porter’s dining room' }).getAttribute('title')).toBe(
      'Porter’s dining room · Joins the crew on Shift 14',
    );
    // Greyed out is enough; there is no separate Locked badge.
    expect(screen.queryByText('Locked')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Query' }).hasAttribute('disabled')).toBe(false);
  });
  it('offers a reset only once the open routine has been edited', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const reset = screen.getByRole('button', { name: /Reset Query’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(reset.getAttribute('aria-describedby')).toBe('reset-note');
    expect(screen.getByText('Query’s routine is just as the shift opened it.')).toBeTruthy();
  });
  it('says to stop the service before resetting an edited routine', () => {
    render(
      <OptionsModal
        robot="Brew"
        pixelArt={false}
        textMode={false}
        observation={false}
        running
        edited
        onTogglePixelArt={() => {}}
        onToggleTextMode={() => {}}
        onRequestReset={() => {}}
        onClose={() => {}}
      />,
    );
    const reset = screen.getByRole('button', { name: /Reset Brew’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(reset.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Stop the service to reset Brew’s routine.',
    );
  });
  it('mentions the other robots’ routines on reset only when there are other robots', () => {
    const text = (alone: boolean) => {
      const { unmount } = render(<ResetModal robot="Query" alone={alone} onClose={() => {}} onConfirm={() => {}} />);
      const said = screen.getByText(/goes back to how it was/).textContent;
      unmount();
      return said;
    };
    expect(text(true)).toBe(
      'Query’s routine goes back to how it was when this shift opened. Your edits to it here are lost.',
    );
    expect(text(false)).toBe(
      'Query’s routine goes back to how it was when this shift opened. Your edits to it here are lost; the other robots keep theirs.',
    );
  });
  it('says why the watch-only shift has nothing to reset', () => {
    window.location.hash = '/shift/1';
    seedLocalStorage(makeSave());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const reset = screen.getByRole('button', { name: /Reset Query’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(reset.getAttribute('aria-describedby')!)?.textContent).toBe(
      'This shift is watch-only: the crew serves by hand, so there’s no routine to edit or reset.',
    );
  });
  it('offers to stop watching, not to edit, on the watch-only shift', () => {
    window.location.hash = '/shift/1';
    seedLocalStorage(makeSave());
    render(<App />);
    expect(document.querySelector('.observation-note')?.textContent).toBe(
      'No routine to write today: the crew serves this shift by hand. Query joins on Shift 02.',
    );
    fireEvent.click(screen.getByRole('button', { name: /Watch service/ }));
    expect(screen.queryByRole('button', { name: /Stop & edit/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Stop watching/ }));
    expect(screen.getByRole('button', { name: /Watch service/ })).toBeTruthy();
  });
  it('opens each shift at the playback speed the player last chose', () => {
    const save = makeSave();
    seedLocalStorage({ ...save, unlocked: 2, selected: 2, settings: { ...save.settings, speed: 4 } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const speed = screen.getByRole<HTMLInputElement>('slider', { name: 'Playback speed' });
    expect(speed.value).toBe('4');
    fireEvent.change(speed, { target: { value: '6' } });
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.speed).toBe(6);
  });
  it('awards progress and opens the receipt only after the live service finishes', () => {
    open();
    expect(savedStars()['2']).toBeUndefined();
    expect(screen.queryByText('Service complete')).toBeNull();
    expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('true');
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '12' } });
    for (let i = 0; i < 120 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    // The shift pays off first, Query keeps listening; the receipt waits until the player is done listening.
    expect(screen.getByRole('dialog', { name: 'Dialogue' }).textContent).toContain('Still listening');
    expect(screen.queryByText('Service complete')).toBeNull();
    while (screen.queryByRole('button', { name: 'Next' }))
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'See the receipt' }));
    expect(screen.getByText('Service complete')).toBeTruthy();
    expect(savedStars()['2']).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Next shift/ })).toBeTruthy();
    expect(screen.getByText('Coffee or Tea?')).toBeTruthy();
  });
  it('pauses without advancing and cancels an unfinished run without awarding progress', () => {
    open();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    act(() => {
      vi.advanceTimersByTime(120000);
    });
    expect(savedStars()['2']).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('false');
    act(() => {
      vi.advanceTimersByTime(120000);
    });
    expect(savedStars()['2']).toBeUndefined();
  });
  it('stops service on an error, holding the failed frame and error cursor until the code changes', () => {
    open('LISTEN\nITEM coffee');
    expect([...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains('failure'))).toBeUndefined();
    for (
      let i = 0;
      i < 30 && ![...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains('failure'));
      i++
    )
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    expect(
      [...document.querySelectorAll('[data-line]')]
        .find((e) => e.classList.contains('failure'))
        ?.getAttribute('data-line'),
    ).toBe('1');
    const reaction = screen.getByRole('dialog', { name: 'Dialogue' });
    expect(reaction.textContent).toContain('Write on… the counter?');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(reaction.textContent).toContain('Take the order paper');
    expect(screen.getByRole('button', { name: 'Back to the code' })).toBeTruthy();
    expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('true');
    expect(screen.queryByRole('button', { name: /Stop & edit/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Run service/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Block 2 value' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(document.body);
    fireEvent.keyDown(document.body, { key: 'Shift' });
    const failed = [...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains('failure'))!;
    expect(failed).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(failed.classList.contains('failure')).toBe(true);
    fireEvent.click(failed);
    expect(failed.classList.contains('failure')).toBe(true);
    expect(
      screen.getByRole('img', { name: 'Current instruction' }).querySelector('.execution-line-highlight'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset Query’s routine/ }));
    // Query works alone on this shift: no other routines to keep.
    expect(screen.getByText(/goes back to how it was/).textContent).toMatch(/are lost\.$/);
    fireEvent.click(screen.getByRole('button', { name: 'Reset routine' }));
    expect([...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains('failure'))).toBeUndefined();
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('false');
    expect(savedStars()['2']).toBeUndefined();
  });
});
