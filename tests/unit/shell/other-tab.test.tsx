import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { SAVE_KEY, newSave } from '../../../src/features/campaign/save/persistence';
import type * as Navigation from '../../../src/shared/lib/navigation';
import { seedLocalStorage, makeSave } from '../../helpers/saves';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
const reloadPage = vi.hoisted(() => vi.fn());
vi.mock('../../../src/shared/lib/navigation', async (actual) => ({
  ...(await actual<typeof Navigation>()),
  reloadPage,
}));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  reloadPage.mockClear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

/** Another tab saving the café, as the browser tells this one about it. */
function savedElsewhere(raw: string) {
  localStorage.setItem(SAVE_KEY, raw);
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: raw, storageArea: localStorage }));
  });
}

const stored = () => JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');

describe('the café open in another tab', () => {
  it('stops saving here once another tab saves, and says so', () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    const theirs = JSON.stringify({ ...newSave(), unlocked: 4, stars: { 0: 0, 1: 3, 2: 2, 3: 1 } });
    savedElsewhere(theirs);
    expect(screen.getAllByRole('alert')[0].textContent).toContain(
      'This café was just saved from another tab or window.',
    );
    // A change here no longer reaches storage, so the other tab's progress stands.
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByLabelText('Pixel-art shader'));
    expect(localStorage.getItem(SAVE_KEY)).toBe(theirs);
    expect(screen.getByText(/Not saving right now/)).toBeTruthy();
  });

  it('reloads from the other tab’s progress when asked', () => {
    render(<App />);
    savedElsewhere(JSON.stringify({ ...newSave(), unlocked: 3 }));
    fireEvent.click(screen.getByRole('button', { name: 'Load the newer progress' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('saves this tab’s progress over the other one’s when asked, and carries on saving', () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    savedElsewhere(JSON.stringify({ ...newSave(), unlocked: 5 }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep this tab’s progress' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(stored().unlocked).toBe(2);
  });

  it('pays no mind to another tab writing back the same progress', () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    // Reformatted, but the same café: what opening it in a second tab writes.
    savedElsewhere(JSON.stringify(stored(), null, 2));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
