import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN_LENGTH, isRated } from '../../../src/data';
import { UNLOCKS } from '../../../src/domain';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { acts } from '../../../src/shell/rail/acts';
import { keepsakes, shelved, veiled } from '../../../src/shell/shelf';
import { GameProvider } from '../../../src/state/GameStore';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
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

/** The first `served` shifts served, each with `stars` (the hand-served prologue too, as the save keeps it). */
const servedThrough = (served: number, stars = 2) =>
  Object.fromEntries(Array.from({ length: served }, (_, i) => [i, stars]));
const ids = (stars: Record<string, number>) => shelved({ stars }).map((keepsake) => keepsake.id);

describe('the shelf', () => {
  it('keeps a few distinct keepsakes, none for a streak, a grind or a setting left off', () => {
    expect(new Set(keepsakes.map((keepsake) => keepsake.id)).size).toBe(keepsakes.length);
    expect(keepsakes.length).toBeLessThanOrEqual(8);
    for (const keepsake of keepsakes) {
      expect(`${keepsake.goal} ${keepsake.story}`).not.toMatch(
        /streak|daily|in a row|every star|again|replay|without (help|hints)|setting|motion|first try/i,
      );
    }
  });

  it('puts each keepsake up as the save shows it was earned', () => {
    expect(ids({})).toEqual([]);
    // The prologue is served by hand and earns nothing on its own.
    expect(ids(servedThrough(1, 3))).toEqual([]);
    expect(ids(servedThrough(acts[1].to - 1))).toEqual([]);
    expect(ids(servedThrough(acts[1].to))).toEqual(['order-pad']);
    expect(ids(servedThrough(acts[2].to))).toEqual(['order-pad', 'recipe-card']);
    // The first shift Porter works is the first with the whole crew.
    expect(ids(servedThrough(UNLOCKS.floor))).toEqual(['order-pad', 'recipe-card', 'name-tags']);
    expect(ids(servedThrough(acts[3].to))).toEqual(['order-pad', 'recipe-card', 'name-tags', 'floor-plan']);
    expect(ids(servedThrough(CAMPAIGN_LENGTH))).toEqual([
      'order-pad',
      'recipe-card',
      'name-tags',
      'floor-plan',
      'closing-sign',
    ]);
    // A one-star service still serves the shift.
    expect(ids(servedThrough(acts[1].to, 1))).toEqual(['order-pad']);
  });

  it('gives the gold star for three stars across one whole act, and only that', () => {
    const actII = Object.fromEntries(Array.from({ length: acts[2].to }, (_, i) => [i, i >= acts[2].from ? 3 : 1]));
    expect(ids(actII)).toContain('gold-star');
    // One shift short of three stars in every act: no gold star.
    const short = { ...actII, [acts[2].to - 1]: 2 };
    expect(ids(short)).not.toContain('gold-star');
    // The prologue's only shift is unrated, so it can't stand in for a whole act.
    expect(acts[0].to - acts[0].from).toBeGreaterThan(0);
    expect(Array.from({ length: acts[0].to }, (_, i) => isRated(i)).some(Boolean)).toBe(false);
  });

  it('gives the stopwatch for an optional challenge met, on any shift', () => {
    const stars = servedThrough(UNLOCKS.floor + 1);
    expect(shelved({ stars }).map((keepsake) => keepsake.id)).not.toContain('stopwatch');
    expect(shelved({ stars, challenges: {} }).map((keepsake) => keepsake.id)).not.toContain('stopwatch');
    expect(shelved({ stars, challenges: { [UNLOCKS.floor]: ['walk'] } }).map((keepsake) => keepsake.id)).toContain(
      'stopwatch',
    );
  });

  it('keeps a keepsake under wraps while its act is sealed on the rail, and never one already earned', () => {
    const wrapped = (unlocked: number, stars: Record<string, number> = servedThrough(unlocked)) =>
      keepsakes.filter((keepsake) => veiled(keepsake, { unlocked, stars })).map((keepsake) => keepsake.id);
    expect(wrapped(0)).toEqual([
      'order-pad',
      'recipe-card',
      'name-tags',
      'floor-plan',
      'closing-sign',
      'gold-star',
      'stopwatch',
    ]);
    // Act I served opens Act II: Brew may be named now, Porter and a third robot not yet.
    expect(wrapped(acts[2].from)).toEqual(['name-tags', 'floor-plan', 'closing-sign', 'stopwatch']);
    expect(wrapped(acts[3].from)).toEqual(['closing-sign']);
    expect(wrapped(acts[4].from)).toEqual([]);
    // Whatever the save says is unlocked, a keepsake on the shelf shows itself.
    for (let served = 0; served <= CAMPAIGN_LENGTH; served++) {
      const stars = servedThrough(served, 3);
      for (const keepsake of shelved({ stars })) expect(veiled(keepsake, { unlocked: 0, stars })).toBe(false);
    }
  });

  it('goes up on the campaign with its first keepsake, and shows what is left to earn', () => {
    seedLocalStorage(makeSave());
    const { unmount } = render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    expect(screen.queryByRole('button', { name: /^Shelf/ })).toBeNull();
    unmount();

    seedLocalStorage(makeSave({ unlocked: acts[1].to, selected: acts[1].to, stars: servedThrough(acts[1].to) }));
    render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: `Shelf, 1 of ${keepsakes.length} keepsakes, 1 new` }));
    const shelf = screen.getByRole('dialog', { name: 'The shelf.' });
    const items = within(shelf).getAllByRole('listitem');
    expect(items).toHaveLength(keepsakes.length);
    expect(within(items[0]).getByRole('heading', { name: 'Query’s order pad' })).toBeTruthy();
    expect(within(items[0]).getByText('New on the shelf')).toBeTruthy();
    expect(within(items[0]).getByText(keepsakes[0].story)).toBeTruthy();
    expect(within(items[1]).getByText('Not yet')).toBeTruthy();
    expect(within(items[1]).getByText('Serve every shift of Act II.')).toBeTruthy();
    // Act III is still sealed, so nothing on the shelf names who works it.
    expect(shelf.textContent).not.toMatch(/Porter|three robots|floor/i);
    expect(within(shelf).getAllByRole('heading', { name: 'Under wraps' })).toHaveLength(4);
    expect(within(items[3]).getByText('Something for Act III. It comes out once Act II is served.')).toBeTruthy();
    fireEvent.click(within(shelf).getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByRole('dialog', { name: 'The shelf.' })).toBeNull();
  });

  it('picks the café’s looks from Lou’s and those earned, and keeps the pick with the café', () => {
    seedLocalStorage(makeSave({ unlocked: acts[1].to, selected: acts[1].to, stars: servedThrough(acts[1].to) }));
    render(
      <GameProvider>
        <CampaignPage />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Shelf/ }));
    const looks = within(screen.getByRole('dialog', { name: 'The shelf.' })).getByRole('region', {
      name: 'The café’s looks',
    });
    const prints = within(within(looks).getByRole('group', { name: 'The print by the window' })).getAllByRole('radio');
    const cushions = within(within(looks).getByRole('group', { name: 'The cushions' })).getAllByRole('radio');
    expect(prints.map((radio) => (radio as HTMLInputElement).checked)).toEqual([true, false, false]);
    expect(prints.map((radio) => (radio as HTMLInputElement).disabled)).toEqual([false, false, true]);
    expect(cushions.map((radio) => (radio as HTMLInputElement).disabled)).toEqual([false, true, true]);
    // A look still to earn says what earns it.
    expect(
      within(looks)
        .getByRole('radio', { name: /^Mustard and teal/ })
        .closest('label')!.textContent,
    ).toContain('Serve every shift of Act II.');

    fireEvent.click(within(looks).getByRole('radio', { name: /^The harbour/ }));
    expect((within(looks).getByRole('radio', { name: /^The harbour/ }) as HTMLInputElement).checked).toBe(true);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).decor).toEqual({ print: 'harbour' });
    fireEvent.click(within(looks).getByRole('radio', { name: /^Hills at noon/ }));
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).not.toHaveProperty('decor');
  });
});
