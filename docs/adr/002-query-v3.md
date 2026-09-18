# ADR 002: Query language v3 and save migration

- Status: accepted
- Date: 2026-09-18

## Context

The Query language moved from semantic-copy actions (`TICKET`, `SUBMIT`,
`CHARGE ORDER`) to token puzzles (`TAKE UP`, `DEPOSIT RIGHT`, `FOR item IN
heard orders`, `STORE`/`WRITE`). Old saves cannot be translated mechanically.

## Decision

- `program/migration.ts` renames retired actions (`TICKET`→`TAKE UP`,
  `SUBMIT`→`DEPOSIT RIGHT`, `PICKUP`→`TAKE`), restores handoff steps from the
  brief stationary-pickup version, and allocates legacy variable names to
  `var1–4` slots.
- `parseSave` migrates v1/v2 on import: Query programs reset to starters,
  unlocks and kitchen/floor routines preserved. `CHARGE`/`BATTERY` retirement
  stays until the grace period ends (pinned by `save-v2` tests).
- New code uses `QueryComparisonCondition` (`IN`/`NOT IN` over speech/item);
  kitchen/floor keep the independent `WorkerComparisonCondition`.

## Consequences

Imports are total: malformed saves throw before replacing anything, and the
original storage is left untouched for recovery export.
