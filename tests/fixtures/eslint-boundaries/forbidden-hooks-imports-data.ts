/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/hooks/probe.ts (element: hooks).
 * Violation: shared hooks must never import data (inject via args).
 * Expected: `boundaries/dependencies` error when linted as src/hooks/*.ts.
 */
import { levels } from '@/data';

export const probe = levels;
