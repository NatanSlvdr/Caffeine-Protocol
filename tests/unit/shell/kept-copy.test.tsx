import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { BACKUP_KEY, SAVE_KEY, newSave } from '../../../src/features/campaign/save/persistence';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import saveV1 from '../../fixtures/save-v1.json';

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

const stored = () => JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const kept = () => document.querySelector('.settings-backup p')?.textContent;

describe('the kept copy, in Settings', () => {
  it('offers nothing before the café has ever been replaced', () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    openSettings();
    expect(screen.queryByRole('button', { name: 'Restore kept copy' })).toBeNull();
  });

  it('takes back a fresh start, and keeps the fresh café as the copy no more', () => {
    seedLocalStorage(makeSave({ unlocked: 3, stars: { 0: 0, 1: 3, 2: 2 } }));
    render(<App />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new café' }));
    expect(screen.getByText(/A copy is kept in Settings/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start new café' }));
    expect(stored().unlocked).toBe(0);
    openSettings();
    expect(kept()).toMatch(/^Kept from before you started a new café, .+: 3 served shifts and 5 stars\.$/);
    fireEvent.click(screen.getByRole('button', { name: 'Restore kept copy' }));
    expect(screen.getByText(/^The kept copy holds/).textContent).toBe(
      'The kept copy holds 3 served shifts and 5 stars. Restoring it will replace your current progress, routines and settings.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore copy' }));
    expect(stored().unlocked).toBe(3);
    expect(stored().stars).toEqual({ 0: 0, 1: 3, 2: 2 });
    expect(screen.getByRole('status').textContent).toBe('Café restored: 3 served shifts and 5 stars.');
  });

  it('takes back an import, keeping the imported café in its place so it can be swapped back', async () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    openSettings();
    const text = JSON.stringify({ ...newSave(), unlocked: 4, stars: { 0: 1, 1: 3, 2: 2, 3: 1 } });
    fireEvent.change(screen.getByLabelText('Import save file'), {
      target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Replace café' }));
    expect(stored().unlocked).toBe(4);
    expect(kept()).toMatch(/^Kept from before your last import, .+: 2 served shifts and 3 stars\.$/);
    fireEvent.click(screen.getByRole('button', { name: 'Restore kept copy' }));
    expect(screen.getByText(/^The kept copy holds/).textContent).toContain('and keep this café as the copy instead.');
    fireEvent.click(screen.getByRole('button', { name: 'Restore copy' }));
    expect(stored().unlocked).toBe(2);
    expect(kept()).toMatch(/^Kept from before you last restored a copy, .+: 4 served shifts and 6 stars\.$/);
  });

  it('keeps a café from an older version as it was, before saving it in the new one', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveV1));
    render(<App />);
    expect(stored().version).toBe(4);
    expect(JSON.parse(localStorage.getItem(BACKUP_KEY) ?? '{}').raw).toBe(JSON.stringify(saveV1));
    openSettings();
    expect(kept()).toMatch(/^Kept from before the game updated its save, /);
  });

  it('doesn’t promise a copy of a café with nothing in it', () => {
    render(<App />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new café' }));
    expect(screen.getByText('Export your current café first if you want to return to it.')).toBeTruthy();
  });
});
