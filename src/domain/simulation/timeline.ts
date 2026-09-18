/** Customer navigation uses the same absolute seed clock as actor playback. */
import type { RunResult } from '../types';

export function buildReplayTimeline(result: RunResult) {
  return result.events.map((event) => {
    const seed = result.execution?.find((s) => s.seed_id === event.seed_id);
    return {
      event,
      start: (seed?.start ?? 0) + event.timing.arrival,
      end:
        (seed?.start ?? 0) +
        Math.max(event.timing.cleaned, event.timing.left, event.timing.served, event.timing.created),
    };
  });
}
