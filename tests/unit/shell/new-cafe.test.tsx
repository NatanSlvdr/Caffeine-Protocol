import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import type * as Download from '../../../src/shared/lib/download';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
const download = vi.hoisted(() => vi.fn());
vi.mock('../../../src/shared/lib/download', async (actual) => ({
  ...(await actual<typeof Download>()),
  download,
}));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

describe('starting a new café', () => {
  it('names what a fresh start clears and exports a copy from the warning itself', () => {
    seedLocalStorage({ ...makeSave(), stars: { 0: 0, 1: 3, 2: 2 }, unlocked: 3, selected: 3 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start a new café' }));
    expect(
      screen.getByText(
        'This clears 3 served shifts, 5 stars, every routine and the story so far. Your audio and display settings will stay.',
      ),
    ).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: 'Start a new café?' });
    expect(screen.getByRole('status').textContent).toBe('');
    fireEvent.click(screen.getAllByRole('button', { name: 'Export café' }).find((b) => dialog.contains(b))!);
    expect(download).toHaveBeenCalledWith(expect.stringContaining('"version": 4'), expect.stringMatching(/\.json$/));
    expect(screen.getByRole('status').textContent).toMatch(/^Saved a copy as caffeine-protocol-save-.+\.json\.$/);
  });

  it('keeps warning, without crashing, when the browser blocks storage outright', () => {
    const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Site data is blocked.', 'SecurityError');
      },
    });
    try {
      render(<App />);
      const warning = 'This browser isn’t letting the café save here';
      expect(screen.getByRole('alert').textContent).toContain(warning);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start a new café' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start new café' }));
      expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
      expect(screen.getAllByRole('alert').some((a) => a.textContent?.includes(warning))).toBe(true);
    } finally {
      if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    }
  });
});
