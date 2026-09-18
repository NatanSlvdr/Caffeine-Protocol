/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/hooks/probe.ts (element: hooks).
 * Policy: hooks may read shared roots (type-only sound ids).
 * Expected: no `boundaries/dependencies` error.
 */
import type { SoundName } from '@/shared/audio-manifest';

export type Probe = SoundName;
export const probe: Probe = 'click';
