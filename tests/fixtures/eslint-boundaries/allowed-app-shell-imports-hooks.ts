/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/App.tsx (file category: app-shell).
 * Policy: app shell may wire anything, including hooks.
 * Expected: no `boundaries/dependencies` error.
 */
import { useSound } from '@/hooks/useSound';

export const probe = useSound;
