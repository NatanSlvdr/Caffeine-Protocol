// Boundary fixture: FORBIDDEN.
// Virtual location: src/features/workspace/probe.ts (element: features).
// Violation: features must never import app shell upward (no upward imports).
// Expected: boundaries/dependencies error when linted under src/features.
import { AppHeader } from '@/shell/AppHeader';

export const probe = AppHeader;
