import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { acts } from '../../../src/shell/rail/acts';
import { seenKey, useUnseen } from '../../../src/shell/unseen';
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

const kept = () => JSON.parse(localStorage.getItem(seenKey()) ?? 'null') as Record<string, string[]> | null;
const servedThrough = (served: number) => Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 2]));

describe('what is new since the last look', () => {
  it('counts everything as seen in a browser that has never kept a record', () => {
    const { result } = renderHook(() => useUnseen('shelf', ['order-pad', 'recipe-card']));
    expect(result.current.fresh).toEqual([]);
    expect(kept()).toEqual({ shelf: ['order-pad', 'recipe-card'] });
  });

  it('marks what arrives after the record, until it is looked at', () => {
    localStorage.setItem(seenKey(), JSON.stringify({ shelf: ['order-pad'], guestbook: ['4'] }));
    const { result } = renderHook(() => useUnseen('shelf', ['order-pad', 'recipe-card']));
    expect(result.current.fresh).toEqual(['recipe-card']);
    let arrived: string[] = [];
    act(() => {
      arrived = result.current.markSeen();
    });
    expect(arrived).toEqual(['recipe-card']);
    expect(result.current.fresh).toEqual([]);
    // The other list keeps its own record.
    expect(kept()).toEqual({ shelf: ['order-pad', 'recipe-card'], guestbook: ['4'] });
  });

  it('forgets what is no longer earned, so a fresh start marks it new again', () => {
    localStorage.setItem(seenKey(), JSON.stringify({ shelf: ['order-pad', 'recipe-card'] }));
    renderHook(() => useUnseen('shelf', []));
    expect(kept()).toEqual({ shelf: [] });
    const { result } = renderHook(() => useUnseen('shelf', ['order-pad']));
    expect(result.current.fresh).toEqual(['order-pad']);
  });

  it('shrugs off a record it cannot read', () => {
    localStorage.setItem(seenKey(), '{not json');
    const { result } = renderHook(() => useUnseen('guestbook', ['4']));
    expect(result.current.fresh).toEqual([]);
  });

  it('puts a mark on the shelf when a keepsake comes in, and takes it off once looked at', () => {
    localStorage.setItem(seenKey(), JSON.stringify({ shelf: [], guestbook: ['4', '5', '6', '7', '8'] }));
    seedLocalStorage(makeSave({ unlocked: acts[1].to, selected: acts[1].to, stars: servedThrough(acts[1].to) }));
    const { container } = render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    // The book has nothing new; the shelf has the order pad.
    expect(screen.getByRole('button', { name: 'Guestbook, 5 notes' })).toBeTruthy();
    const shelf = screen.getByRole('button', { name: /^Shelf, 1 of \d+ keepsakes, 1 new$/ });
    expect(shelf.querySelector('.shell-icon-new')).toBeTruthy();
    fireEvent.click(shelf);
    const window = screen.getByRole('dialog', { name: 'The shelf.' });
    expect(within(window).getByText('New on the shelf')).toBeTruthy();
    fireEvent.click(within(window).getByRole('button', { name: 'Close dialog' }));
    expect(screen.getByRole('button', { name: /^Shelf, 1 of \d+ keepsakes$/ })).toBeTruthy();
    expect(container.querySelector('.shell-icon-new')).toBeNull();
  });
});
