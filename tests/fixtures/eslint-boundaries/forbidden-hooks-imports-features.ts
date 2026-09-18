/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/hooks/probe.ts (element: hooks).
 * Violation: shared hooks must never import features (no upward composition).
 * Expected: `boundaries/dependencies` error when linted as src/hooks/*.ts.
 */
import { Workspace } from '@/features/workspace/Workspace';

export const probe = Workspace;
