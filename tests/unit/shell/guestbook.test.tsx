import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN_LENGTH, titleFor } from '../../../src/data';
import { cast } from '../../../src/data/campaign/cast';
import { shiftIntro, shiftOutro } from '../../../src/data/campaign/dialogue';
import { guestbook, guestbookNotes } from '../../../src/data/campaign/guestbook';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { GameProvider } from '../../../src/state/GameStore';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/campaign';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

/** Stars for the first `served` shifts, as a café that has played that far would have them. */
const servedThrough = (served: number) => Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 3]));

describe('the guestbook', () => {
  it('is written by regulars about shifts they were really part of', () => {
    const shifts = guestbook.map((note) => note.shift);
    expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
    expect(new Set(shifts).size).toBe(shifts.length);
    for (const note of guestbook) {
      expect(note.shift).toBeGreaterThanOrEqual(1);
      expect(note.shift).toBeLessThanOrEqual(CAMPAIGN_LENGTH);
      expect(cast[note.who].customer, note.who).toBe(true);
      expect(note.who).not.toBe('guest');
      const scenes = [...shiftIntro(note.shift - 1), ...shiftOutro(note.shift - 1)];
      expect(
        scenes.some((line) => line.who === note.who),
        `${note.who} in shift ${note.shift}`,
      ).toBe(true);
      // Thanks for what went right: no stars, hints, tries or slips.
      expect(note.text).not.toMatch(/star|hint|\btr(y|ies|ied)\b|retr|fail|mistake|wrong|again/i);
    }
    // Every regular gets a say.
    expect(new Set(guestbook.map((note) => note.who))).toEqual(new Set(['albert', 'juno', 'dot', 'rosa']));
  });

  it('opens a note only once its shift has been served', () => {
    expect(guestbookNotes({ stars: {} })).toEqual([]);
    expect(guestbookNotes({ stars: servedThrough(5) }).map((note) => note.shift)).toEqual([4, 5]);
    // A one-star service is still a served shift.
    expect(guestbookNotes({ stars: { 7: 1 } }).map((note) => note.shift)).toEqual([8]);
    expect(guestbookNotes({ stars: servedThrough(CAMPAIGN_LENGTH) })).toEqual(guestbook);
  });

  it('waits on the campaign until a regular has something to say, then reads it out', () => {
    seedLocalStorage(makeSave());
    const { unmount } = render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    expect(screen.queryByRole('button', { name: /^Guestbook/ })).toBeNull();
    unmount();

    seedLocalStorage(makeSave({ unlocked: 6, selected: 6, stars: servedThrough(6) }));
    render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    // The book was empty when this browser last saw the campaign, so all three notes are new.
    const open = screen.getByRole('button', { name: 'Guestbook, 3 notes, 3 new' });
    fireEvent.click(open);
    const book = screen.getByRole('dialog', { name: 'Left by the till.' });
    const notes = within(book).getAllByRole('listitem');
    expect(notes).toHaveLength(3);
    expect(within(notes[0]).getByText(/^Tea\. Real tea/)).toBeTruthy();
    expect(within(notes[0]).getByText('J.')).toBeTruthy();
    expect(within(notes[0]).getByText(`Juno · After Shift 04, ${titleFor(3)}`)).toBeTruthy();
    // A regular who signs with their own name isn't named twice.
    expect(within(notes[2]).getByText('Rosa')).toBeTruthy();
    expect(within(notes[2]).getByText(`After Shift 06, ${titleFor(5)}`)).toBeTruthy();
    expect(within(book).getByText('The rest of the book is still blank.')).toBeTruthy();
    expect(within(book).getAllByText('New')).toHaveLength(3);
    fireEvent.click(within(book).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'Left by the till.' })).toBeNull();
    // Read once, they're no longer new.
    fireEvent.click(screen.getByRole('button', { name: 'Guestbook, 3 notes' }));
    expect(within(screen.getByRole('dialog', { name: 'Left by the till.' })).queryByText('New')).toBeNull();
  });
});
