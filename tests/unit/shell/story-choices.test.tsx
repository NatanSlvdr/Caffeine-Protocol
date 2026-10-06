import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { sceneById, sceneLines } from '../../../src/data/campaign/cutscenes';
import { newSave } from '../../../src/features/campaign/save/persistence';
import type { ProgressSave } from '../../../src/domain/types';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const KEY = 'caffeine-protocol.v1';
const stored = (): ProgressSave => JSON.parse(localStorage.getItem(KEY)!);

beforeEach(() => {
  localStorage.clear();
  // The Keys watched and the first shift served: the scrapyard is the scene waiting. Lines print whole.
  const save = newSave();
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...save,
      unlocked: 1,
      selected: 1,
      stars: { 0: 3 },
      story: { 0: true },
      settings: { ...save.settings, reduced_motion: true },
    }),
  );
  window.location.hash = '#/scene/the-scrapyard';
});

/** Play the scrapyard up to Query asking who Niko is. */
function toTheChoice() {
  render(<App />);
  const before = sceneLines(sceneById('the-scrapyard')!).lines.findIndex((each) => each.choice);
  for (let i = 0; i < before; i++) fireEvent.keyDown(window, { key: 'Enter' });
  return screen.getByRole('group', { name: 'What Niko says' });
}

describe('what Niko says, kept with the café', () => {
  it('keeps the answer as it is given, even when the rest of the scene is skipped', async () => {
    toTheChoice();
    expect(stored().choices).toBeUndefined();
    fireEvent.keyDown(window, { key: '2' });
    expect(stored().choices).toEqual({ 'hello-query': 'minding' });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(window.location.hash).toBe('#/campaign'));
    expect(stored().story[1]).toBe(true);
  });

  it('asks again when the scene is watched again, marking the last answer, and keeps the new one', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...stored(), choices: { 'hello-query': 'minding' } }));
    toTheChoice();
    expect(screen.getByRole('button', { name: 'I’m minding Lou’s café. (said last time)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'It’s my café now.' }));
    expect(stored().choices).toEqual({ 'hello-query': 'mine' });
  });

  it('leaves the answer as it was when a scene watched again is skipped past its choice', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...stored(), choices: { 'hello-query': 'minding' } }));
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(stored().choices).toEqual({ 'hello-query': 'minding' });
  });
});
