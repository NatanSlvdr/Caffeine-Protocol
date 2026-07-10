# Level 11: Refactor Shift

## Purpose

Review existing concepts and push the player to clean up persistent Query logic
before larger intent batches.

## Story Beat

Query's program works, but the cafe wall printer is covered in near-duplicate
ticket-building rules. Niko gives Query a quieter shift to tidy the logic.

## Player Task

Refactor Query's saved program so all previous supported orders still pass with
less duplicated logic.

## Setup

- Active tables: 6.
- Menu: coffee, tea.
- Modifiers: binary sugar and numeric sugar.
- Query owns order intake.
- No new customer language.

## Available Blocks

All blocks from Levels 3-9. No new blocks.

## Starter Program

Start from the player's saved Level 10 solution. No new starter hints are added.

## Validation Seeds

Required seeds: 4.

Seed `L11_A`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee` | none | coffee |
| C2 | 6s | `tea` | none | tea |
| C3 | 12s | `coffee with sugar` | none | coffee, with sugar |
| C4 | 20s | `tea without sugar` | none | tea, without sugar |

Seed `L11_B`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `one coffee` | none | coffee, without sugar |
| C2 | 5s | `tea please` | none | tea, without sugar |
| C3 | 11s | `one coffee with sugar` | none | coffee, with sugar |
| C4 | 23s | `one tea without sugar` | none | tea, without sugar |

Seed `L11_C`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `regular` | coffee without sugar | coffee, without sugar |
| C2 | 7s | `the usual` | tea with sugar | tea, with sugar |
| C3 | 14s | `coffee please` | none | coffee, without sugar |
| C4 | 24s | `same as yesterday` | tea without sugar | tea, without sugar |

Seed `L11_D`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee with 2 sugar` | none | coffee, sugar_count 2 |
| C2 | 6s | `tea with 1 sugar` | none | tea, sugar_count 1 |
| C3 | 13s | `coffee with 0 sugar` | none | coffee, sugar_count 0 |
| C4 | 25s | `one tea with 2 sugar` | none | tea, sugar_count 2 |

## Expected Behavior

All previous supported behavior remains correct. The level's star targets
encourage functions and shared ticket-building logic rather than duplicated
branches.

## Failure Conditions

- Any regression from Levels 3-9.
- Runtime errors caused by refactoring.
- Ambiguous speech guessed instead of routed to help.

## Scoring Targets

- 2-star target: 34 blocks or fewer.
- 3-star target: 280 executed instructions or fewer across all required seeds.

## Godot Notes

- This level is important for persistent program saves.
- The result screen should show block count prominently.
