import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY, newSave } from '../../../src/features/campaign/save/persistence';
import { lineDiff, routineVersions } from '../../../src/features/workspace/versions';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import type { ProgressSave } from '../../../src/domain';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
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
  localStorage.clear();
});

const programs = (query: string) => ({ query, prep: '', floor: '' });
// Shift 2's routine as the player served it, with a note of their own, so it isn't the shift 3 starter.
const carried = `# my first ticket\n${lessons[1].solution}`;
const served = lessons[2].solution;
const broken = served.replace('DEPOSIT RIGHT', 'DEPOSIT UP');

describe('routine versions', () => {
  it('name the last served routine, the one carried in and the starter, newest first', () => {
    const save: ProgressSave = {
      ...newSave(),
      unlocked: 2,
      robotSolutions: { 1: programs(carried), 2: programs(served) },
    };
    const versions = routineVersions(save, 2, lessons, 'query', 'Query');
    expect(versions.map((v) => [v.id, v.label])).toEqual([
      ['served', 'Last served'],
      ['carried', 'From Shift 02'],
      ['starter', 'Shift starter'],
    ]);
    expect(versions.map((v) => v.source)).toEqual([served, carried, lessons[2].starter]);
  });
  it('offer a shift that opened on its starter once, and nothing served before it is', () => {
    const versions = routineVersions({ ...newSave(), unlocked: 2 }, 2, lessons, 'query', 'Query');
    expect(versions.map((v) => v.id)).toEqual(['starter']);
    expect(routineVersions(newSave(), 2, lessons, 'prep', 'Brew')).toEqual([]);
  });
  it('line up two routines, taking out before putting back, without blank lines', () => {
    expect(lineDiff('LISTEN\n\nTAKE UP\nMOVE RIGHT 1', 'LISTEN\nTAKE UP\nITEM tea\nMOVE LEFT 1')).toEqual([
      { kind: 'same', text: 'LISTEN' },
      { kind: 'same', text: 'TAKE UP' },
      { kind: 'remove', text: 'MOVE RIGHT 1' },
      { kind: 'add', text: 'ITEM tea' },
      { kind: 'add', text: 'MOVE LEFT 1' },
    ]);
    expect(
      lineDiff('IF tea IN item\n  ITEM tea\nEND', 'IF tea IN item\nITEM tea\nEND').every((l) => l.kind === 'same'),
    ).toBe(true);
  });
});

describe('restoring a routine', () => {
  function open(draft: string, overrides: Partial<ProgressSave> = {}) {
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 3,
      selected: 2,
      stars: { 0: 3, 1: 3, 2: 2 },
      settings: { ...save.settings, text_editor: true },
      robotSolutions: { 1: programs(carried), 2: programs(served) },
      robotDrafts: { 2: programs(draft) },
      ...overrides,
    });
    render(<App />);
    const skip = screen.queryByRole('button', { name: 'Skip' });
    if (skip) fireEvent.click(skip);
  }
  const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).robotDrafts['2'].query;
  const slip = () => screen.getByRole('dialog', { name: 'Restore Query’s routine' });

  it('sets each earlier version against the routine now, and restores the chosen one as an undoable edit', () => {
    open(broken);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    const radios = within(slip()).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.closest('label')!.querySelector('strong')!.textContent)).toEqual([
      'Last served',
      'From Shift 02',
      'Shift starter',
    ]);
    // The routine that went right comes first, and the comparison says what going back changes.
    expect(radios[0].checked).toBe(true);
    const compare = within(slip()).getByRole('region', { name: /Against Query’s routine now/ });
    expect(compare.textContent).toContain('1 line back · 1 line out');
    expect(within(compare).getByText('Out:').parentElement!.textContent).toContain('DEPOSIT UP');
    expect(within(compare).getByText('Back:').parentElement!.textContent).toContain('DEPOSIT RIGHT');
    fireEvent.click(radios[2]);
    expect(within(slip()).getByRole('region', { name: /Against/ }).textContent).toContain('1 line back · 3 lines out');
    fireEvent.click(radios[0]);
    fireEvent.click(within(slip()).getByRole('button', { name: 'Restore this version' }));
    expect(saved()).toBe(served);
    expect(
      screen.getByText('Query’s routine is back to the last served version. Undo brings yours back.'),
    ).toBeTruthy();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(saved()).toBe(broken);
  });

  it('can’t pick a version just like the routine now', () => {
    open(carried);
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('button', { name: /Restore Query’s routine/ }));
    const carriedRadio = within(slip()).getByRole('radio', { name: /From Shift 02/ }) as HTMLInputElement;
    expect(carriedRadio.disabled).toBe(true);
    expect(carriedRadio.closest('label')!.textContent).toContain('The same as Query’s routine now.');
    expect((within(slip()).getByRole('radio', { name: /Last served/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('offers the last served version from the failure card once a served routine breaks', () => {
    open(broken);
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    fireEvent.keyDown(window, { key: 'Escape' });
    const card = screen.getByRole('region', { name: /^Query stopped/ });
    fireEvent.click(within(card).getByRole('button', { name: 'Compare with last served' }));
    expect((within(slip()).getByRole('radio', { name: /Last served/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('keeps the failure card to its own actions on a shift never served', () => {
    open(broken, { unlocked: 2, stars: { 0: 3, 1: 3 }, robotSolutions: { 1: programs(carried) } });
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    fireEvent.keyDown(window, { key: 'Escape' });
    const card = screen.getByRole('region', { name: /^Query stopped/ });
    expect(within(card).queryByRole('button', { name: 'Compare with last served' })).toBeNull();
  });
});
