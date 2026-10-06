import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newSave } from '../../../src/features/campaign/save/persistence';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  // A fresh copy of the app, whose shift screens haven't been fetched (the shared setup fetches them for every test).
  vi.resetModules();
});

/** The shift screens come after startup, so the front door and the rail don't wait on the editor. */
describe('the deferred shift screens', () => {
  it('open a shift straight from its address: a quiet line, then the shift, with focus on it', async () => {
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify({ ...newSave(), story: { 0: true } }));
    window.location.hash = '#/shift/1';
    const { default: App } = await import('../../../src/App');
    render(<App />);
    expect(screen.getByRole('status').textContent).toBe('Opening the shift…');
    await waitFor(() => expect(document.querySelector('.workspace-main')).toBeTruthy());
    expect(screen.queryByText('Opening the shift…')).toBeNull();
    // Focus isn't left on the page: the shift's own opening claims it, as when its screen was there all along.
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/Next|Continue/));
  });

  it('are fetched while the front door idles, so a shift later opens at once', async () => {
    window.location.hash = '/';
    const screens = await import('../../../src/app/screens');
    const preload = vi.spyOn(screens, 'preloadScreens');
    const { default: App } = await import('../../../src/App');
    render(<App />);
    expect(preload).not.toHaveBeenCalled();
    await waitFor(() => expect(preload).toHaveBeenCalledOnce(), { timeout: 3000 });
  });
});
