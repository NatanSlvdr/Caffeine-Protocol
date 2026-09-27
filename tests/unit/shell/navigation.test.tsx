import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), playSound: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
});

describe('shift entry navigation', () => {
  it('opens the selector before the selected shift', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
    expect(document.querySelector('.app-header')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Choose a shift' }));

    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    expect(screen.getByRole('heading', { name: 'Choose a shift' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Selected shift' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await waitFor(() => expect(window.location.hash).toBe('#/shift/1'));
  });

  it('warns on every screen when the saved café cannot be read, until dismissed', () => {
    localStorage.setItem('caffeine-protocol.v1', '{bad');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain('new progress isn’t being saved');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('counts only rated shifts, so stars never total past the maximum', () => {
    const stars = Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, 3]));
    const settings = { volume: 0.5, music: 0, effects: 0, reduced_motion: true, pixel_art: false, fullscreen: false };
    const save = {
      version: 3,
      selected: 31,
      unlocked: 31,
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
    expect(screen.getByRole('img', { name: '90 of 90 stars' })).toBeTruthy();
    // Each shift says how it went, since the marks beside its name are visual only.
    expect(screen.getByRole('button', { name: /^Shift 1: .*, served$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Shift 3: .*, 3 of 3 stars$/ })).toBeTruthy();
  });

  it('labels the next and locked shifts on the rail', () => {
    window.location.hash = '#/campaign';
    render(<App />);
    expect(screen.getByRole('button', { name: /^Shift 1: .*, next up$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Shift 2: .*, locked$/ })).toBeTruthy();
  });

  it.each(['#/shift/abc', '#/shift/1.5', '#/interlude/x'])('falls back to the home page for %s', (hash) => {
    window.location.hash = hash;
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
  });
});
