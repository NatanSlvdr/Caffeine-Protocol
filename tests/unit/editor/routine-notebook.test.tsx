import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { NOTEBOOK_KEY, notebookFile, type NotebookPage } from '../../../src/features/workspace/notebook';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
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
const served = lessons[2].solution;
const broken = served.replace('DEPOSIT RIGHT', 'DEPOSIT UP');
const page = (name: string, source: string, role: NotebookPage['role'] = 'query', shift = 3): NotebookPage => ({
  name,
  role,
  shift,
  source,
});

function open(draft: string, pages: NotebookPage[] = []) {
  const save = makeSave();
  seedLocalStorage({
    ...save,
    unlocked: 3,
    selected: 2,
    stars: { 0: 3, 1: 3, 2: 2 },
    settings: { ...save.settings, text_editor: true },
    robotDrafts: { 2: programs(draft) },
  });
  if (pages.length) localStorage.setItem(NOTEBOOK_KEY, notebookFile(pages));
  render(<App />);
  const skip = screen.queryByRole('button', { name: 'Skip' });
  if (skip) fireEvent.click(skip);
  fireEvent.click(screen.getByRole('button', { name: 'Notebook' }));
}
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).robotDrafts['2'].query;
const kept = () => (JSON.parse(localStorage.getItem(NOTEBOOK_KEY)!).pages as NotebookPage[]).map((p) => p.name);
const slip = () => screen.getByRole('dialog', { name: 'Routine notebook' });
const name = () => within(slip()).getByRole('textbox', { name: 'Keep Query’s routine as' }) as HTMLInputElement;
const choice = (label: string) => within(slip()).getByRole('radio', { name: new RegExp(label) }) as HTMLInputElement;

describe('the routine notebook', () => {
  it('keeps the open routine under a name, offered one by robot and shift', () => {
    open(served);
    expect(slip().textContent).toContain('No pages yet.');
    expect(name().value).toBe('Query, Shift 03');
    expect(document.activeElement).toBe(name());
    fireEvent.change(name(), { target: { value: 'Both tables' } });
    fireEvent.click(within(slip()).getByRole('button', { name: 'Keep page' }));
    expect(kept()).toEqual(['Both tables']);
    expect(choice('Both tables').checked).toBe(true);
    expect(choice('Both tables').closest('label')!.textContent).toContain(
      `Query · Shift 03 · ${served.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length} blocks`,
    );
    expect(within(slip()).getByText('Kept Query’s routine as “Both tables”.')).toBeTruthy();
    // Kept once, the same routine says where it is; the name moves on to a free one.
    expect(name().value).toBe('Query, Shift 03');
    expect(slip().textContent).toContain('Already kept as “Both tables”.');
    // The page a name already holds is replaced, and the button says so first.
    fireEvent.change(name(), { target: { value: 'both TABLES' } });
    fireEvent.submit(name().form!);
    expect(kept()).toEqual(['both TABLES']);
    expect(within(slip()).getByText('Replaced “Both tables” with Query’s routine.')).toBeTruthy();
  });

  it('puts a page in place of the routine, or after it, as an edit Undo takes back', () => {
    open(broken, [page('Both tables', served), page('Step aside', 'MOVE RIGHT 1')]);
    expect(choice('Both tables').checked).toBe(true);
    const compare = within(slip()).getByRole('region', { name: /Against Query’s routine now/ });
    expect(compare.textContent).toContain('1 line in · 1 line out');
    expect(within(compare).getByText('In:').parentElement!.textContent).toContain('DEPOSIT RIGHT');
    fireEvent.click(within(slip()).getByRole('button', { name: 'Use this page' }));
    expect(saved()).toBe(served);
    expect(screen.getByText('Query’s routine is now “Both tables”. Undo brings yours back.')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(saved()).toBe(broken);

    fireEvent.click(screen.getByRole('button', { name: 'Notebook' }));
    fireEvent.click(choice('Step aside'));
    fireEvent.click(within(slip()).getByRole('button', { name: 'Add to the end' }));
    expect(saved()).toBe(`${broken.trimEnd()}\nMOVE RIGHT 1`);
    expect(screen.getByText('Added “Step aside” to the end of Query’s routine. Undo takes it out.')).toBeTruthy();
  });

  it('says which pages the open robot can’t read on this shift, and keeps them out of its routine', () => {
    open(broken, [page('Last orders', `${served}\nSTOP`, 'query', 21), page('Grinder', 'USE UP', 'prep', 9)]);
    expect(choice('Last orders').closest('label')!.textContent).toContain(
      'Query can’t use “STOP” yet: that block joins the library on a later shift.',
    );
    for (const button of ['Use this page', 'Add to the end'])
      expect((within(slip()).getByRole('button', { name: button }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(choice('Grinder'));
    expect(choice('Grinder').closest('label')!.textContent).toContain('Brew · Shift 09 · 1 block');
    expect(choice('Grinder').closest('label')!.textContent).toContain('Query doesn’t know “USE UP”.');
    expect((within(slip()).getByRole('button', { name: 'Use this page' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('has nothing to put in place of a routine just like the page', () => {
    open(served, [page('Both tables', served)]);
    const use = within(slip()).getByRole('button', { name: 'Same as Query’s now' }) as HTMLButtonElement;
    expect(use.disabled).toBe(true);
    expect((within(slip()).getByRole('button', { name: 'Add to the end' }) as HTMLButtonElement).disabled).toBe(false);
    expect(within(slip()).queryByRole('region', { name: /Against/ })).toBeNull();
  });

  it('removes a page, and puts it back where it was', () => {
    open(served, [page('First', 'LISTEN'), page('Second', 'MOVE RIGHT 1'), page('Third', 'TAKE UP')]);
    fireEvent.click(choice('Second'));
    fireEvent.click(within(slip()).getByRole('button', { name: 'Remove page' }));
    expect(kept()).toEqual(['First', 'Third']);
    expect(choice('Third').checked).toBe(true);
    expect(within(slip()).getByText('Removed “Second”.')).toBeTruthy();
    fireEvent.click(within(slip()).getByRole('button', { name: 'Put it back' }));
    expect(kept()).toEqual(['First', 'Second', 'Third']);
    expect(choice('Second').checked).toBe(true);
    expect(within(slip()).queryByRole('button', { name: 'Put it back' })).toBeNull();
  });

  it('takes the way back when the last page goes', () => {
    open(served, [page('Only', 'LISTEN')]);
    fireEvent.click(within(slip()).getByRole('button', { name: 'Remove page' }));
    expect(slip().textContent).toContain('No pages yet.');
    expect(document.activeElement).toBe(within(slip()).getByRole('button', { name: 'Put it back' }));
  });

  it('exports the notebook as a file, and imports one beside it', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:notebook');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers({ now: new Date(2026, 9, 6), toFake: ['Date'] });
    try {
      open(served, [page('Both tables', served)]);
      fireEvent.click(within(slip()).getByRole('button', { name: 'Export notebook' }));
      expect(click).toHaveBeenCalledOnce();
      expect(
        within(slip()).getByText(
          'Notebook exported as caffeine-protocol-notebook-2026-10-06.json. Look for it with your downloads.',
        ),
      ).toBeTruthy();

      const text = notebookFile([page('Both tables', served), page('Both tables', 'LISTEN'), page('Aside', 'TAKE UP')]);
      await act(async () => {
        fireEvent.change(within(slip()).getByLabelText('Import notebook file'), {
          target: { files: [Object.assign(new File([text], 'notebook.json'), { text: async () => text })] },
        });
      });
      expect(kept()).toEqual(['Both tables', 'Both tables (2)', 'Aside']);
      expect(within(slip()).getByText('Added 2 pages from notebook.json. 1 page already here.')).toBeTruthy();
      expect(choice('Both tables \\(2\\)').checked).toBe(true);

      const save = JSON.stringify(makeSave());
      await act(async () => {
        fireEvent.change(within(slip()).getByLabelText('Import notebook file'), {
          target: { files: [Object.assign(new File([save], 'cafe.json'), { text: async () => save })] },
        });
      });
      expect(within(slip()).getByRole('alert').textContent).toBe(
        'cafe.json wasn’t imported. It’s a café export: import it from Settings. Your notebook has been kept.',
      );
    } finally {
      click.mockRestore();
    }
  });

  it('is only on a shift with a routine to keep', () => {
    window.location.hash = '/shift/1';
    seedLocalStorage({ ...makeSave(), unlocked: 3 });
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Notebook' })).toBeNull();
  });
});
