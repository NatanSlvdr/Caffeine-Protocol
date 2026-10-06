import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import {
  CAFES_KEY,
  SAVE_KEY,
  backupKey,
  cafeKey,
  newSave,
  openCafeId,
  writeCafes,
} from '../../../src/features/campaign/save/persistence';
import { benchKey } from '../../../src/features/workspace/bench';
import { seenKey } from '../../../src/shell/unseen';
import type * as Navigation from '../../../src/shared/lib/navigation';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

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

const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const list = () => screen.getByRole('list', { name: 'Cafés' });
const rows = () => within(list()).getAllByRole('listitem');
const row = (name: string) => rows().find((li) => li.querySelector('strong')?.textContent === name)!;
const cafesStatus = () =>
  within(screen.getByRole('heading', { name: 'Cafés in this browser' }).parentElement!).getByRole('status');
/** The page coming back after a reload, as a browser brings it back. */
function reload() {
  expect(reloadPage).toHaveBeenCalledOnce();
  reloadPage.mockClear();
  cleanup();
  render(<App />);
}
const stored = (key = SAVE_KEY) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('cafés in this browser', () => {
  it('finds a café from before there could be several as the first, untouched', () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    // One café needs no name on the front door.
    expect(screen.queryByRole('button', { name: /switch cafés/ })).toBeNull();
    openSettings();
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('First café');
    expect(rows()[0].textContent).toContain('Open now · 2 served shifts and 3 stars');
    // The café a tab plays can be renamed and started over, but not opened or removed.
    expect(within(rows()[0]).queryByRole('button', { name: 'Open First café' })).toBeNull();
    expect(within(rows()[0]).queryByRole('button', { name: 'Remove First café' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Start this café over' })).toBeTruthy();
  });

  it('adds a café that opens fresh, with the settings it was added from', () => {
    const save = makeSave({ unlocked: 3, stars: { 0: 0, 1: 3, 2: 2 } });
    seedLocalStorage({ ...save, settings: { ...save.settings, music: 0.25 } });
    render(<App />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Add a café' }));
    const name = screen.getByRole('textbox', { name: 'Name the new café' }) as HTMLInputElement;
    expect(name.value).toBe('Café 2');
    expect(document.activeElement).toBe(name);
    fireEvent.change(name, { target: { value: '  Night   shift ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
    expect(stored(CAFES_KEY)).toEqual({
      open: '2',
      cafes: [
        { id: 'first', name: 'First café' },
        { id: '2', name: 'Night shift' },
      ],
    });
    reload();
    expect(openCafeId()).toBe('2');
    expect(stored(cafeKey()).unlocked).toBe(newSave().unlocked);
    expect(stored(cafeKey()).settings.music).toBe(0.25);
    // The first café is as it was.
    expect(stored().unlocked).toBe(3);
    // With two, the front door says which café this is.
    fireEvent.click(screen.getByRole('button', { name: 'Night shift: switch cafés in Settings' }));
    expect(row('Night shift').textContent).toContain('Open now · No shifts served yet');
    expect(row('First café').textContent).toContain('3 served shifts');
    fireEvent.click(within(row('First café')).getByRole('button', { name: 'Open First café' }));
    reload();
    expect(openCafeId()).toBe('first');
    expect(stored(CAFES_KEY).open).toBe('first');
  });

  it('keeps each café’s kept copy, marks and benches apart, and shares the notebook', () => {
    writeCafes(localStorage, {
      open: '2',
      cafes: [
        { id: 'first', name: 'First café' },
        { id: '2', name: 'Two' },
      ],
    });
    seedLocalStorage(makeSave({ unlocked: 4 }));
    render(<App />);
    expect(backupKey()).toBe(`${SAVE_KEY}.cafe-2.backup`);
    expect(seenKey()).toBe(`${SAVE_KEY}.cafe-2.seen`);
    expect(benchKey()).toBe(`${SAVE_KEY}.cafe-2.bench`);
    // Café 2 had nothing kept, so it opens fresh and saves under its own key.
    expect(stored(cafeKey()).unlocked).toBe(newSave().unlocked);
    expect(stored().unlocked).toBe(4);
  });

  it('renames a café, and gives the focus back to its Rename button', () => {
    render(<App />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Rename First café' }));
    const input = screen.getByRole('textbox', { name: 'New name for First café' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveProperty('disabled', true);
    fireEvent.change(input, { target: { value: 'Lou’s, mornings' } });
    fireEvent.submit(input);
    expect(rows()[0].querySelector('strong')!.textContent).toBe('Lou’s, mornings');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Lou’s, mornings' }));
    expect(cafesStatus().textContent).toBe('Renamed “First café”.');
    expect(stored(CAFES_KEY).cafes[0].name).toBe('Lou’s, mornings');
  });

  it('removes another café, after asking, with all it kept', () => {
    writeCafes(localStorage, {
      open: 'first',
      cafes: [
        { id: 'first', name: 'First café' },
        { id: '2', name: 'Two' },
      ],
    });
    localStorage.setItem(cafeKey('2'), JSON.stringify(makeSave({ unlocked: 2, stars: { 0: 1, 1: 2 } })));
    localStorage.setItem(`${cafeKey('2')}.bench`, '{}');
    render(<App />);
    openSettings();
    fireEvent.click(within(row('Two')).getByRole('button', { name: 'Remove Two' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove this café?' });
    expect(dialog.textContent).toContain('“Two” holds 2 served shifts and 2 stars.');
    expect(within(dialog).getByRole('button', { name: 'Export café' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep café' }));
    expect(rows()).toHaveLength(2);
    fireEvent.click(within(row('Two')).getByRole('button', { name: 'Remove Two' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Remove this café?' })).getByRole('button', {
        name: 'Remove café',
      }),
    );
    expect(rows()).toHaveLength(1);
    expect(cafesStatus().textContent).toBe('Removed “Two”.');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add a café' }));
    expect(Object.keys(localStorage).filter((key) => key.includes('cafe-2'))).toEqual([]);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('adds an imported café beside this one instead of replacing it', async () => {
    seedLocalStorage(makeSave({ unlocked: 2 }));
    render(<App />);
    openSettings();
    const text = JSON.stringify(makeSave({ unlocked: 4, stars: { 0: 3, 1: 3, 2: 3 } }));
    fireEvent.change(screen.getByLabelText('Import save file'), {
      target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
    });
    const dialog = await screen.findByRole('dialog', { name: 'Replace this café?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add as a new café' }));
    expect(row('Imported café').textContent).toContain('3 served shifts and 6 stars');
    expect(stored(cafeKey('2')).unlocked).toBe(4);
    expect(stored().unlocked).toBe(2);
    expect(reloadPage).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole('heading', { name: 'Your café, saved' }).parentElement!).getByRole('status').textContent,
    ).toBe('Added “Imported café”: 3 served shifts and 6 stars. Open it from Cafés in this browser.');
    // With two cafés, replacing names the one replaced.
    fireEvent.change(screen.getByLabelText('Import save file'), {
      target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
    });
    expect((await screen.findByRole('dialog', { name: 'Replace this café?' })).textContent).toContain(
      'will replace the progress, routines and settings of “First café”.',
    );
  });

  it('opens the café another tab left open, once this one is removed there', () => {
    writeCafes(localStorage, {
      open: '2',
      cafes: [
        { id: 'first', name: 'First café' },
        { id: '2', name: 'Two' },
      ],
    });
    render(<App />);
    const removed = JSON.stringify({ open: 'first', cafes: [{ id: 'first', name: 'First café' }] });
    localStorage.setItem(CAFES_KEY, removed);
    window.dispatchEvent(new StorageEvent('storage', { key: CAFES_KEY, newValue: removed }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('stops offering another café once the browser holds eight', () => {
    writeCafes(localStorage, {
      open: 'first',
      cafes: [
        { id: 'first', name: 'First café' },
        ...[2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `${n}`, name: `C${n}` })),
      ],
    });
    render(<App />);
    openSettings();
    expect(screen.getByRole('button', { name: 'Add a café' })).toHaveProperty('disabled', true);
    expect(screen.getByText(/8 cafés is as many as one browser keeps/)).toBeTruthy();
  });
});
