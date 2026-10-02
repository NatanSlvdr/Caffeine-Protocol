import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

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
afterEach(() => {
  delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
  delete (document.documentElement as { requestFullscreen?: unknown }).requestFullscreen;
});

const settings = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  return screen.getByRole('dialog', { name: 'The little things.' });
};

describe('fullscreen setting', () => {
  it('is left out where the browser can’t go fullscreen', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true });
    expect(within(settings()).queryByRole('button', { name: /fullscreen/ })).toBeNull();
  });

  it('reports a refused request beside the setting, not under the save', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    document.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'));
    const dialog = settings();
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Go fullscreen' })));
    const alert = within(dialog).getByRole('alert');
    expect(alert.textContent).toBe(
      'This browser window didn’t go fullscreen. Try again, or use the browser’s own menu.',
    );
    expect(alert.closest('section')?.querySelector('h3')?.textContent).toContain('Display & motion');
  });
});
