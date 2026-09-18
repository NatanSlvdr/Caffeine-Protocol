/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/features/workspace/probe.ts (element: features).
 * Policy: behavior may use shared interaction hooks.
 * Expected: no `boundaries/dependencies` error.
 */
import { useSound } from '@/hooks/useSound';

export const probe = useSound;
