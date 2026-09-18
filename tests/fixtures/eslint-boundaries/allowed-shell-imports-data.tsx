/**
 * Boundary fixture: ALLOWED.
 * Virtual location: src/shell/probe.tsx (element: app + file category: app-shell).
 * Policy: app shell may wire anything, including data.
 * Expected: no `boundaries/dependencies` error.
 */
import { levels } from '@/data';

export const probe = levels;
