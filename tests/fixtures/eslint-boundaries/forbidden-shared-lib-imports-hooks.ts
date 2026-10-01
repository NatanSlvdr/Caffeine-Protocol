/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/shared/lib/probe.ts (element: shared-lib).
 * Violation: shared primitives must never import hooks (one-way: hooks read shared, not reverse).
 * Expected: `boundaries/dependencies` error when linted as src/shared/lib/*.ts.
 */
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const probe = useReducedMotion;
