import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { newSave } from '../../../src/features/campaign/save/persistence';

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

async function importFile(name: string, text: string) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.change(screen.getByLabelText('Import save file'), {
    // jsdom's File has no text(), which the import reads with.
    target: { files: [Object.assign(new File([text], name), { text: async () => text })] },
  });
  return (await screen.findByRole('alert')).textContent;
}

describe('importing a café', () => {
  it('says a file that is not an export was not imported, and nothing was replaced', async () => {
    expect(await importFile('notes.json', 'shopping list')).toBe(
      'notes.json wasn’t imported. It isn’t a Caffeine Protocol café export. Your current café has been kept.',
    );
  });

  it('names a damaged export as damaged', async () => {
    const save = JSON.stringify({ ...newSave(), stars: { 2: 4 } });
    expect(await importFile('cafe.json', save)).toBe(
      'cafe.json wasn’t imported. Part of it is damaged: invalid star count. Your current café has been kept.',
    );
  });

  it('names a missing part in the game’s words, not the save’s field names', async () => {
    const save: Record<string, unknown> = { ...newSave() };
    delete save.robotDrafts;
    expect(await importFile('cafe.json', JSON.stringify(save))).toBe(
      'cafe.json wasn’t imported. Part of it is damaged: missing routine drafts. Your current café has been kept.',
    );
  });

  it('tells an export from a newer game apart', async () => {
    expect(await importFile('later.json', JSON.stringify({ ...newSave(), version: 9 }))).toBe(
      'later.json wasn’t imported. It comes from a newer version of Caffeine Protocol. Your current café has been kept.',
    );
  });

  it('says so once a café has been imported', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const text = JSON.stringify({ ...newSave(), stars: { 0: 1, 1: 3, 2: 2 } });
    fireEvent.change(screen.getByLabelText('Import save file'), {
      target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Replace café' }));
    expect(screen.getByRole('status').textContent).toBe('Café imported: 3 served shifts and 5 stars.');
  });

  it('counts what an export holds as the New café window counts, and names a fresh café as one', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const choose = (save: object) => {
      const text = JSON.stringify(save);
      fireEvent.change(screen.getByLabelText('Import save file'), {
        target: { files: [Object.assign(new File([text], 'cafe.json'), { text: async () => text })] },
      });
    };
    choose({ ...newSave(), stars: { 0: 1, 1: 3, 2: 2 } });
    expect((await screen.findByText(/^This export/)).textContent).toBe(
      'This export holds 3 served shifts and 5 stars. Importing it will replace your current progress, routines and settings.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Keep current café' }));
    choose(newSave());
    expect((await screen.findByText(/^This export/)).textContent).toBe(
      'This export is a fresh café, with no shifts served yet. Importing it will replace your current progress, routines and settings.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replace café' }));
    expect(screen.getByRole('status').textContent).toBe('Café imported: a fresh café, with no shifts served yet.');
  });

  it('says where an exported copy went', () => {
    URL.createObjectURL = vi.fn(() => 'blob:cafe');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers({ now: new Date(2026, 9, 2) });
    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Export café' }));
      expect(click).toHaveBeenCalledOnce();
      expect(screen.getByRole('status').textContent).toBe(
        'Café exported as caffeine-protocol-save-2026-10-02.json. Look for it with your downloads.',
      );
    } finally {
      vi.useRealTimers();
      click.mockRestore();
    }
  });

  it('says so again when the same export is made twice', () => {
    URL.createObjectURL = vi.fn(() => 'blob:cafe');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      const status = screen.getByRole('status');
      fireEvent.click(screen.getByRole('button', { name: 'Export café' }));
      const first = status.textContent;
      fireEvent.click(screen.getByRole('button', { name: 'Export café' }));
      // A live region only speaks when its text changes: the second export must change it, reading the same.
      expect(status.textContent).not.toBe(first);
      expect(status.textContent?.trim()).toBe(first);
    } finally {
      click.mockRestore();
    }
  });

  it('offers a recovery copy only when there is a stored café it could not read', () => {
    localStorage.setItem('caffeine-protocol.v1', '{bad');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'Export recovery copy' })).toBeTruthy();
  });

  it('says where a recovery copy went, under a name of its own', () => {
    localStorage.setItem('caffeine-protocol.v1', '{bad');
    URL.createObjectURL = vi.fn(() => 'blob:recovery');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers({ now: new Date(2026, 9, 2) });
    try {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      fireEvent.click(screen.getByRole('button', { name: 'Export recovery copy' }));
      expect(click).toHaveBeenCalledOnce();
      expect(screen.getByRole('status').textContent).toBe(
        'Recovery copy exported as caffeine-protocol-recovery-2026-10-02.json. Look for it with your downloads.',
      );
    } finally {
      vi.useRealTimers();
      click.mockRestore();
    }
  });
});
