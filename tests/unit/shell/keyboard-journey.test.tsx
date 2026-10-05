import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../src/App';
import { lessons } from '../../../src/data';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  // user-event waits on timers of its own, so the clock has to move by itself as well as when told.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  window.location.hash = '/campaign';
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

const focused = () => document.activeElement as HTMLElement;
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const reaction = () => document.querySelector('.dialogue-aside');

/** Shift 2, Query's first routine, opened from the campaign with the keyboard alone. */
async function openShift(draft?: string) {
  const save = makeSave();
  seedLocalStorage({
    ...save,
    unlocked: 1,
    selected: 1,
    stars: { 0: 0 },
    robotDrafts: draft ? { 1: { query: draft, prep: '', floor: '' } } : {},
  });
  render(<App />);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const start = screen.getByRole('button', { name: 'Start shift' });
  for (let i = 0; i < 20 && focused() !== start; i++) await user.tab();
  expect(focused()).toBe(start);
  await user.keyboard('{Enter}');
  await vi.waitFor(() => expect(window.location.hash).toBe('#/shift/2'));
  await vi.waitFor(() => expect(document.querySelector('.dialogue-scene')).toBeTruthy());
  return user;
}

/** Runs the service with Ctrl + Enter and waits for the crew to react. */
async function runService(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Control>}{Enter}{/Control}');
  for (let i = 0; i < 90 && !reaction(); i++) wait(1000);
  expect(reaction()).toBeTruthy();
}

describe('the keyboard journey', () => {
  it('goes from the campaign through the intro, a failed run and Help without a pointer', async () => {
    const user = await openShift();
    // The intro is a scene: it takes focus and keeps Tab on its own buttons.
    const intro = screen.getByRole('dialog', { name: /^Shift 02/ });
    expect(focused()).toBe(screen.getByRole('button', { name: 'Next' }));
    for (let i = 0; i < 3; i++) {
      await user.tab();
      expect(intro.contains(focused())).toBe(true);
    }
    for (let i = 0; i < 25 && document.querySelector('.dialogue-scene'); i++) {
      await user.keyboard('{Enter}');
      wait(800);
    }
    expect(screen.queryByRole('dialog', { name: /^Shift 02/ })).toBeNull();

    // The starter routine slips. The crew's reaction lands with focus on it, so Enter reads it through.
    await runService(user);
    expect(reaction()!.contains(focused())).toBe(true);
    for (let i = 0; i < 6 && reaction(); i++) {
      await user.keyboard('{Enter}');
      wait(800);
    }
    expect(reaction()).toBeNull();
    // Back at the code, on the block where the service stopped, with the failure card a Tab or two on.
    expect(focused().getAttribute('aria-label')).toMatch(/where the service stopped$/);
    for (let i = 0; i < 6 && !/^Show where Query stopped/.test(focused().textContent ?? ''); i++) await user.tab();
    expect(focused().textContent).toMatch(/^Show where Query stopped/);

    // Help opens from its button and Escape hands focus back to it.
    const help = screen.getByRole('button', { name: 'Help' });
    for (let i = 0; i < 40 && focused() !== help; i++) await user.tab();
    await user.keyboard('{Enter}');
    const notes = screen.getByRole('dialog', { name: /Hello, World Roast/ });
    // A browser turns Escape in an open dialog into its cancel event; jsdom leaves that to the test.
    fireEvent(notes, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: /Hello, World Roast/ })).toBeNull();
    expect(focused()).toBe(help);
  });

  it('serves a shift and moves on to the next one without a pointer', async () => {
    const user = await openShift(lessons[1].solution);
    for (let i = 0; i < 25 && document.querySelector('.dialogue-scene'); i++) {
      await user.keyboard('{Escape}');
      wait(800);
    }
    await runService(user);
    expect(reaction()!.contains(focused())).toBe(true);
    for (let i = 0; i < 10 && reaction(); i++) {
      await user.keyboard('{Enter}');
      wait(800);
    }
    // The receipt opens on its way forward.
    expect(screen.getByRole('dialog', { name: /Service complete/ })).toBeTruthy();
    expect(focused().textContent).toMatch(/^Next shift/);
    await user.keyboard('{Enter}');
    await vi.waitFor(() => expect(window.location.hash).not.toBe('#/shift/2'));
  });
});
