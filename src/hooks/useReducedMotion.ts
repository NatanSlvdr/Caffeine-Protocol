/**
 * Read-once reduced-motion check shared by cursors, surfaces, menus and scenes: the player's setting
 * (passed in where it is at hand, so a fresh toggle counts before the page re-marks itself) or the system's.
 */
export function useReducedMotion(setting = false): boolean {
  return (
    setting ||
    document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}
