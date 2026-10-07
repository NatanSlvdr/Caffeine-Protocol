import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { newSave } from '../../../src/features/campaign/save/persistence';
import { audioService } from '../../../src/shared/lib/audio';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const served = (shifts: number, more: object = {}) => ({
  ...newSave(),
  selected: shifts,
  unlocked: shifts,
  stars: Object.fromEntries(Array.from({ length: shifts }, (_, index) => [index, 3])),
  ...more,
});
const open = (save: object, hash: string) => {
  localStorage.setItem('caffeine-protocol.v1', JSON.stringify(save));
  window.location.hash = hash;
  return render(<App />);
};

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

describe('the music, voiced for the place on screen', () => {
  it('plays as recorded in the café, and through the wall from the repair bay', () => {
    const { unmount } = open(served(UNLOCKS.help), '#/campaign');
    expect(audioService.mood).toBe('cafe');
    fireEvent.click(screen.getByRole('button', { name: /^Repair bay/ }));
    expect(audioService.mood).toBe('after-hours');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(audioService.mood).toBe('cafe');
    unmount();
  });

  it('plays like an old record in a memory, until the memory is left', async () => {
    const { unmount } = open(served(UNLOCKS.help), '#/memory/day-one');
    expect(await screen.findByRole('dialog', { name: /^Memory · / })).toBeTruthy();
    expect(audioService.mood).toBe('memory');
    window.location.hash = '#/campaign';
    await screen.findByRole('heading', { name: 'Choose a shift' });
    expect(audioService.mood).toBe('cafe');
    unmount();
  });

  it('plays after hours at closing time', () => {
    const { unmount } = open({ ...served(21), selected: 20, unlocked: 20, complete: true }, '#/ending');
    expect(audioService.mood).toBe('after-hours');
    unmount();
    expect(audioService.mood).toBe('cafe');
  });
});
