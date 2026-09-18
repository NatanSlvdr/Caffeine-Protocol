/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/domain/probe.ts (element: shared-domain).
 * Violation: innermost domain must never import data (one-way: inward only).
 * Expected: `boundaries/dependencies` error when linted as src/domain/*.ts.
 */
import { levels } from '@/data';

export const probe = levels;
