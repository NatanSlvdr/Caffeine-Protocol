/**
 * Boundary fixture: FORBIDDEN.
 * Virtual location: src/shared/probe.ts (file category: shared-root).
 * Violation: shared roots are innermost constants (same-file-category only).
 * Expected: `boundaries/dependencies` error when linted as src/shared/*.ts.
 */
import { visualProgram } from '@/domain';

export const probe = visualProgram;
