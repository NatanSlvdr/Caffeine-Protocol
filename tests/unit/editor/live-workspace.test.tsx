import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  it('keeps the player’s place when Escape steps out of a field', () => {
    const drafts = { 2: { query: lessons[2].solution, prep: '', floor: '' } };
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2, robotDrafts: drafts });
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    // A block's number field hands focus back to its block.
    const tiles = screen.getAllByLabelText(/^Block \d+ tiles$/)[0];
    tiles.focus();
    fireEvent.keyDown(tiles, { key: 'Escape' });
    expect(document.activeElement).toBe(tiles.closest('[data-line]'));
    expect(window.location.hash).toBe('#/shift/3');
    unmount();
    // The text view hands it to the routine's robot tab.
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 2,
      selected: 2,
      robotDrafts: drafts,
      settings: { ...save.settings, text_editor: true },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const text = screen.getByLabelText('Routine text');
    text.focus();
    fireEvent.keyDown(text, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { selected: true }));
    expect(window.location.hash).toBe('#/shift/3');
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
  it('acts once on a held Escape or Run shortcut', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    // Skipping the intro with a held Escape stays on the shift.
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape', repeat: true });
    expect(window.location.hash).toBe('#/shift/3');
    // Out of service, the way back names Esc as its shortcut; in service, Esc stops instead.
    const back = screen.getByRole('button', { name: 'Campaign Shift 03' });
    expect(back.getAttribute('aria-keyshortcuts')).toBe('Escape');
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true, repeat: true });
    expect(screen.getByRole('button', { name: /Stop & edit/ })).toBeTruthy();
    expect(back.hasAttribute('aria-keyshortcuts')).toBe(false);
    // Stopping with a held Escape doesn't carry on out of the shift.
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape', repeat: true });
    expect(window.location.hash).toBe('#/shift/3');
    expect(screen.getByRole('button', { name: /Run service/ })).toBeTruthy();
  });
  it('runs on the shortcut from a block’s own menus too', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    const program = screen.getByRole('region', { name: /routine/i });
    const menu = program.querySelector<HTMLElement>('[role="combobox"]')!;
    menu.focus();
    // Escape on a closed menu is the menu's own, and never leaves the shift.
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(window.location.hash).toBe('#/shift/3');
    fireEvent.keyDown(menu, { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('button', { name: /Stop & edit/ })).toBeTruthy();
  });
  it('closes an open block menu on Escape, and steps out of a closed one to its block', () => {
    const drafts = { 2: { query: lessons[2].solution, prep: '', floor: '' } };
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2, robotDrafts: drafts });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const menus = [...document.querySelectorAll<HTMLElement>('[data-line] [role="combobox"]')];
    // Both kinds: the drink list on Write and the compass on Move.
    const compass = (menu: HTMLElement) => !!menu.parentElement?.classList.contains('direction-select');
    expect(menus.some(compass)).toBe(true);
    expect(menus.some((menu) => !compass(menu))).toBe(true);
    for (const menu of menus) {
      menu.focus();
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      expect(menu.getAttribute('aria-expanded')).toBe('true');
      fireEvent.keyDown(menu, { key: 'Escape' });
      expect(menu.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(menu);
      fireEvent.keyDown(menu, { key: 'Escape' });
      expect(document.activeElement).toBe(menu.closest('[data-line]'));
      expect(window.location.hash).toBe('#/shift/3');
    }
  });
  it('puts a block lifted from the keyboard back on Escape, and stays on the shift', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    const row = document.querySelector<HTMLElement>('[data-line="1"]')!;
    row.focus();
    fireEvent.keyDown(row, { key: ' ', code: 'Space' });
    // The drag listens for its keys a moment after the lift.
    act(() => {
      vi.advanceTimersByTime(20);
    });
    fireEvent.keyDown(row, { key: 'Escape', code: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(screen.getByText('Cancelled. Block 2 (take up) stays where it was.')).toBeTruthy();
    expect(window.location.hash).toBe('#/shift/3');
  });
  it('tells a screen reader that service started, paused and locked the code', () => {
    open();
    const status = screen.getByRole('group', { name: 'Simulation controls' }).querySelector('[role="status"]')!;
    expect(status.textContent).toBe('Service running, round 1 of 3. The routines are locked until it stops.');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    expect(status.textContent).toBe('Service paused.');
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(status.textContent).toBe('');
  });
  it('counts the rounds of guests a shift sends in', () => {
    open();
    const toolbar = screen.getByRole('group', { name: 'Simulation controls' });
    const status = toolbar.querySelector('[role="status"]')!;
    expect(within(toolbar).getByText('Round 1 of 3')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '12' } });
    for (let i = 0; i < 120 && !within(toolbar).queryByText('Round 2 of 3'); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    expect(status.textContent).toBe('Service running, round 2 of 3. The routines are locked until it stops.');
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(within(toolbar).queryByText(/^Round/)).toBeNull();
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
      'Query’s routine goes back to how it was when this shift opened. Undo (Ctrl Z) brings your version back.',
    );
    expect(text(false)).toBe(
      'Query’s routine goes back to how it was when this shift opened; the other robots keep theirs. Undo (Ctrl Z) brings your version back.',
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
    // The greyed-out text editor switch says why too.
    const text = screen.getByRole('checkbox', { name: 'Text editor' });
    expect(text.hasAttribute('disabled')).toBe(true);
    expect(text.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(text.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Not on this shift: it’s watch-only, so there’s no routine to show.',
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
  it('puts the crew’s reaction away when the service runs again from under it', () => {
    open();
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '12' } });
    for (let i = 0; i < 120 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    expect(screen.getByRole('dialog', { name: 'Dialogue' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('button', { name: /Stop & edit/ })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    // Escape stops the new run; it doesn't reach for the old run's receipt.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /Run service/ })).toBeTruthy();
    expect(screen.queryByText('Service complete')).toBeNull();
  });
  it('keeps the crew’s cheer when a robot’s camera is picked during the pull-back', () => {
    open();
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '12' } });
    for (let i = 0; i < 1200 && !screen.queryByRole('button', { name: /Run service/ }); i++)
      act(() => {
        vi.advanceTimersByTime(100);
      });
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    const cameras = within(screen.getByRole('group', { name: 'Camera view' }));
    fireEvent.click(cameras.getByRole('button', { name: /Query’s counter/ }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('dialog', { name: 'Dialogue' })).toBeTruthy();
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
  it('carries on from the block where the service stopped once the crew has had its say', () => {
    open('LISTEN\nITEM coffee');
    for (let i = 0; i < 30 && !screen.queryByRole('button', { name: 'Skip' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    // Tabbed to and pressed, the button goes with the reaction.
    const skip = screen.getByRole('button', { name: 'Skip' });
    skip.focus();
    fireEvent.click(skip);
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      'Drag block 2 (write coffee), where the service stopped',
    );
  });
  it('closes the crew’s reaction on Escape, as its Skip button says, before leaving the shift', () => {
    open('LISTEN\nITEM coffee');
    for (let i = 0; i < 30 && !screen.queryByRole('button', { name: 'Skip' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    // Focus back in the code, outside the reaction.
    screen.getByRole('button', { name: /^Drag block 1 / }).focus();
    // Only one button claims Escape at a time: the reaction's Skip, then the way back to the campaign.
    const back = screen.getByRole('button', { name: /^Campaign/ });
    expect(back.hasAttribute('aria-keyshortcuts')).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(window.location.hash).toBe('#/shift/3');
    expect(back.getAttribute('aria-keyshortcuts')).toBe('Escape');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/campaign');
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
    expect(screen.getByText(/goes back to how it was/).textContent).toMatch(/opened\. Undo/);
    fireEvent.click(screen.getByRole('button', { name: 'Reset routine' }));
    expect([...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains('failure'))).toBeUndefined();
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    expect(screen.getByTestId('cafe').getAttribute('data-service-view')).toBe('false');
    expect(savedStars()['2']).toBeUndefined();
  });
});

describe('the failure card', () => {
  // Shift 4 brings tea; this routine writes coffee for everyone, so the first guest who wants tea gets the wrong drink.
  const failing = lessons[3].solution.replace('ITEM tea', 'ITEM coffee');
  const card = () => screen.queryByRole('region', { name: /^Query stopped/ });
  const failedBlock = () =>
    [...document.querySelectorAll<HTMLElement>('.block[data-line]')].find((e) => e.classList.contains('failure'));
  function failRun() {
    window.location.hash = '/shift/4';
    seedLocalStorage({
      ...makeSave(),
      unlocked: 3,
      selected: 3,
      robotDrafts: { 3: { query: failing, prep: '', floor: '' } },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
  }

  it('keeps the failed guest, the difference, and the next step beside the code once the crew is done', () => {
    failRun();
    // The crew tells it first; the card doesn't talk over them.
    expect(card()).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    const kept = card()!;
    expect(kept.getAttribute('aria-labelledby')).toBeTruthy();
    expect(within(kept).getByText('Query stopped').textContent).toBe('Query stopped · Round 1 · Guest 2');
    expect(kept.textContent).toContain('“tea”');
    const row = within(kept).getByRole('row', { name: /Drink/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Tea', 'Coffee']);
    expect(within(kept).getByRole('columnheader', { name: 'Ordered' })).toBeTruthy();
    expect(within(kept).getByRole('columnheader', { name: 'Handed over' })).toBeTruthy();
    expect(kept.textContent).toContain('Check what the order says before you write the drink.');
    // It folds away to its title, and opens again.
    const toggle = within(kept).getByRole('button', { name: /^Query stopped/ });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(within(kept).queryByRole('table')).toBeNull();
    fireEvent.click(toggle);
    expect(within(kept).getByRole('table')).toBeTruthy();
  });

  it('shows where it stopped, goes stale on an edit, comes back on undo, and leaves when the next run starts', () => {
    failRun();
    fireEvent.keyDown(window, { key: 'Escape' });
    document.body.focus();
    fireEvent.click(within(card()!).getByRole('button', { name: 'Show where Query stopped' }));
    expect(document.activeElement).toBe(failedBlock());
    const last = [...document.querySelectorAll<HTMLElement>('.block[data-line]')].at(-1)!;
    last.focus();
    fireEvent.keyDown(last, { key: 'Delete' });
    // The routine moved on: the card is a record of the last run now, and nothing in the code is marked.
    expect(card()!.textContent).toContain('From your last run');
    expect(within(card()!).queryByRole('button', { name: /Show where/ })).toBeNull();
    expect(failedBlock()).toBeUndefined();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(card()!.textContent).not.toContain('From your last run');
    expect(failedBlock()).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    expect(card()).toBeNull();
  });
});

describe('undo and redo', () => {
  const draft = 'LISTEN\nIF tea IN CUSTOMER SPEECH\n  WRITE tea\nEND\nDEPOSIT RIGHT';
  function openDraft(text = false) {
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 2,
      selected: 2,
      robotDrafts: { 2: { query: draft, prep: '', floor: '' } },
      settings: { ...save.settings, text_editor: text },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  }
  const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).robotDrafts['2'].query;
  const undoButton = () => screen.getByRole('button', { name: 'Undo' });
  const redoButton = () => screen.getByRole('button', { name: 'Redo' });

  it('brings back a deleted group, and redoes the deletion', () => {
    openDraft();
    expect(undoButton().hasAttribute('disabled')).toBe(true);
    const group = document.querySelector<HTMLElement>('.block[data-line="1"]')!;
    group.focus();
    fireEvent.keyDown(group, { key: 'Delete' });
    expect(saved()).toBe('LISTEN\nDEPOSIT RIGHT');
    undoButton().focus();
    fireEvent.click(undoButton());
    expect(saved()).toBe(draft);
    expect(screen.getByText('Undid an edit to Query’s routine.')).toBeTruthy();
    // Undo has nothing left: focus moves to Redo instead of falling to the page.
    expect(document.activeElement).toBe(redoButton());
    fireEvent.click(redoButton());
    expect(saved()).toBe('LISTEN\nDEPOSIT RIGHT');
  });
  it('undoes a reset and a worked example from the keyboard', () => {
    openDraft();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset Query’s routine/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset routine' }));
    expect(saved()).not.toBe(draft);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(saved()).toBe(draft);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal worked example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this example' }));
    fireEvent.click(screen.getByRole('button', { name: /Replace my edits/ }));
    expect(saved()).toBe(lessons[2].solution);
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(saved()).toBe(draft);
    fireEvent.keyDown(window, { key: 'Z', metaKey: true, shiftKey: true });
    expect(saved()).toBe(lessons[2].solution);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(saved()).toBe(lessons[2].solution);
  });
  it('undoes a burst of typing as one step and leaves the browser’s own undo out', () => {
    openDraft(true);
    const text = screen.getByLabelText<HTMLTextAreaElement>('Routine text');
    text.focus();
    for (const typed of ['LISTEN x', 'LISTEN xy', 'LISTEN xyz'])
      fireEvent.change(text, { target: { value: draft.replace('LISTEN', typed) } });
    const shortcut = fireEvent.keyDown(text, { key: 'z', ctrlKey: true });
    expect(shortcut).toBe(false);
    expect(text.value).toBe(draft);
    // The caret goes back to where the change was, not to the end of the routine.
    expect(text.selectionStart).toBe('LISTEN'.length);
  });
  it('says when there is nothing to undo, and locks history during a service', () => {
    openDraft();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(screen.getByText('Nothing to undo in Query’s routine.')).toBeTruthy();
    const group = document.querySelector<HTMLElement>('.block[data-line="1"]')!;
    group.focus();
    fireEvent.keyDown(group, { key: 'Delete' });
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    expect(undoButton().hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(saved()).toBe('LISTEN\nDEPOSIT RIGHT');
  });
});
