import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_TICK_SECONDS, usePlaybackClock } from '../../../src/features/workspace/usePlaybackClock';

let hidden = false;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setHidden(value: boolean) {
  hidden = value;
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('the playback clock', () => {
  it('plays the time that passes while the café is on screen', () => {
    const ticks: number[] = [];
    renderHook(() => usePlaybackClock(true, (elapsed) => ticks.push(elapsed), []));
    vi.advanceTimersByTime(1000);
    expect(ticks.reduce((sum, t) => sum + t, 0)).toBeCloseTo(1, 1);
  });

  it('holds while the page is hidden, and picks up where it was on return', () => {
    const ticks: number[] = [];
    renderHook(() => usePlaybackClock(true, (elapsed) => ticks.push(elapsed), []));
    vi.advanceTimersByTime(330);
    setHidden(true);
    // A minute in another tab: no time reaches the service.
    vi.advanceTimersByTime(60_000);
    const away = ticks.length;
    setHidden(false);
    vi.advanceTimersByTime(330);
    expect(ticks.length).toBeGreaterThan(away);
    expect(Math.max(...ticks)).toBeLessThan(0.1);
    expect(ticks.reduce((sum, t) => sum + t, 0)).toBeCloseTo(0.66, 1);
  });

  it('picks up where it froze after a stall with the page still showing', () => {
    const ticks: number[] = [];
    renderHook(() => usePlaybackClock(true, (elapsed) => ticks.push(elapsed), []));
    vi.advanceTimersByTime(330);
    const before = ticks.reduce((sum, t) => sum + t, 0);
    // The laptop sleeps for five minutes without the page being hidden: the wall clock moves, no tick runs.
    vi.setSystemTime(Date.now() + 300_000);
    vi.advanceTimersByTime(33);
    expect(ticks.at(-1)).toBe(MAX_TICK_SECONDS);
    expect(ticks.reduce((sum, t) => sum + t, 0) - before).toBeLessThanOrEqual(MAX_TICK_SECONDS + 1e-9);
    // Then it plays on at the normal pace.
    vi.advanceTimersByTime(330);
    expect(Math.max(...ticks.slice(-5))).toBeLessThan(0.1);
  });

  it('stops listening once the run ends', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { rerender } = renderHook(({ on }) => usePlaybackClock(on, () => {}, []), { initialProps: { on: true } });
    rerender({ on: false });
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
