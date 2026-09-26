/** Hash navigation without a router dependency: routes are plain `#/...` strings. */
export const go = (path: string): void => {
  window.location.hash = path;
};

export const readHashRoute = (): string =>
  typeof window === 'undefined' || !window.location ? '/' : window.location.hash.slice(1) || '/';

const SETTINGS_EVENT = 'caffeine:settings';

/** Settings open as a window over the current screen rather than as a route of their own. */
export const openSettings = (): void => {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
};

export const onOpenSettings = (listener: () => void): (() => void) => {
  window.addEventListener(SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_EVENT, listener);
};
