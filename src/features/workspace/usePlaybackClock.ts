import { useEffect, useRef } from 'react';

/**
 * Fixed-step playback clock. Resubscribes when enabled flips or restartKey
 * changes (speed, shift, level, or programs), mirroring the original loop deps.
 */
export function usePlaybackClock(enabled: boolean, onTick: (elapsed: number) => void, restartKey: unknown[]): void {
  const saved = useRef(onTick);
  saved.current = onTick;
  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now(),
        elapsed = (now - last) / 1000;
      last = now;
      saved.current(elapsed);
    }, 33);
    return () => clearInterval(id);
  }, [enabled, ...restartKey]);
}
