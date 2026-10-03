# Level 1: Reopening

## Purpose

Introduce the cafe workflow without asking the player to program or directly
control Niko.

## Story Beat

Niko reopens the inherited cafe for a tiny test day. The old systems still run
well enough to demonstrate service, but Niko can already see that the setup is
fragile.

## Player Task

Observe one complete scripted service flow:

- customer enters;
- customer orders coffee;
- scripted human work creates the ticket;
- coffee is prepared;
- drink is served;
- customer leaves;
- dirty table is cleaned.

## Setup

- Active tables: 2 of the cafe's 10 table positions.
- Customers: 3.
- Menu: coffee only.
- Query: visible as broken/inactive near the counter or repair bay.
- Programming editor: same workspace as later levels, with a locked Automatic service block.

## Available Blocks

None.

## Starter Program

None.

## Validation

This is an observation level, not a program-validation level.

Scripted customer sequence:

| Customer | Arrival | Phrase | Expected Result |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | Served correctly. |
| C2 | 12s | `coffee` | Served correctly. |
| C3 | 24s | `coffee` | Served correctly. |

## Success Conditions

- All 3 customers are served.
- The player watches the complete service; ticket inspection is optional.
- The level summary explains ticket lifecycle: created, preparing, ready, served.

## Failure Conditions

None. This level should not fail.

## Scoring

No stars. Completion unlocks Level 2.

## Godot Notes

- Use this level to validate base simulation states and ticket UI.
- `LevelDefinition` should mark `programming_enabled = false`.
- The scripted human owns order intake, preparation, serving, and cleaning.
