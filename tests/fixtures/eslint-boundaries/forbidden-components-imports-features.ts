// Boundary fixture: FORBIDDEN.
// Virtual location: src/components/probe.ts (element: components).
// Violation: components must never import features sideways/upward (presentation only).
// Expected: boundaries/dependencies error when linted under src/components.
import { Workspace } from '@/features/workspace/Workspace';

export const probe = Workspace;
