/** Read-once reduced-motion check shared by cursors, surfaces, and menus. */
export function useReducedMotion(): boolean {
  return (
    document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
