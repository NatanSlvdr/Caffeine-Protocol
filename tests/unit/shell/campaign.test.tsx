import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels, titleFor } from '../../../src/data';
import { narrativeFor, stories } from '../../../src/data/campaign/narrative';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { GameProvider } from '../../../src/state/GameStore';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), playSound: vi.fn(), startAudio: vi.fn() }));

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
    expect(notes.getByText(narrativeFor(0).objective)).toBeTruthy();
    expect(screen.queryByText('The café is still open.')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 1:');
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    expect(screen.getByRole('button', { name: /Order up/ }).hasAttribute('disabled')).toBe(true);
    await waitFor(() => expect(window.location.hash).toBe('#/shift/1'));
  });

  it('turns only through unlocked shifts and launches the selected story', async () => {
    openCampaign(makeSave({ unlocked: 2, selected: 1, stars: { 0: 0, 1: 0 } }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 3:');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: /^Shift 4:/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 3:');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 2:');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(within(screen.getByRole('complementary')).getByText(narrativeFor(2).objective)).toBeTruthy();
    expect(stories[2]).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start shift' }));
    await waitFor(() => expect(window.location.hash).toBe('#/interlude/3'));
  });

  it('leaves arrows to editable fields and modified shortcuts', () => {
    openCampaign(makeSave({ unlocked: 2, selected: 1 }));
    const field = document.createElement('div');
    field.setAttribute('contenteditable', '');
    document.body.append(field);
    try {
      fireEvent.keyDown(field, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
      expect(selectedShift().getAttribute('aria-label')).toContain('Shift 2:');
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(selectedShift().getAttribute('aria-label')).toContain('Shift 3:');
    } finally {
      field.remove();
    }
  });

  it('centres the current act on the rail and launches at once under reduced motion', () => {
    const save = makeSave({ unlocked: 2, selected: 1, stars: { 0: 0, 1: 0 } });
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
    expect(window.location.hash).toBe('#/interlude/3');
  });

  it('stops at the finale and preserves access to the ending', () => {
    openCampaign(
      makeSave({
        unlocked: levels.length - 1,
        selected: levels.length - 1,
        complete: true,
        stars: Object.fromEntries(levels.map((_, index) => [index, index < 2 ? 0 : 3])),
      }),
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selectedShift().getAttribute('aria-label')).toContain(`Shift ${levels.length}:`);
    fireEvent.click(screen.getByRole('button', { name: 'Revisit closing time' }));
    expect(window.location.hash).toBe('#/ending');
  });

  it('opens one act at a time and lands on its next unfinished part', () => {
    openCampaign(makeSave({ unlocked: 5, selected: 1, stars: { 0: 0, 1: 0, 2: 3, 3: 2 } }));
    expect(screen.queryByRole('button', { name: /^Shift 3:/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Act I · Query/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 5:');
    expect(screen.queryByRole('button', { name: /^Shift 1:/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Act II, sealed' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('Brew')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Shift 15/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Prologue · Niko/ }));
    expect(selectedShift().getAttribute('aria-label')).toContain('Shift 1:');
    const recipe = within(screen.getByRole('complementary', { name: 'Selected shift' }));
    expect(recipe.getByRole('heading', { name: titleFor(0) })).toBeTruthy();
    expect(recipe.getByText('Watch only')).toBeTruthy();
  });
});
