import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { newSave } from '../../../src/features/campaign/save/persistence';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
});

describe('shift entry navigation', () => {
  it('opens the selector before the selected shift', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
    expect(document.querySelector('.app-header')).toBeNull();
    // Whose café is it? Lou’s, until the story says otherwise.
    expect(screen.getByText('Lou’s · A cozy coding adventure')).toBeTruthy();
    expect(screen.getByText('Doors open soon')).toBeTruthy();
    // The tab names each screen.
    expect(document.title).toBe('Caffeine Protocol');
    fireEvent.click(screen.getByRole('button', { name: 'Choose a shift' }));

    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    // Focus lost with the home page's button picks up on the new screen's title.
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Choose a shift' }));
    expect(screen.getByText('Lou’s · Order rail')).toBeTruthy();
    expect(document.title).toBe('Choose a shift · Caffeine Protocol');
    expect(screen.queryByRole('button', { name: 'Selected shift' })).toBeNull();

    // A new café opens on its first scene; the first shift waits behind it.
    expect(screen.getByRole('complementary', { name: 'Selected scene' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Watch scene' }));
    await waitFor(() => expect(window.location.hash).toBe('#/scene/the-keys'));
    expect(screen.getByText('The Keys')).toBeTruthy();
    expect(document.title).toBe('The Keys · Caffeine Protocol');
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));

    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    expect(screen.getByRole('button', { name: 'Scene: The Keys, seen' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await waitFor(() => expect(window.location.hash).toBe('#/shift/1'));
    await waitFor(() => expect(document.title).toMatch(/^Shift 01: .+ · Caffeine Protocol$/));
  });

  it.each(['#/shift/1', '#/scene/the-scrapyard', '#/scene/closing-time', '#/scene/nope'])(
    'keeps %s out of reach on a new café',
    (hash) => {
      window.location.hash = hash;
      render(<App />);
      expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
    },
  );

  it('warns on every screen when the saved café cannot be read, until dismissed', () => {
    localStorage.setItem('caffeine-protocol.v1', '{bad');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain('new progress isn’t being saved');
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    dismiss.focus();
    fireEvent.click(dismiss);
    expect(screen.queryByRole('alert')).toBeNull();
    // The button went with the notice; focus carries on from the screen's title.
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Caffeine Protocol' }));
  });

  it('counts only rated shifts, so stars never total past the maximum', () => {
    const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 3]));
    const settings = { music: 0, reduced_motion: true, pixel_art: false };
    const save = {
      version: 4,
      selected: 20,
      unlocked: 20,
      complete: true,
      drafts: {},
      solutions: {},
      stars,
      story: {},
    };
    localStorage.setItem(
      'caffeine-protocol.v1',
      JSON.stringify({ ...save, robotDrafts: {}, robotSolutions: {}, settings }),
    );
    window.location.hash = '#/campaign';
    render(<App />);
    expect(screen.getByRole('img', { name: '60 of 60 stars' })).toBeTruthy();
    // Each shift says how it went, since the marks beside its name are visual only.
    expect(screen.getByRole('button', { name: /^Shift 1: .*, served$/ })).toBeTruthy();
    // Query's first shift is already rated: only the hand-served prologue is just "served".
    expect(screen.getByRole('button', { name: /^Shift 2: .*, 3 of 3 stars$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Shift 3: .*, 3 of 3 stars$/ })).toBeTruthy();
    // A finished campaign hangs Niko’s name over the door.
    expect(screen.getByText(/^Café Niko · Order #/)).toBeTruthy();
    expect(screen.getByText('Café Niko · Order rail')).toBeTruthy();
  });

  it('closes the campaign by saying how many shifts still have stars to win', async () => {
    const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, i === 4 || i === 9 ? 2 : 3]));
    const settings = { music: 0, reduced_motion: true, pixel_art: false };
    const save = {
      version: 4,
      selected: 20,
      unlocked: 20,
      complete: true,
      drafts: {},
      solutions: {},
      stars,
      story: {},
    };
    localStorage.setItem(
      'caffeine-protocol.v1',
      JSON.stringify({ ...save, robotDrafts: {}, robotSolutions: {}, settings }),
    );
    window.location.hash = '#/ending';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
    // The receipt prints "18/20" and reads it aloud as "18 of 20".
    const perfect = screen.getByText('Three-star shifts').nextElementSibling!;
    expect(perfect.querySelector('[aria-hidden="true"]')?.textContent).toBe('18/20');
    expect(perfect.querySelector('.sr-only')?.textContent).toBe('18 of 20');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Closing time.' }));
    // Later redraws leave focus where the player put it.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const motion = screen.getByRole('checkbox', { name: 'Reduced motion' });
    // Named by its title alone, with the hint read after it as a description.
    expect(document.getElementById(motion.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Keep the movement, skip the extra animation.',
    );
    motion.focus();
    fireEvent.click(motion);
    expect(document.activeElement).toBe(motion);
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    // Going back for stars opens the board on the first shift still short of three.
    fireEvent.click(screen.getByRole('button', { name: 'Go back for the missing stars' }));
    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    expect(await screen.findByText('No. 05')).toBeTruthy();
  });

  it('prints the day act by act on the closing receipt, without counting what a one-star café missed', () => {
    const row = (name: string) => {
      const value = screen.getByText(name, { exact: false, selector: 'dt' }).nextElementSibling!;
      return [value.querySelector('[aria-hidden="true"]')?.textContent, value.querySelector('.sr-only')?.textContent];
    };
    const ending = (stars: Record<number, number>) => {
      localStorage.setItem(
        'caffeine-protocol.v1',
        JSON.stringify({ ...newSave(), unlocked: 20, complete: true, stars }),
      );
      window.location.hash = '#/ending';
      const view = render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /Skip/ }));
      return view;
    };
    // Shift 5 is Query's and shift 10 is Brew's: each act's line carries its own missing star.
    const { unmount } = ending(
      Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, i === 4 || i === 9 ? 2 : 3])),
    );
    expect([...document.querySelectorAll('.story-milestone dt')].map((term) => term.textContent)).toEqual([
      'Act I · Query took the orders, stars',
      'Act II · Brew learned every recipe, stars',
      'Act III · Porter learned the room, stars',
      'Act IV · The whole crew ran the day, stars',
    ]);
    expect(row('Query took the orders')).toEqual(['20/21 ★', '20 of 21']);
    expect(row('Brew learned every recipe')).toEqual(['14/15 ★', '14 of 15']);
    expect(row('Porter learned the room')).toEqual(['9/9 ★', '9 of 9']);
    expect(row('The whole crew ran the day')).toEqual(['15/15 ★', '15 of 15']);
    expect(row('Stars earned')).toEqual(['58/60 ★', '58 of 60']);
    expect(screen.getByText(/Every guest went home with the right drink/)).toBeTruthy();
    unmount();
    // Every shift served on one star: the receipt counts what was done, and doesn't print "0/20" three-star shifts.
    ending(Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 1])));
    expect(row('Query took the orders')).toEqual(['7/21 ★', '7 of 21']);
    expect(screen.queryByText('Three-star shifts')).toBeNull();
    expect(screen.getByText(/the stars still out there will keep/)).toBeTruthy();
  });

  it('goes back a screen on Escape, once the open window or story scene has had it', async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
    const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 3]));
    const save = { ...newSave(), selected: 20, unlocked: 20, complete: true, stars };
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify(save));
    window.location.hash = '#/ending';
    render(<App />);
    expect(screen.getByRole('button', { name: /^Campaign/ }).getAttribute('aria-keyshortcuts')).toBe('Escape');
    // The closing scene takes the first Escape as Skip.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByRole('heading', { name: 'Closing time.' })).toBeTruthy();
    expect(window.location.hash).toBe('#/ending');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    // An open window keeps its Escape to itself.
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/campaign');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.keyDown(window, { key: 'Escape', repeat: true });
    expect(window.location.hash).toBe('#/campaign');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(window.location.hash).toBe('#/'));
  });

  it('labels the next and locked shifts on the rail', () => {
    window.location.hash = '#/campaign';
    render(<App />);
    expect(screen.getByRole('button', { name: 'Scene: The Keys, next up' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Shift 1: .*, opens after The Keys$/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Shift 2:/ })).toBeNull();
  });

  it.each(['#/shift/abc', '#/shift/1.5', '#/interlude/x'])('falls back to the home page for %s', (hash) => {
    window.location.hash = hash;
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
  });
});
