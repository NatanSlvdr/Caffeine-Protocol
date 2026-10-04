import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { narrativeFor } from '../../../src/data/campaign/narrative';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

/** Says it opens a window, then does. */
function opensWindow(name: string, window: string) {
  const button = screen.getAllByRole('button', { name })[0];
  expect(button.getAttribute('aria-haspopup'), name).toBe('dialog');
  fireEvent.click(button);
  expect(screen.getByRole('dialog', { name: window })).toBeTruthy();
}

describe('buttons that open a window', () => {
  it('say so before they are pressed', () => {
    const save = makeSave();
    save.unlocked = 2;
    save.selected = 2;
    save.robotDrafts = { 2: { query: 'LISTEN\nWRITE', prep: '', floor: '' } };
    for (const hash of ['/', '/campaign']) {
      seedLocalStorage(save);
      window.location.hash = hash;
      render(<App />);
      opensWindow('How to play', 'How the café runs.');
      fireEvent.click(screen.getByRole('button', { name: /Close/ }));
      opensWindow('Settings', 'The little things.');
      opensWindow('Start a new café', 'Start a new café?');
      cleanup();
    }
    seedLocalStorage(save);
    window.location.hash = '/shift/3';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    opensWindow('Help', narrativeFor(2).title);
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    opensWindow('Options', 'Workspace options');
    opensWindow('Restore Query’s routine', 'Restore Query’s routine');
  });
});
