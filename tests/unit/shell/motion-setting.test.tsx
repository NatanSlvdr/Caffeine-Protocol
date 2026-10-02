import { fireEvent, render, screen } from '@testing-library/react';
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
  delete (window as { matchMedia?: unknown }).matchMedia;
});

function motionSetting(deviceAsks: boolean) {
  window.matchMedia = ((query: string) =>
    ({ matches: deviceAsks && query.includes('reduce'), media: query }) as MediaQueryList) as typeof window.matchMedia;
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  const box = screen.getByRole('checkbox', { name: 'Reduced motion' }) as HTMLInputElement;
  return { box, hint: document.getElementById(box.getAttribute('aria-describedby')!)?.textContent };
}

describe('reduced motion setting', () => {
  it('shows the device’s own request for less motion as on, and says why it can’t be turned off', () => {
    const { box, hint } = motionSetting(true);
    expect([box.checked, box.disabled]).toEqual([true, true]);
    expect(hint).toBe('On, because your device asks for less motion.');
  });

  it('is the player’s to choose otherwise', () => {
    const { box, hint } = motionSetting(false);
    expect([box.checked, box.disabled]).toEqual([false, false]);
    expect(hint).toBe('Keep the movement, skip the extra animation.');
    fireEvent.click(box);
    expect(box.checked).toBe(true);
  });
});
