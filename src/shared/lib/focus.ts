/**
 * After the screen changes under the player, focus that fell back to the page body goes to the new
 * screen's title, so keyboard and screen-reader users carry on from there instead of from the top.
 * Focus something already claimed (a scene's Next button, a field) is left alone.
 */
export function reclaimFocus(): void {
  if (document.activeElement && document.activeElement !== document.body) return;
  document.querySelector<HTMLElement>('[data-screen-title]')?.focus({ preventScroll: true });
}
