import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { registerOfflineCafe } from '../../../src/app/offlineUpdate';
import { UPDATE_MESSAGE } from '../../../src/shared/offline-manifest';
import { reloadPage } from '../../../src/shared/lib/navigation';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
vi.mock('../../../src/shared/lib/navigation', async (original) => ({
  ...(await original<object>()),
  reloadPage: vi.fn(),
}));

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  vi.mocked(reloadPage).mockClear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

/** A service worker going through its states. */
class Worker extends EventTarget {
  postMessage = vi.fn();
  constructor(public state: ServiceWorkerState) {
    super();
  }
  move(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

/** The page's service worker container, controlled already or not, and the registration it hands back. */
function container({
  controlled,
  waiting,
  installing,
}: {
  controlled: boolean;
  waiting?: Worker;
  installing?: Worker;
}) {
  const registration = Object.assign(new EventTarget(), { waiting: waiting ?? null, installing: installing ?? null });
  const page = Object.assign(new EventTarget(), {
    controller: controlled ? {} : null,
    register: vi.fn(async () => registration),
  });
  return { page, registration };
}
const register = (fake: ReturnType<typeof container>) =>
  act(() => registerOfflineCafe(fake.page as unknown as ServiceWorkerContainer, './sw.js'));
const openSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
const notice = () => document.querySelector('.settings-update')?.textContent ?? null;

describe('a new version waiting to take over', () => {
  it('is offered in Settings, and taken only when the player asks', async () => {
    seedLocalStorage(makeSave({ unlocked: 2, stars: { 0: 3, 1: 2 } }));
    const waiting = new Worker('installed');
    await register(container({ controlled: true, waiting }));
    render(<App />);
    openSettings();
    expect(notice()).toContain(
      'A new version of the café is ready. It takes over once every tab of the café is closed, or now: your progress is kept, though a service under way starts over.',
    );
    expect(waiting.postMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update and reload' }));
    expect(waiting.postMessage).toHaveBeenCalledWith(UPDATE_MESSAGE);
    // This tab reloads onto the new version once it has taken over, not before.
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('reloads this tab once the new version has taken over', async () => {
    const waiting = new Worker('installed');
    const fake = container({ controlled: true, waiting });
    await register(fake);
    render(<App />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Update and reload' }));
    fake.page.dispatchEvent(new Event('controllerchange'));
    fake.page.dispatchEvent(new Event('controllerchange'));
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('shows up when a newer build finishes installing during the visit', async () => {
    const fake = container({ controlled: true });
    await register(fake);
    render(<App />);
    openSettings();
    expect(notice()).toBeNull();
    const next = new Worker('installing');
    Object.assign(fake.registration, { installing: next });
    act(() => {
      fake.registration.dispatchEvent(new Event('updatefound'));
    });
    expect(notice()).toBeNull();
    act(() => next.move('installed'));
    expect(screen.getByRole('button', { name: 'Update and reload' })).toBeTruthy();
    // Another tab took the update: nothing is waiting any more.
    act(() => next.move('activating'));
    expect(notice()).toBeNull();
  });

  it('isn’t offered on the café’s first visit, when the only build installs and takes over at once', async () => {
    const installing = new Worker('installing');
    await register(container({ controlled: false, installing }));
    act(() => installing.move('installed'));
    render(<App />);
    openSettings();
    expect(notice()).toBeNull();
  });

  it('waits for the café to close while progress isn’t being saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    try {
      await register(container({ controlled: true, waiting: new Worker('installed') }));
      render(<App />);
      openSettings();
      expect(notice()).toBe(
        'A new version of the café is ready. It takes over once every tab of the café is closed; progress isn’t being saved right now, so it waits until then.',
      );
      expect(screen.queryByRole('button', { name: 'Update and reload' })).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
