// Boundary fixture: FORBIDDEN.
// Virtual location: src/data/probe.ts (element: data).
// Violation: data must never import components (campaign sources only read domain/roots).
// Expected: boundaries/dependencies error when linted under src/data.
import { Cafe } from '@/components';

export const probe = Cafe;
