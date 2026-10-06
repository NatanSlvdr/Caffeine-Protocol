import { fireEvent, render, screen, within } from '@testing-library/react';
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

describe('starting a café over', () => {
  it('names what a fresh start clears and exports a copy from the warning itself', () => {
    seedLocalStorage({ ...makeSave(), stars: { 0: 0, 1: 3, 2: 2 }, unlocked: 3, selected: 3 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start this café over' }));
    expect(
      screen.getByText(
        'This clears 3 served shifts, 5 stars, every routine and the story so far. Your audio and display settings, and your routine notebook, will stay.',
      ),
    ).toBeTruthy();
    const dialog = screen.getByRole('dialog', { name: 'Start this café over?' });
    expect(within(dialog).getByRole('status').textContent).toBe('');
    fireEvent.click(screen.getAllByRole('button', { name: 'Export café' }).find((b) => dialog.contains(b))!);
    expect(download).toHaveBeenCalledWith(expect.stringContaining('"version": 4'), expect.stringMatching(/\.json$/));
    expect(within(dialog).getByRole('status').textContent).toMatch(
      /^Café exported as caffeine-protocol-save-.+\.json\. Look for it with your downloads\.$/,
    );
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
      // Nothing was ever stored, so there is no copy to recover.
      expect(screen.queryByRole('button', { name: 'Export recovery copy' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Start this café over' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
      expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
      expect(screen.getAllByRole('alert').some((a) => a.textContent?.includes(warning))).toBe(true);
    } finally {
      if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
    }
  });
});
