import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels, titleFor } from '../../../src/data';
import { narrativeFor } from '../../../src/data/campaign/narrative';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { GameProvider } from '../../../src/state/GameStore';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/campaign';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => vi.restoreAllMocks());

/** Exercise the real campaign and store with graphics unavailable. */
function openCampaign(save = makeSave()) {
  seedLocalStorage(save);
  return render(
    <GameProvider>
      <CampaignPage />
    </GameProvider>,
  );
}

const selectedShift = () => screen.getByRole('button', { pressed: true });

describe('campaign order rail', () => {
  it('keeps the complete brief and launch controls available without WebGL', async () => {
    openCampaign();
    const notes = within(screen.getByRole('complementary', { name: 'Selected shift' }));
    expect(notes.getByRole('heading', { name: titleFor(0) })).toBeTruthy();
    expect(notes.getByText(narrativeFor(0).hint)).toBeTruthy();
    expect(screen.queryByText('The café is still open.')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 1:');
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    expect(screen.getByRole('button', { name: /Order up/ }).hasAttribute('disabled')).toBe(true);
    await waitFor(() => expect(window.location.hash).toBe('#/shift/1'));
  });

  it('turns only through unlocked shifts and launches the selected story', async () => {
    openCampaign(makeSave({ unlocked: 2, selected: 0, stars: { 0: 0, 1: 3 } }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toBe('Scene: The Scrapyard, seen');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 2:');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 3:');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: /^Shift 4:/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 3:');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 2:');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(within(screen.getByRole('complementary')).getByText(narrativeFor(2).hint)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await waitFor(() => expect(window.location.hash).toBe('#/shift/3'));
  });

  it('offers a served shift again and reads its star targets in words', async () => {
    openCampaign(makeSave({ unlocked: 2, selected: 1, stars: { 0: 0, 1: 3 } }));
    const board = within(screen.getByRole('complementary', { name: 'Selected shift' }));
    expect(board.getByText('Two stars')).toBeTruthy();
    expect(board.getByText(`${levels[1].block_target} blocks or fewer`)).toBeTruthy();
    expect(board.getByText(`${levels[1].instruction_target} steps or fewer`)).toBeTruthy();
    fireEvent.click(board.getByRole('button', { name: 'Serve again' }));
    await waitFor(() => expect(window.location.hash).toBe('#/shift/2'));
  });

  it('leaves arrows to editable fields and modified shortcuts', () => {
    openCampaign(makeSave({ unlocked: 2, selected: 0 }));
    const field = document.createElement('div');
    field.setAttribute('contenteditable', '');
    document.body.append(field);
    try {
      fireEvent.keyDown(field, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
      expect(selectedShift().getAttribute('aria-label')).toContain('Shift 1:');
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(selectedShift().getAttribute('aria-label')).toContain('Scene: The Scrapyard');
    } finally {
      field.remove();
    }
  });

  it('centres the current act on the rail and launches at once under reduced motion', () => {
    const save = makeSave({ unlocked: 2, selected: 0, stars: { 0: 0, 1: 0 } });
    openCampaign({ ...save, settings: { ...save.settings, reduced_motion: true } });
    const rail = document.querySelector<HTMLElement>('.pass')!;
    const scrollTo = vi.fn();
    Object.defineProperties(rail, {
      scrollWidth: { value: 1400 },
      clientWidth: { value: 600 },
      scrollTo: { value: scrollTo },
    });
    const ticket = document.querySelector<HTMLElement>('[data-act="1"]')!;
    Object.defineProperties(ticket, { offsetLeft: { value: 320 }, offsetWidth: { value: 258 } });
    fireEvent.click(screen.getByRole('button', { name: /Act I · Query/ }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 149, behavior: 'auto' });
    expect(screen.getByRole('button', { name: /Act I · Query/ }).getAttribute('aria-current')).toBe('step');
    expect(document.querySelector('.campaign-page.still')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    expect(window.location.hash).toBe('#/shift/3');
  });

  it('stops at the finale and preserves access to the ending', () => {
    openCampaign(
      makeSave({
        unlocked: levels.length - 1,
        selected: levels.length - 1,
        complete: true,
        stars: Object.fromEntries(levels.map((_, index) => [index, index < 1 ? 0 : 3])),
      }),
    );
    expect(selectedShift().getAttribute('aria-label')).toContain(`Shift ${levels.length}:`);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toBe('Scene: Closing Time, seen');
    const board = within(screen.getByRole('complementary', { name: 'Selected scene' }));
    expect(board.getByText('The last shift')).toBeTruthy();
    fireEvent.click(board.getByRole('button', { name: 'Watch again' }));
    expect(window.location.hash).toBe('#/ending');
  });

  it('holds the next shift behind its scene until the scene is watched', () => {
    openCampaign(makeSave({ unlocked: 1, selected: 1, stars: { 0: 0 }, story: { 0: true } }));
    expect(selectedShift().getAttribute('aria-label')).toBe('Scene: The Scrapyard, next up');
    expect(screen.getByRole('button', { name: /^Shift 2: .*, locked$/ }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Scene: The Keys, seen' })).toBeTruthy();
    const board = within(screen.getByRole('complementary', { name: 'Selected scene' }));
    expect(board.getByRole('heading', { name: 'The Scrapyard' })).toBeTruthy();
    expect(board.getByText('Shift 02')).toBeTruthy();
    expect(board.getByText('8')).toBeTruthy();
    // Arrows stop at the scene: the shift behind it can't be reached yet.
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Scene: The Scrapyard');
    fireEvent.click(board.getByRole('button', { name: 'Watch scene' }));
    expect(window.location.hash).toBe('#/scene/the-scrapyard');
  });

  it('unrolls every reached act and lands on its next unfinished part', () => {
    openCampaign(makeSave({ unlocked: 4, selected: 0, stars: { 0: 0, 1: 3, 2: 2 } }));
    expect(screen.getByRole('button', { name: /^Shift 1:/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Shift 3:/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Act I · Query/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 4:');
    expect(screen.getByRole('button', { name: 'Act II, locked until Act I is served' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.getAllByText('Opens soon').length).toBe(3);
    expect(screen.queryByText('Brew')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Shift 9:/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Prologue · Niko/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 1:');
    const recipe = within(screen.getByRole('complementary', { name: 'Selected shift' }));
    expect(recipe.getByRole('heading', { name: titleFor(0) })).toBeTruthy();
    expect(recipe.getByText('Watch only')).toBeTruthy();
  });
});
