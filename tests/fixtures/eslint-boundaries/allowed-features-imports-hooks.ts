/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/features/workspace/probe.ts (element: features).
 * Policy: behavior may use shared interaction hooks.
 * Expected: no `boundaries/dependencies` error.
 */
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const probe = useReducedMotion;
