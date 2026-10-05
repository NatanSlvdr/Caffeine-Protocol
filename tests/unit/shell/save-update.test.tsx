import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { lessons } from '../../../src/data';
import {
  SAVE_KEY,
  backupSave,
  migrationChanges,
  newSave,
  readBackup,
} from '../../../src/features/campaign/save/persistence';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import saveV1 from '../../fixtures/save-v1.json';
import saveV2 from '../../fixtures/save-v2.json';

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

const QUERY =
  'Query reads orders as token puzzles now, so its old routines couldn’t come along: the Prologue and Act I shifts you’d reached stay open, but start again from Query’s opening routines, with their stars and scenes to earn again.';
/** The v2 fixture, as the 32-shift save that came after Query's puzzles: Shifts 14, 23 and 24 served. */
const saveV3 = { ...saveV2, version: 3 };
const changes = (save: object) => migrationChanges(JSON.stringify(save), lessons);

describe('what bringing an older café up to date changed', () => {
  it('names Query’s new puzzles, the shifts that carried over, and the new ones', () => {
    expect(changes(saveV2)).toEqual([
      QUERY,
      'The campaign is 21 shifts long now, not 32: 1 of your other 2 served shifts carried over with its stars and routines.',
      'Shifts 17–21 are new.',
    ]);
    expect(changes(saveV3)).toEqual([
      'The campaign is 21 shifts long now, not 32: 1 of your 3 served shifts carried over with its stars and routines.',
      'Shifts 17–21 are new.',
    ]);
  });

  it('leaves out a count Query’s change already explains', () => {
    // Every shift the v1 fixture served was in Act I.
    expect(changes(saveV1)).toEqual([QUERY, 'Shifts 17–21 are new.']);
  });

  it('counts every shift when they all carried over, and none when none did', () => {
    const v3 = (stars: Record<number, number>) => changes({ ...saveV3, stars });
    expect(v3({ 0: 3, 2: 2, 3: 1 })[0]).toBe(
      'The campaign is 21 shifts long now, not 32: all your 3 served shifts carried over with their stars and routines.',
    );
    expect(v3({ 0: 3 })[0]).toBe(
      'The campaign is 21 shifts long now, not 32: your 1 served shift carried over with its stars and routines.',
    );
    expect(v3({ 1: 3, 5: 2 })[0]).toBe(
      'The campaign is 21 shifts long now, not 32: none of your 2 served shifts carried over.',
    );
  });

  it('says a finished café has new shifts to serve before it is finished again', () => {
    expect(changes({ ...saveV3, complete: true }).at(-1)).toBe(
      'Shifts 17–21 are new, so the café isn’t finished until they’re served too.',
    );
  });

  it('says nothing of a current café, one nobody played in, or one that doesn’t read', () => {
    expect(changes(makeSave({ unlocked: 3, stars: { 0: 3, 1: 3, 2: 3 } }))).toEqual([]);
    expect(changes({ ...newSave(), version: 3 })).toEqual([]);
    expect(migrationChanges('{broken', lessons)).toEqual([]);
  });

  it('is kept with the copy taken before the update, and only that copy', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveV3));
    backupSave(localStorage, 'migration', lessons);
    expect(readBackup(localStorage, lessons)?.changes).toEqual(changes(saveV3));
    backupSave(localStorage, 'import', lessons);
    expect(readBackup(localStorage, lessons)?.changes).toBeUndefined();
  });
});

describe('telling the player', () => {
  const note = () => screen.queryByText('Your café was brought up to date.')?.closest('.save-notice');

  it('says what changed once, on the visit that updated the café', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveV3));
    const { unmount } = render(<App />);
    expect(note()?.getAttribute('role')).toBe('status');
    expect(note()?.textContent).toBe(`Your café was brought up to date. ${changes(saveV3).join(' ')}`);
    fireEvent.click(within(note() as HTMLElement).getByRole('button', { name: 'Dismiss' }));
    expect(note()).toBeFalsy();
    unmount();
    // The first save made it current, so the next visit has no news.
    render(<App />);
    expect(note()).toBeFalsy();
  });

  it('keeps the account in Settings, beside the copy from before', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveV3));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const kept = document.querySelector('.settings-backup') as HTMLElement;
    expect(within(kept).getByText('What the update changed:')).toBeTruthy();
    expect(
      within(kept)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(changes(saveV3));
  });

  it('says what importing an older export will change, before anything is replaced', async () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 0, 1: 3 } }));
    render(<App />);
    expect(note()).toBeFalsy();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const text = JSON.stringify(saveV2);
    fireEvent.change(screen.getByLabelText('Import save file'), {
      target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
    });
    const slip = (await screen.findByRole('button', { name: 'Replace café' })).closest('dialog') as HTMLElement;
    expect(within(slip).getByText('It was saved by an older version of the game, so:')).toBeTruthy();
    expect(
      within(slip)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(changes(saveV2));
    fireEvent.click(within(slip).getByRole('button', { name: 'Replace café' }));
    // The import is what was asked for; it brings no update note of its own.
    expect(note()).toBeFalsy();
  });
});
