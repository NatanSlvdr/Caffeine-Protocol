import type { RunResult } from '@/domain';
import type { SoundName } from '@/shared/audio-manifest';

/** A drink lands with a guest when its serve or hand-over finishes. */
const SERVED = new Set(['SERVE', 'HAND OVER']);
/** The machine pours as soon as Brew starts brewing or steeping. */
const POURED = new Set(['BREW', 'STEEP']);

/** The café sounds a live run passed between two clock readings, each sound once however many times it happened. */
export function serviceCues(result: RunResult, from: number, to: number): SoundName[] {
  const cues = new Set<SoundName>();
  if (to <= from) return [];
  for (const seed of result.execution ?? []) {
    for (const event of seed.events) {
      const action = event.action ?? '';
      const served = seed.start + event.end,
        poured = seed.start + event.start;
      if (SERVED.has(action) && served > from && served <= to) cues.add('serve');
      if (POURED.has(action) && poured > from && poured <= to) cues.add('pour');
    }
  }
  return [...cues];
}
