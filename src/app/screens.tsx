import { lazy, useEffect, useState, type ComponentType } from 'react';
import { reclaimFocus } from '@/shared/lib/focus';

/**
 * A screen fetched on first use instead of at startup, so the front door and the rail don't wait on the editor.
 * `preload` fetches it ahead; once it has arrived, a screen opened from then on draws at once, with no fallback.
 */
function deferred<P extends object>(load: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  const preload = () =>
    (pending ??= load().then(
      (screen) => (loaded = screen),
      (error: unknown) => {
        // A failed fetch (offline before the worker had it) is tried again next time.
        pending = undefined;
        throw error;
      },
    ));
  const Lazy = lazy(() => preload().then((screen) => ({ default: screen })));
  function Deferred(props: P) {
    // Chosen once per mount: switching from one to the other would mount the screen afresh and lose its state.
    const [Screen] = useState<ComponentType<P>>(() => loaded ?? Lazy);
    return <Screen {...props} />;
  }
  return Object.assign(Deferred, { preload });
}

export const Workspace = deferred(() => import('@/features/workspace/Workspace').then((m) => m.Workspace));
export const SpecialShift = deferred(() => import('./SpecialShift').then((m) => m.SpecialShift));
export const MemoryShift = deferred(() => import('./MemoryShift').then((m) => m.MemoryShift));
export const LongDayShift = deferred(() => import('./LongDayShift').then((m) => m.LongDayShift));

/** Fetches every deferred screen: the app calls it once the page is idle, so a shift opens without a wait. */
export const preloadScreens = () =>
  Promise.all([Workspace.preload(), SpecialShift.preload(), MemoryShift.preload(), LongDayShift.preload()]);

/**
 * What shows while a shift's screen is still on its way. The screen's title wasn't there to take focus when the
 * address changed, so it is offered focus once the screen has drawn and its own effects have run.
 */
export function ScreenLoading() {
  useEffect(() => () => void window.setTimeout(reclaimFocus), []);
  return (
    <p className="screen-loading" role="status">
      Opening the shift…
    </p>
  );
}
