/** Hash navigation without a router dependency: routes are plain `#/...` strings. */
export const go = (path: string): void => {
  window.location.hash = path;
};

export const readHashRoute = (): string =>
  typeof window === 'undefined' || !window.location ? '/' : window.location.hash.slice(1) || '/';
