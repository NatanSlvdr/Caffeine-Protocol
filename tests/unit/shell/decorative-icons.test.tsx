import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

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

/** Drawn icons that a screen reader would still reach: each should be hidden, or carry a name of its own. */
function exposedIcons() {
  return [...document.querySelectorAll('svg')]
    .filter((svg) => !svg.closest('[aria-hidden="true"]') && !svg.getAttribute('aria-label'))
    .map((svg) => svg.getAttribute('class'));
}

describe('decorative icons', () => {
  it('stay out of the way of screen readers on every screen', () => {
    const save = makeSave();
    save.unlocked = 20;
    for (const hash of ['/', '/campaign', '/shift/3', '/shift/18']) {
      seedLocalStorage(save);
      window.location.hash = hash;
      render(<App />);
      expect(exposedIcons(), hash).toEqual([]);
      // The settings window opens over the home page and the rail.
      const settings = screen.queryAllByRole('button', { name: 'Settings' })[0];
      if (settings) {
        fireEvent.click(settings);
        expect(exposedIcons(), `${hash} settings`).toEqual([]);
      }
      cleanup();
    }
  });
});
