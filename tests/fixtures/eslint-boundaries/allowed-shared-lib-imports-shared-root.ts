/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/shared/lib/probe.ts (element: shared-lib).
 * Policy: shared-lib may read shared roots (audio manifest ids).
 * Expected: no `boundaries/dependencies` error.
 */
import type { SoundName } from '@/shared/audio-manifest';

export type Probe = SoundName;
export const probe: Probe = 'click';
