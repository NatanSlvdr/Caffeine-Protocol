import { useEffect, useRef } from 'react';

/** The most one tick plays: a few frames' worth, so a late tick catches up but a stall isn't played at once. */
export const MAX_TICK_SECONDS = 0.25;

/**
 * Fixed-step playback clock. Resubscribes when enabled flips or restartKey
 * changes (speed, shift, level, or programs), mirroring the original loop deps.
 * While the page is hidden the clock holds: a background tab's throttled timer would
 * otherwise play the time away back in a few jumps, and the service would end unseen.
 * A stall with the page still showing (a sleeping laptop, a frozen main thread) is capped the same way: one tick
 * never plays more than MAX_TICK_SECONDS, so the café picks up where it froze instead of leaping ahead.
 */
export function usePlaybackClock(enabled: boolean, onTick: (elapsed: number) => void, restartKey: unknown[]): void {
  const saved = useRef(onTick);
  saved.current = onTick;
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now(),
        elapsed = Math.min((now - last) / 1000, MAX_TICK_SECONDS);
      last = now;
      if (!document.hidden) saved.current(elapsed);
    }, 33);
    // Coming back starts the clock afresh, so the gap since the last hidden tick isn't counted either.
    const onVisibility = () => {
      if (!document.hidden) last = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, ...restartKey]);
}
