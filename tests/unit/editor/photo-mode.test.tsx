import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import App from '../../../src/App';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { photoFileName } from '../../../src/shared/lib/download';
import { photoCaption, photoFocus } from '../../../src/features/workspace/photo';

/** What the café's camera gives back when asked for a photo: nothing, as when the picture can't be read. */
let shot: Blob | null = null;
vi.mock('../../../src/components/Cafe', () => ({
  Cafe: ({
    focusRole,
    showStatusBubbles,
    showLabels,
    snapshot,
  }: {
    focusRole?: string;
    showStatusBubbles?: boolean;
    showLabels?: boolean;
    snapshot?: { current: (() => Promise<Blob | null>) | null };
  }) => {
    useEffect(() => {
      if (snapshot) snapshot.current = () => Promise.resolve(shot);
    }, [snapshot]);
    return (
      <div
        data-testid="cafe"
        data-focus-role={focusRole}
        data-bubbles={String(showStatusBubbles ?? true)}
        data-labels={String(showLabels)}
      />
    );
  },
}));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  shot = null;
  localStorage.clear();
  window.location.hash = '/shift/3';
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

/** Shift 3, with Query's routine set and the scene skipped. */
function ready() {
  seedLocalStorage({
    ...makeSave(),
    unlocked: 2,
    selected: 2,
    robotDrafts: { 2: { query: lessons[2].solution, prep: '', floor: '' } },
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
}
const cafe = () => screen.getByTestId('cafe');
const photoButton = () => screen.getByRole('button', { name: 'Photo mode' });
const bar = () => screen.getByRole('group', { name: 'Photo mode' });
const main = () => document.querySelector('.workspace-main')!;

describe('photo mode', () => {
  it('puts the routines away, frames the café a few set ways, and gives the view back on the way out', () => {
    ready();
    expect(cafe().dataset.focusRole).toBe('query');
    fireEvent.click(photoButton());
    expect(main().classList.contains('photo')).toBe(true);
    // The shutter takes focus from the button that was put away; the framing starts from the view on screen.
    expect(document.activeElement?.textContent).toMatch(/Save photo/);
    const framing = within(bar()).getByRole('group', { name: 'Framing' });
    expect(within(framing).getByRole('button', { name: 'Counter' }).getAttribute('aria-pressed')).toBe('true');
    // Nothing is drawn over the scene: what is seen is what is saved.
    expect(cafe().dataset.bubbles).toBe('false');
    expect(cafe().dataset.labels).toBe('false');
    fireEvent.click(within(framing).getByRole('button', { name: 'Kitchen' }));
    expect(cafe().dataset.focusRole).toBe('prep');
    fireEvent.click(within(framing).getByRole('button', { name: 'Whole café' }));
    expect(cafe().dataset.focusRole).toBeUndefined();
    // Escape leaves photo mode, not the shift.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.hash).toBe('#/shift/3');
    expect(main().classList.contains('photo')).toBe(false);
    expect(screen.queryByRole('group', { name: 'Photo mode' })).toBeNull();
    expect(cafe().dataset.focusRole).toBe('query');
    expect(cafe().dataset.bubbles).toBe('true');
    expect(document.activeElement).toBe(photoButton());
  });

  it('keeps every other shortcut off while it is open', () => {
    ready();
    fireEvent.click(photoButton());
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    expect(screen.queryByRole('button', { name: /Stop & edit/ })).toBeNull();
    fireEvent.click(within(bar()).getByRole('button', { name: /Done/ }));
    expect(main().classList.contains('photo')).toBe(false);
  });

  it('holds a playing service still, and plays it on again after', () => {
    ready();
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('button', { name: 'Pause playback' })).toBeTruthy();
    fireEvent.click(photoButton());
    expect(screen.getByRole('button', { name: 'Resume playback' })).toBeTruthy();
    fireEvent.click(within(bar()).getByRole('button', { name: /Done/ }));
    expect(screen.getByRole('button', { name: 'Pause playback' })).toBeTruthy();
    // A service paused before stays paused.
    fireEvent.click(screen.getByRole('button', { name: 'Pause playback' }));
    fireEvent.click(photoButton());
    fireEvent.click(within(bar()).getByRole('button', { name: /Done/ }));
    expect(screen.getByRole('button', { name: 'Resume playback' })).toBeTruthy();
  });

  it('waits while the shift’s scene is on, and for a slipping service to stop', () => {
    seedLocalStorage({ ...makeSave(), unlocked: 2, selected: 2 });
    render(<App />);
    expect(photoButton().hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(photoButton().hasAttribute('disabled')).toBe(false);
    // A routine on its way to a slip can't be paused, so it can't be held for a photo either.
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    expect(photoButton().hasAttribute('disabled')).toBe(true);
  });

  it('saves the café as a dated picture, and says where it went', async () => {
    ready();
    shot = new Blob(['png'], { type: 'image/png' });
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(photoButton());
    await act(async () => {
      fireEvent.click(within(bar()).getByRole('button', { name: /Save photo/ }));
    });
    expect(created).toHaveBeenCalledWith(shot);
    const link = clicked.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toMatch(/^caffeine-protocol-photo-\d{4}-\d{2}-\d{2}-\d{6}\.png$/);
    expect(within(bar()).getByRole('status').textContent).toBe(
      `Saved as ${link.download}. Look for it with your downloads.`,
    );
  });

  it('says so when the café can’t be photographed', async () => {
    ready();
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(photoButton());
    await act(async () => {
      fireEvent.click(within(bar()).getByRole('button', { name: /Save photo/ }));
    });
    expect(clicked).not.toHaveBeenCalled();
    expect(within(bar()).getByRole('status').textContent).toMatch(/couldn’t be photographed just now/);
    expect(
      within(bar())
        .getByRole('button', { name: /Save photo/ })
        .hasAttribute('disabled'),
    ).toBe(false);
  });
});

describe('a photo’s labels', () => {
  it('names the file by the player’s day and time, so a morning’s photos sort in order', () => {
    expect(photoFileName(new Date(2026, 9, 6, 9, 5, 7))).toBe('caffeine-protocol-photo-2026-10-06-090507.png');
  });

  it('captions the shift and the moment of service, or the café before it opens', () => {
    const date = new Date(2026, 9, 6);
    expect(photoCaption({ label: 'Shift 07', title: 'The Lunch Line', when: 'Round 2 · 14.3 s', date })).toEqual({
      title: 'Shift 07 · The Lunch Line',
      moment: 'Round 2 · 14.3 s',
      date: '6 October 2026',
    });
    expect(photoCaption({ label: 'Memory', title: 'Day One', date }).moment).toBe('Before opening');
  });

  it('frames the whole café, or one robot’s corner of it', () => {
    expect(photoFocus('cafe')).toBeUndefined();
    expect(photoFocus('floor')).toBe('floor');
  });
});
