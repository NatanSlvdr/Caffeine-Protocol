# Level 13: Ambiguous Regulars

## Purpose

Stress-test ambiguity handling while preserving sugar counts and clear intent
chips.

## Story Beat

Regulars start speaking as if Query has known them for years. Query's confidence
chip makes those requests ambiguous, so it needs to be polite, careful, and
specific instead of confident and wrong.

## Player Task

Ensure Query asks for help on ambiguous speech confidence and uses deterministic
clarification chips to create correct tickets.

## Setup

- Active tables: 8.
- Menu: coffee, tea.
- Modifiers: binary sugar and numeric sugar.
- Query owns order intake.
- Ambiguous confidence appears alongside supported clear intent variants.

## Available Blocks

All previous blocks. No new block categories.

## Starter Program

Start from the player's saved Level 12 solution. No starter hints.

## Validation Seeds

Required seeds: 5.

Seed `L13_A`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `regular` | coffee without sugar | coffee, without sugar |
| C2 | 5s | `coffee with 1 sugar` | none | coffee, sugar_count 1 |
| C3 | 10s | `the usual` | tea with 2 sugar | tea, sugar_count 2 |
| C4 | 16s | `tea please` | none | tea, without sugar |
| C5 | 23s | `same as yesterday` | coffee with 2 sugar | coffee, sugar_count 2 |
| C6 | 31s | `one tea without sugar` | none | tea, without sugar |

Seed `L13_B`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `something warm` | tea without sugar | tea, without sugar |
| C2 | 4s | `one coffee with sugar` | none | coffee, with sugar |
| C3 | 9s | `regular` | tea with 1 sugar | tea, sugar_count 1 |
| C4 | 15s | `coffee with 0 sugar` | none | coffee, sugar_count 0 |
| C5 | 22s | `the usual` | coffee with 1 sugar | coffee, sugar_count 1 |
| C6 | 30s | `tea with 2 sugar` | none | tea, sugar_count 2 |

Seed `L13_C`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee please` | none | coffee, without sugar |
| C2 | 5s | `same as yesterday` | tea without sugar | tea, without sugar |
| C3 | 11s | `tea with 1 sugar` | none | tea, sugar_count 1 |
| C4 | 17s | `something warm` | coffee with 2 sugar | coffee, sugar_count 2 |
| C5 | 24s | `one coffee without sugar` | none | coffee, without sugar |
| C6 | 32s | `regular` | coffee with 1 sugar | coffee, sugar_count 1 |

Seed `L13_D`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `the usual` | tea with sugar | tea, with sugar |
| C2 | 4s | `tea with 0 sugar` | none | tea, sugar_count 0 |
| C3 | 10s | `regular` | coffee with sugar | coffee, with sugar |
| C4 | 16s | `one tea` | none | tea, without sugar |
| C5 | 23s | `same as yesterday` | coffee without sugar | coffee, without sugar |
| C6 | 31s | `coffee with 2 sugar` | none | coffee, sugar_count 2 |
| C7 | 40s | `something warm` | tea with 1 sugar | tea, sugar_count 1 |

Seed `L13_E`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee with 2 sugar` | none | coffee, sugar_count 2 |
| C2 | 4s | `regular` | tea without sugar | tea, without sugar |
| C3 | 9s | `tea please` | none | tea, without sugar |
| C4 | 15s | `the usual` | coffee with 0 sugar | coffee, sugar_count 0 |
| C5 | 21s | `one coffee with sugar` | none | coffee, with sugar |
| C6 | 28s | `same as yesterday` | tea with 2 sugar | tea, sugar_count 2 |
| C7 | 36s | `one tea with sugar` | none | tea, with sugar |

## Expected Behavior

Query routes ambiguous confidence to help, uses the clarification chips, and
does not ask for help on supported clear intent variants.

## Failure Conditions

- Query guesses for ambiguous speech.
- Query asks for help unnecessarily.
- Clarified numeric sugar is lost.
- Clear intent variants from Level 12 regress.

## Scoring Targets

- 2-star target: 42 blocks or fewer.
- 3-star target: 650 executed instructions or fewer across all required seeds.

## Godot Notes

- Failure output must distinguish `unnecessary help request` from `missing help
  request`.
- The replay should show the original phrase and the deterministic
  clarification chips.
