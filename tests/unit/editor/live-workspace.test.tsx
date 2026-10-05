import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { OptionsModal } from '../../../src/features/workspace/modals/OptionsModal';
import { RestoreModal } from '../../../src/features/workspace/modals/RestoreModal';

vi.mock('../../../src/components/Cafe', () => ({
  Cafe: ({
    serviceView,
    focusRole,
    follow,
    preview,
  }: {
    serviceView?: boolean;
    focusRole?: string;
    follow?: { seed: string; guest: string };
    preview?: { role: string; kind: string; visits: readonly unknown[] };
  }) => (
    <div
      data-testid="cafe"
      data-service-view={serviceView}
      data-focus-role={focusRole}
      data-follow={follow && `${follow.seed}/${follow.guest}`}
      data-preview={preview && `${preview.role}:${preview.kind}:${preview.visits.length}`}
    />
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
/** Shift 3, with Query's routine set and the scene skipped, ready to run. */
function ready(source = lessons[2].solution, settings: Partial<ReturnType<typeof makeSave>['settings']> = {}) {
  const save = makeSave();
  seedLocalStorage({
    ...save,
    unlocked: 2,
    selected: 2,
    settings: { ...save.settings, ...settings },
    robotDrafts: { 2: { query: source, prep: '', floor: '' } },
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
}
function open(source = lessons[2].solution) {
  ready(source);
  fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
}
/** Let the service play, a second at a time, until the check holds. */
function playUntil(check: () => unknown, seconds = 60) {
  for (let i = 0; i < seconds && !check(); i++)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
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
  it('steps a paused service to the open robot’s next block, and shows what the robot knows there', () => {
    open();
    const toolbar = screen.getByRole('group', { name: 'Simulation controls' });
    const status = toolbar.querySelector('[role="status"]')!;
    const stepQuery = () => within(toolbar).getByRole('button', { name: 'Step Query' });
    const inspector = () => screen.queryByRole('complementary', { name: 'Query, paused' });
    // Stepping is for a paused service: while it plays, the button waits, and nothing is inspected.
    expect(stepQuery().hasAttribute('disabled')).toBe(true);
    expect(inspector()).toBeNull();
    // Query works alone here, so there is no one else to step to.
    expect(within(toolbar).queryByRole('button', { name: 'Next event' })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    expect(stepQuery().hasAttribute('disabled')).toBe(false);
    expect(within(inspector()!).getByText('No Vars in this routine')).toBeTruthy();
    fireEvent.click(stepQuery());
    // The step says when it stopped and what Query started there; the stand-ins in the kitchen go unsaid.
    expect(status.textContent).toBe('Round 1 · 0.0 s. Query: wait for orders, block 2.');
    const row = (name: string) => within(inspector()!).getByText(name).nextElementSibling!.textContent;
    expect(row('Doing')).toBe('Wait for ordersBlock 2');
    expect(row('Guest')).toBe('“coffee”');
    expect(row('Holding')).toBe('Nothing');
    expect(row('Loop')).toBe('Not in a loop');
    fireEvent.click(stepQuery());
    expect(status.textContent).toMatch(/^Round 1 · [1-9]\d*\.\d s\. Query: .+, block \d+\.$/);
    // Playing on puts the inspector and the step's words away.
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }));
    expect(inspector()).toBeNull();
    expect(status.textContent).toMatch(/^Service running/);
  });
  it('steps a crew to the next block any of its robots starts', () => {
    window.location.hash = '/shift/14';
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13, robotDrafts: { 13: referencePrograms(14) } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    const toolbar = screen.getByRole('group', { name: 'Simulation controls' });
    const status = toolbar.querySelector('[role="status"]')!;
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Next event' }));
    // Everyone who starts at that moment is told, in the order an order travels.
    expect(status.textContent).toMatch(
      /^Round 1 · 0\.0 s\. Query: .+\. Brew: waiting for a ticket, block \d+\. Porter: /,
    );
    expect(screen.getByRole('complementary', { name: /, paused$/ })).toBeTruthy();
  });
  it('pauses by itself as Query starts a marked block, and keeps the mark for the next run', () => {
    ready();
    const toolbar = screen.getByRole('group', { name: 'Simulation controls' });
    const status = toolbar.querySelector('[role="status"]')!;
    // A jump's landing spot starts nothing, so it has no mark to give.
    expect(screen.queryByRole('button', { name: 'Pause at block 1' })).toBeNull();
    const mark = screen.getByRole('button', { name: 'Pause at block 3' });
    fireEvent.click(mark);
    expect(mark.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Marked block 3: the service pauses as Query starts it.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Drag block 3 .*, marked to pause at$/ })).toBeTruthy();
    // The menu counts the mark, and Escape closes it without leaving the shift.
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Pause at, 1 setting on' }));
    const menu = screen.getByRole('group', { name: 'Pause the service by itself' });
    expect(within(menu).getByText('At 1 marked block')).toBeTruthy();
    fireEvent.keyDown(within(menu).getByRole('checkbox', { name: /A slip/ }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Pause the service by itself' })).toBeNull();
    expect(window.location.hash).toBe('#/shift/3');
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    const inspector = () => screen.queryByRole('complementary', { name: 'Query, paused' });
    playUntil(inspector);
    expect(within(inspector()!).getByText('At Query’s mark')).toBeTruthy();
    expect(status.textContent).toMatch(/^Round 1 · \d+\.\d s\. At Query’s mark\. Query: .+, block 3\.$/);
    // The mark stays for the next run, until it is taken off.
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(screen.getByRole('button', { name: 'Pause at block 3' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(toolbar).getByRole('button', { name: 'Pause at, 1 setting on' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear marks' }));
    expect(screen.getByRole('button', { name: 'Pause at block 3' }).getAttribute('aria-pressed')).toBe('false');
    expect(within(toolbar).getByRole('button', { name: 'Pause at' })).toBeTruthy();
  });
  it('holds a slip before the crew reacts, when asked, and lets them react on Resume', () => {
    ready('LISTEN\nITEM coffee');
    fireEvent.click(screen.getByRole('button', { name: 'Pause at' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /A slip/ }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    const inspector = () => screen.queryByRole('complementary', { name: 'Query, paused' });
    playUntil(inspector);
    expect(within(inspector()!).getByText('Query’s slip, before the crew reacts')).toBeTruthy();
    const status = screen.getByRole('group', { name: 'Simulation controls' }).querySelector('[role="status"]')!;
    expect(status.textContent).toMatch(/Query’s slip, before the crew reacts\. Query stopped: /);
    // The crew waits, and the block that slipped is the one marked as running.
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.querySelector('.block.active')?.getAttribute('data-line')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }));
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
    expect(inspector()).toBeNull();
  });
  it('marks the caret’s line with F9 in the text view', () => {
    ready(lessons[2].solution, { text_editor: true });
    const text = screen.getByRole('textbox', { name: 'Routine text' });
    expect(text.getAttribute('aria-description')).toMatch(/F9 marks the line/);
    const numbered = () => [...document.querySelectorAll('.code-text-lines > div')].map((line) => line.className);
    (text as HTMLTextAreaElement).setSelectionRange(0, 0);
    fireEvent.keyDown(text, { key: 'F9' });
    // The jump's landing spot on line 1 starts nothing.
    expect(screen.getByText('Nothing starts on line 1 for the service to pause at.')).toBeTruthy();
    const second = lessons[2].solution.indexOf('LISTEN');
    (text as HTMLTextAreaElement).setSelectionRange(second, second);
    fireEvent.keyDown(text, { key: 'F9' });
    expect(numbered()[1]).toBe('marked');
    fireEvent.keyDown(text, { key: 'F9' });
    expect(numbered()[1]).toBe('');
  });
  it('pauses a crew at each handoff, on the robot taking it', () => {
    window.location.hash = '/shift/14';
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13, robotDrafts: { 13: referencePrograms(14) } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause at' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Every handoff/ }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    const inspector = () => screen.queryByRole('complementary', { name: /^(Brew|Porter), paused$/ });
    playUntil(inspector);
    const brew = inspector()!.textContent!.startsWith('Brew');
    expect(within(inspector()!).getByText(brew ? 'Brew takes a ticket' : 'Porter takes a drink')).toBeTruthy();
    expect(screen.getByRole('tab', { selected: true }).textContent).toMatch(brew ? /Brew/ : /Porter/);
  });
  it('looks back through a paused service, from order to order, and comes back to now', () => {
    open();
    const timeline = () => screen.queryByRole('group', { name: 'Look back through the run' });
    // Nothing to look back on while the service plays.
    expect(timeline()).toBeNull();
    playUntil(() => false, 20);
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    const bar = timeline()!;
    const when = () => bar.querySelector('.replay-when')!.textContent;
    const now = when();
    // Query works alone here: no handoffs to jump between, and nobody else's blocks.
    expect(
      within(bar)
        .getAllByRole('button', { pressed: false })
        .map((b) => b.textContent),
    ).toEqual(['Orders', 'Query’s blocks']);
    expect(within(bar).getByRole('button', { name: 'Next key moment' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(bar).getByRole('button', { name: 'Orders' }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous order' }));
    expect(when()).not.toBe(now);
    expect(within(bar).getByText(/^Round 1 · \d+\.\d s\. Query takes an order: “.+”\.$/)).toBeTruthy();
    // The robot as it was then, and the block it was starting.
    expect(screen.getByRole('complementary', { name: 'Query, earlier' })).toBeTruthy();
    expect(document.querySelector('.block.active')?.getAttribute('data-line')).toBe('1');
    const scrubber = within(bar).getByRole('slider', { name: 'Service time' });
    expect(scrubber.getAttribute('aria-valuetext')).toMatch(/, earlier$/);
    // Escape on the scrubber comes back to now, and stays on the shift.
    fireEvent.keyDown(scrubber, { key: 'Escape' });
    expect(when()).toBe(now);
    expect(screen.getByRole('complementary', { name: 'Query, paused' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Stop & edit/ })).toBeTruthy();
    fireEvent.keyDown(scrubber, { key: 'Home' });
    expect(when()).toBe('Round 1 · 0.0 s');
    fireEvent.click(within(bar).getByRole('button', { name: 'Back to now' }));
    expect(when()).toBe(now);
    // Looking back changes nothing: playing on goes on from where the service paused.
    fireEvent.keyDown(scrubber, { key: 'Home' });
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }));
    expect(timeline()).toBeNull();
  });
  it('looks back through a run that slipped, once the crew has had its say', () => {
    open('LISTEN\nITEM coffee');
    playUntil(() => screen.queryByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('group', { name: 'Look back through the run' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const bar = screen.getByRole('group', { name: 'Look back through the run' });
    const marked = (name: string) =>
      [...document.querySelectorAll('[data-line]')].find((e) => e.classList.contains(name))?.getAttribute('data-line');
    const failure = () => marked('failure');
    expect(failure()).toBe('1');
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous key moment' }));
    expect(within(bar).getByText('Round 1 · 0.0 s. Query takes an order: “coffee”.')).toBeTruthy();
    // Back at the order, the block running then is marked, not the one that slipped.
    expect(failure()).toBeUndefined();
    expect(marked('active')).toBe('0');
    expect(screen.getByRole('complementary', { name: 'Query, earlier' })).toBeTruthy();
    // On to the slip is back to now, where the run stopped.
    fireEvent.click(within(bar).getByRole('button', { name: 'Next key moment' }));
    expect(
      within(bar).getByText(/^Round 1 · 3\.0 s\. Query stopped: Take the order paper before writing its item\.$/),
    ).toBeTruthy();
    expect(failure()).toBe('1');
    expect(marked('active')).toBeUndefined();
    expect(screen.queryByRole('complementary', { name: /^Query, / })).toBeNull();
    // An edit puts the run, and looking back through it, away.
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous key moment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    expect(screen.queryByRole('group', { name: 'Look back through the run' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: /^Query, / })).toBeNull();
  });
  it('follows one guest’s order through a paused service, and back to any leg of it', () => {
    open();
    playUntil(() => false, 25);
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    const bar = screen.getByRole('group', { name: 'Look back through the run' });
    const cafe = screen.getByTestId('cafe');
    const picker = within(bar).getByRole('combobox', { name: 'Follow an order' }) as HTMLSelectElement;
    expect(within(picker).getByRole('option', { name: 'Guest 1 · “coffee”' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: /^Following/ })).toBeNull();
    fireEvent.change(picker, {
      target: {
        value: within(picker)
          .getByRole('option', { name: /^Guest 1/ })
          .getAttribute('value'),
      },
    });
    const card = screen.getByRole('region', { name: 'Following Guest 1’s order' });
    expect(cafe.getAttribute('data-follow')).toMatch(/\/.+/);
    expect(card.textContent).toContain('“coffee”');
    expect(within(picker).getByRole('option', { name: 'Stop following' })).toBeTruthy();
    // Each leg so far, who did it and when; the latest is the one on screen.
    const legs = within(card).getAllByRole('listitem');
    expect(legs[0].textContent).toBe('0.0 sWalks in');
    expect(legs.map((leg) => leg.textContent)).toContainEqual(expect.stringMatching(/Moka makes the coffee$/));
    const current = () => card.querySelector('[aria-current="step"]')!.textContent;
    const latest = current();
    // A leg is a way back to it, on the timeline too.
    fireEvent.click(within(card).getByRole('button', { name: /Query writes the ticket/ }));
    expect(current()).toMatch(/Query writes the ticket$/);
    expect(bar.querySelector('.replay-when')!.textContent).toMatch(/^Round 1 · \d+\.\d s$/);
    expect(within(card).getByText(/^\d+\.\d s\. Query writes the ticket\.$/)).toBeTruthy();
    fireEvent.click(within(bar).getByRole('button', { name: 'Back to now' }));
    expect(current()).toBe(latest);
    // Followed on through the service; the legs are only a way back while it is paused.
    fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }));
    expect(within(card).queryAllByRole('button', { name: /Query writes/ })).toHaveLength(0);
    playUntil(() => /Leaves/.test(card.textContent!), 60);
    expect(card.textContent).toContain('Leaves');
    fireEvent.click(within(card).getByRole('button', { name: 'Stop following' }));
    expect(screen.queryByRole('region', { name: /^Following/ })).toBeNull();
    expect(cafe.getAttribute('data-follow')).toBeNull();
  });
  it('shows where a picked block goes in the café, once the block paths are on', () => {
    ready();
    const cafe = screen.getByTestId('cafe');
    const toggle = screen.getByRole('button', { name: 'Block paths' });
    const note = () => screen.queryByRole('region', { name: 'The picked block in the café' });
    const block = (line: number) => document.querySelector<HTMLElement>(`.editor-panel .block[data-line="${line}"]`)!;
    // Off, as it starts: picking a block draws nothing.
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    act(() => block(4).focus());
    expect(note()).toBeNull();
    expect(cafe.getAttribute('data-preview')).toBeNull();
    // On, the block already picked is drawn where it walks, and said, round 1 being the one shown.
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.block_preview).toBe(true);
    expect(cafe.getAttribute('data-preview')).toBe('query:move:1');
    expect(within(note()!).getByRole('heading').textContent).toMatch(/^Block \d+ · move right 1In round 1$/);
    expect(note()!.textContent).toContain(
      'Query walks 1 tile right, from the register to the order handoff. · 4 times',
    );
    // A reach is drawn to what it reaches.
    act(() => block(5).focus());
    expect(cafe.getAttribute('data-preview')).toBe('query:reach:1');
    expect(note()!.textContent).toContain('Query reaches right to the order handoff, and puts the ticket down.');
    // A block that goes nowhere says which do.
    act(() => block(1).focus());
    expect(cafe.getAttribute('data-preview')).toBeNull();
    expect(note()!.textContent).toBe('Pick a Move, Take, Deposit or Use block to see where it goes in the café.');
    // While the service runs, the café shows the run itself.
    act(() => block(4).focus());
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    expect(note()).toBeNull();
    expect(cafe.getAttribute('data-preview')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(cafe.getAttribute('data-preview')).toBe('query:move:1');
    // Off again, nothing is drawn.
    fireEvent.click(toggle);
    expect(note()).toBeNull();
    expect(cafe.getAttribute('data-preview')).toBeNull();
  });
  it('previews the line the caret is on in the text view, and why a block never runs', () => {
    ready(lessons[2].solution.replace('DEPOSIT RIGHT', 'DEPOSIT DOWN'), { text_editor: true, block_preview: true });
    const text = screen.getByRole('textbox', { name: 'Routine text' }) as HTMLTextAreaElement;
    const caretOn = (line: number) => {
      const at = text.value.split('\n').slice(0, line).join('\n').length + 1;
      act(() => text.focus());
      text.setSelectionRange(at, at);
      fireEvent.select(text);
    };
    const note = () => screen.getByRole('region', { name: 'The picked block in the café' });
    caretOn(5);
    expect(within(note()).getByRole('heading').textContent).toBe('Line 6 · deposit downIn round 1');
    expect(note().textContent).toMatch(/Query reaches down, but nothing is there\. The run stops here: .+\.$/);
    expect(screen.getByTestId('cafe').getAttribute('data-preview')).toBe('query:reach:1');
    caretOn(6);
    expect(note().textContent).toMatch(/The round stops before it runs: .+\.$/);
    expect(screen.getByTestId('cafe').getAttribute('data-preview')).toBeNull();
  });
  it('tells the service in words beside the café, and says what happens as it plays', () => {
    ready();
    const toggle = screen.getByRole('button', { name: 'Café in words' });
    const words = () => screen.queryByRole('region', { name: 'The café in words' });
    const told = () =>
      [...document.querySelectorAll('.cafe-panel .sr-only[aria-live="polite"]')].map((p) => p.textContent).join(' ');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.service_summary).toBe(true);
    // Nothing to tell before the service runs.
    expect(words()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const panel = words()!;
    expect(within(panel).getByRole('heading', { level: 3 }).textContent).toMatch(/^The café in wordsRound 1 of \d+$/);
    expect(within(panel).getByRole('heading', { name: /^Guests · 0 of \d+ served$/ })).toBeTruthy();
    const crew = within(panel).getByRole('region', { name: 'Crew' });
    expect(within(crew).getAllByRole('listitem')[0].textContent).toMatch(/^Query/);
    expect(within(panel).getByRole('region', { name: 'Counters' }).textContent).toContain('Tickets for Moka');
    // What happens is said a little at a time, not every frame.
    playUntil(() => /Guest 1 walks in\./.test(told()), 20);
    expect(told()).toMatch(/^Guest 1 walks in\./);
    expect(within(panel).getByRole('region', { name: /^Guests/ }).textContent).toContain('Guest 1 · “');
    playUntil(() => /served/.test(told()) || /to go/.test(told()), 90);
    expect(within(panel).getByRole('heading', { name: /^Guests · [1-9]\d* of \d+ served$/ })).toBeTruthy();
    // Paused, it says the moment it is on.
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    expect(within(panel).getByRole('heading', { level: 3 }).textContent).toMatch(/Round 1 · \d+\.\d s$/);
    // Off, it is neither shown nor said.
    fireEvent.click(toggle);
    expect(words()).toBeNull();
    expect(told().trim()).toBe('');
  });
  it('says what stopped the run, in the café told in words', () => {
    ready(lessons[2].solution.replace('DEPOSIT RIGHT', 'DEPOSIT DOWN'), { service_summary: true });
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    const told = () =>
      [...document.querySelectorAll('.cafe-panel .sr-only[aria-live="polite"]')].map((p) => p.textContent).join(' ');
    playUntil(() => /Query stopped: /.test(told()), 30);
    expect(told()).toMatch(/Query stopped: .+\./);
    const panel = screen.getByRole('region', { name: 'The café in words' });
    expect(panel.querySelector('.service-summary-stopped')?.textContent).toMatch(/^Query stopped: .+\.$/);
  });
  it('opens the routine of the robot behind a moment or an order’s leg, at the block it began on', () => {
    window.location.hash = '/shift/14';
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13, robotDrafts: { 13: referencePrograms(14) } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    playUntil(() => false, 40);
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    const bar = screen.getByRole('group', { name: 'Look back through the run' });
    const tab = () => screen.getByRole('tab', { selected: true }).textContent;
    const active = () => document.querySelector('.editor-panel .block.active');
    fireEvent.click(screen.getByRole('tab', { name: /Query/ }));
    expect(tab()).toMatch(/Query/);
    fireEvent.click(within(bar).getByRole('button', { name: 'Handoffs' }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous handoff' }));
    const brew = !!within(bar).queryByText(/^Round 1 · \d+\.\d s\. Brew takes a ticket/);
    expect(tab()).toMatch(brew ? /Brew/ : /Porter/);
    expect(active()).toBeTruthy();
    fireEvent.click(within(bar).getByRole('button', { name: 'Orders' }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous order' }));
    expect(tab()).toMatch(/Query/);
    // An order's leg opens the routine of whoever did it, marked where that leg began.
    const picker = within(bar).getByRole('combobox', { name: 'Follow an order' }) as HTMLSelectElement;
    fireEvent.change(picker, {
      target: { value: within(picker).getAllByRole('option')[1].getAttribute('value') },
    });
    const card = screen.getByRole('region', { name: /^Following Guest 1/ });
    fireEvent.click(within(card).getByRole('button', { name: /Brew takes the ticket/ }));
    expect(tab()).toMatch(/Brew/);
    // Brew takes a ticket by listening for one.
    expect(active()?.textContent).toBe('Wait forOrders');
  });
  it('jumps between a crew’s handoffs, and one robot’s blocks', () => {
    window.location.hash = '/shift/14';
    seedLocalStorage({ ...makeSave(), unlocked: 13, selected: 13, robotDrafts: { 13: referencePrograms(14) } });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    playUntil(() => false, 40);
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    const bar = screen.getByRole('group', { name: 'Look back through the run' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Handoffs' }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Previous handoff' }));
    expect(within(bar).getByText(/^Round 1 · \d+\.\d s\. (Brew takes a ticket|Porter takes a drink)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Brew/ }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Brew’s blocks' }));
    fireEvent.click(within(bar).getByRole('button', { name: 'Brew’s previous block' }));
    expect(within(bar).getByText(/^Round 1 · \d+\.\d s\. Brew: .+, block \d+\.$/)).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Brew, earlier' })).toBeTruthy();
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
    expect(status.textContent).toBe('Service running, round 2 of 3, 1 passed. The routines are locked until it stops.');
    // A pip a round: the one that went right is filled, the one playing is ringed.
    expect([...toolbar.querySelectorAll('.round-pips i')].map((pip) => pip.className)).toEqual([
      'passed',
      'current',
      '',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(within(toolbar).queryByText(/^Round/)).toBeNull();
  });
  it('shows on each robot’s tab whether it’s busy or waiting, while the service runs', () => {
    open();
    const tab = () => screen.getByRole('tab', { name: /Query/ });
    // Before the doors open, Query is already waiting at the counter.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(tab().getAttribute('data-activity')).toBe('waiting');
    expect(tab().getAttribute('aria-description')).toBe('Waiting for a guest');
    expect(tab().textContent).toContain('waiting');
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '4' } });
    const seen = new Set<string>();
    for (let i = 0; i < 80 && seen.size < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      seen.add(tab().getAttribute('data-activity')!);
    }
    expect(seen).toEqual(new Set(['waiting', 'working']));
    fireEvent.click(screen.getByRole('button', { name: /Stop & edit/ }));
    expect(tab().getAttribute('data-activity')).toBeNull();
    expect(tab().getAttribute('aria-description')).toBeNull();
    expect(tab().textContent).toBe('Query');
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
  it('offers to restore only once the open routine differs from an earlier version', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const reset = screen.getByRole('button', { name: /Restore Query’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(reset.getAttribute('aria-describedby')).toBe('restore-note');
    expect(screen.getByText('Query’s routine is just like every earlier version.')).toBeTruthy();
  });
  it('says to stop the service before restoring an edited routine', () => {
    render(
      <OptionsModal
        robot="Brew"
        pixelArt={false}
        textMode={false}
        observation={false}
        running
        restorable
        onTogglePixelArt={() => {}}
        onToggleTextMode={() => {}}
        shortRepeats={false}
        onToggleShortRepeats={() => {}}
        onRequestRestore={() => {}}
        report={() => ''}
        onClose={() => {}}
      />,
    );
    const reset = screen.getByRole('button', { name: /Restore Brew’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(reset.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Stop the service to restore Brew’s routine.',
    );
  });
  it('mentions the other robots’ routines on restoring only when there are other robots', () => {
    const text = (alone: boolean) => {
      const { unmount } = render(
        <RestoreModal
          robot="Query"
          alone={alone}
          current="LISTEN"
          versions={[{ id: 'starter', label: 'Shift starter', detail: '', source: 'LISTEN\nTAKE UP' }]}
          onClose={() => {}}
          onRestore={() => {}}
        />,
      );
      const said = screen.getByText(/routine changes/).textContent;
      unmount();
      return said;
    };
    expect(text(true)).toBe('Only Query’s routine changes. Undo (Ctrl Z) brings yours back.');
    expect(text(false)).toBe(
      'Only Query’s routine changes; the other robots keep theirs. Undo (Ctrl Z) brings yours back.',
    );
  });
  it('says why the watch-only shift has nothing to reset', () => {
    window.location.hash = '/shift/1';
    seedLocalStorage(makeSave());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const reset = screen.getByRole('button', { name: /Restore Query’s routine/ });
    expect(reset.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(reset.getAttribute('aria-describedby')!)?.textContent).toBe(
      'This shift is watch-only: the crew serves by hand, so there’s no routine to edit or restore.',
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
  it('compares a fixed service with the run that slipped, from the receipt and from Options', () => {
    ready('LISTEN\nITEM coffee', { text_editor: true });
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    // Nothing to compare before two runs of the same rounds.
    const none = screen.getByRole('button', { name: 'Compare runs' });
    expect(none.hasAttribute('disabled')).toBe(true);
    expect(document.getElementById(none.getAttribute('aria-describedby')!)?.textContent).toMatch(/twice/);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    playUntil(() => screen.queryByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Routine text' }), { target: { value: lessons[2].solution } });
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '12' } });
    playUntil(() => screen.queryByRole('dialog', { name: 'Dialogue' }), 120);
    while (screen.queryByRole('button', { name: 'Next' }))
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'See the receipt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare with run 1' }));
    const compare = screen.getByRole('dialog', { name: 'Compare runs' });
    expect((within(compare).getByRole('combobox', { name: 'After' }) as HTMLSelectElement).value).toBe('2');
    expect((within(compare).getByRole('combobox', { name: 'Before' }) as HTMLSelectElement).value).toBe('1');
    const outcome = within(compare).getByRole('row', { name: /^Outcome/ });
    expect(
      within(outcome)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Query stopped · Round 1 · Guest 1', 'Served', 'Now served, better']);
    expect(within(compare).getByRole('row', { name: /^Steps run/ }).textContent).toMatch(/—/);
    // Each run keeps the routine it ran: the fix, line by line.
    const diff = within(compare).getByRole('list', { name: 'Query’s routine, run 1 to run 2' });
    const lines = within(diff).getAllByRole('listitem');
    expect(lines.filter((line) => line.classList.contains('add')).map((line) => line.textContent)).toContain(
      '+In: TAKE UP',
    );
    // Done goes back to the receipt, which still leads on to the next shift.
    fireEvent.click(within(compare).getByRole('button', { name: 'Done' }));
    expect(screen.getByText('Service complete')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stay on this shift' }));
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare runs' }));
    expect(screen.getByRole('dialog', { name: 'Compare runs' })).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    // Query works alone on this shift: no other routines to keep.
    expect(screen.getByText(/routine changes/).textContent).toMatch(/changes\. Undo/);
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
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

  it('follows the failed guest’s order, to the slip that ended it', () => {
    failRun();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(within(card()!).getByRole('button', { name: 'Follow Guest 2’s order' }));
    const route = screen.getByRole('region', { name: 'Following Guest 2’s order' });
    expect(route.textContent).toContain('“tea”');
    const legs = within(route).getAllByRole('listitem');
    expect(legs.at(-1)!.textContent).toMatch(/Query stopped: /);
    expect(legs.at(-1)!.getAttribute('aria-current')).toBe('step');
    expect(route.textContent).not.toContain('On its way');
    // Each leg is a way back through the run that slipped.
    fireEvent.click(within(legs[0]).getByRole('button'));
    expect(legs[0].getAttribute('aria-current')).toBe('step');
    // An edit puts the run, and the order followed through it, away.
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    expect(screen.queryByRole('region', { name: /^Following/ })).toBeNull();
    expect(within(card()!).queryByRole('button', { name: /^Follow/ })).toBeNull();
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

  it('climbs Help’s hints to a clue that shows the block, and keeps them for the rest of the shift', () => {
    failRun();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remind me of the idea' }));
    fireEvent.click(screen.getByRole('button', { name: 'Give me a clue' }));
    const hints = screen.getByRole('list', { name: 'Hints' });
    expect(hints.textContent).toContain('For every guest, exactly one of the two happens.');
    expect(hints.textContent).toContain('then parts ways at “write coffee”');
    fireEvent.click(within(hints).getByRole('button', { name: 'Show this block' }));
    expect(screen.queryByRole('list', { name: 'Hints' })).toBeNull();
    expect(document.activeElement?.getAttribute('data-line')).toBe('4');
    // Asking again picks up where the player left off.
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(within(screen.getByRole('list', { name: 'Hints' })).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Reveal worked example' })).toBeTruthy();
  });

  it('practises the round that failed for no stars, and runs the whole service from there', () => {
    window.location.hash = '/shift/4';
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 3,
      selected: 3,
      settings: { ...save.settings, text_editor: true },
      robotDrafts: { 3: { query: failing, prep: '', floor: '' } },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    const play = () => {
      for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }) && !practised(); i++)
        act(() => {
          vi.advanceTimersByTime(1000);
        });
    };
    const practised = () => screen.queryByRole('region', { name: /went right/ });
    const run = () => screen.getByRole('button', { name: /Run service|Stop/ });
    fireEvent.click(run());
    play();
    fireEvent.keyDown(window, { key: 'Escape' });
    // The same routine, the same round: the same slip, now marked as practice.
    fireEvent.click(within(card()!).getByRole('button', { name: 'Practise round 1' }));
    expect(card()).toBeNull();
    expect(document.activeElement).toBe(run());
    expect(document.querySelector('.playback-round')!.textContent).toBe('PracticeRound 1 of 3');
    const status = screen.getByRole('group', { name: 'Simulation controls' }).querySelector('[role="status"]')!;
    expect(status.textContent).toBe('Practising round 1 of 3, for no stars. The routines are locked until it stops.');
    play();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(within(card()!).getByText('Query stopped').textContent).toBe('Query stopped · Practice · Round 1 · Guest 2');
    // Fixed, the card says to check it, and practice that goes right says so beside the code: no cheer, no receipt.
    fireEvent.change(screen.getByRole('textbox', { name: 'Routine text' }), { target: { value: lessons[3].solution } });
    expect(card()!.textContent).toContain('practise this round to check it, or run the whole service.');
    fireEvent.click(within(card()!).getByRole('button', { name: 'Practise round 1' }));
    play();
    expect(practised()!.textContent).toContain('Round 1 went right · Practice');
    expect(practised()!.textContent).toContain('Practice earns no stars');
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    expect(screen.queryByText('Service complete')).toBeNull();
    expect(savedStars()['3']).toBeUndefined();
    // An edit takes the card away: it spoke for routines that are gone.
    const routine = screen.getByRole('textbox', { name: 'Routine text' });
    fireEvent.change(routine, { target: { value: lessons[3].solution + '\n' } });
    expect(practised()).toBeNull();
    fireEvent.change(routine, { target: { value: lessons[3].solution } });
    fireEvent.click(within(practised()!).getByRole('button', { name: 'Run the whole service' }));
    expect(practised()).toBeNull();
    expect(document.activeElement).toBe(run());
    expect(document.querySelector('.playback-round')!.textContent).toBe('Round 1 of 3');
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
  it('undoes a restore and a worked example from the keyboard', () => {
    openDraft();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore this version' }));
    expect(saved()).not.toBe(draft);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(saved()).toBe(draft);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    for (const name of ['Remind me of the idea', 'Give me a clue', 'Reveal worked example'])
      fireEvent.click(screen.getByRole('button', { name }));
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
