// Boundary fixture: FORBIDDEN.
// Virtual location: src/features/workspace/probe.ts (element: features).
// Violation: features must never import data (inject via props/store).
// Expected: boundaries/dependencies error when linted under src/features.
import { levels } from '@/data';

export const probe = levels;
