/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/hooks/probe.ts (element: hooks).
 * Violation: shared hooks must never import components (no upward composition).
 * Expected: `boundaries/dependencies` error when linted as src/hooks/*.ts.
 */
import { Cafe } from '@/components';

export const probe = Cafe;
