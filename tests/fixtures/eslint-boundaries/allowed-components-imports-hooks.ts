/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/components/probe.tsx (element: components).
 * Policy: presentation may use shared interaction hooks.
 * Expected: no `boundaries/dependencies` error.
 */
import { useSound } from '@/hooks/useSound';

export const probe = useSound;
