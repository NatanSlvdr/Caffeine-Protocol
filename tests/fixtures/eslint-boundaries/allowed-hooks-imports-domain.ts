/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/hooks/probe.ts (element: hooks).
 * Policy: hooks may read shared-domain.
 * Expected: no `boundaries/dependencies` error.
 */
import { visualProgram } from '@/domain';

export const probe = visualProgram;
