# Level 12: Intent Stress

## Purpose

Stress-test Query's ticket-building logic with larger clear-intent batches.

## Story Beat

The morning crowd has learned Query's name and everyone wants to try ordering
slightly differently. The source phrases vary, but Query's intent chips remain
clear.

## Player Task

Expand Query's shared ticket-building logic so supported intent variants still
produce correct structured tickets.

## Setup

- Active tables: 8.
- Menu: coffee, tea.
- Modifiers: binary sugar and numeric sugar.
- Query owns order intake.
- No new ambiguity types; this level is about volume and clear intent-chip
  variation.

## Available Blocks

All previous blocks. No new block categories.

## Starter Program

Start from the player's saved Level 11 solution. No starter hints.

## Validation Seeds

Required seeds: 5.

Seed `L12_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | coffee |
| C2 | 5s | `coffee please` | coffee, without sugar |
| C3 | 10s | `one coffee` | coffee, without sugar |
| C4 | 16s | `tea` | tea |
| C5 | 23s | `tea please` | tea, without sugar |

Seed `L12_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `one tea` | tea, without sugar |
| C2 | 5s | `one coffee with sugar` | coffee, with sugar |
| C3 | 11s | `one tea with sugar` | tea, with sugar |
| C4 | 17s | `one coffee without sugar` | coffee, without sugar |
| C5 | 24s | `one tea without sugar` | tea, without sugar |

Seed `L12_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee with 0 sugar` | coffee, sugar_count 0 |
| C2 | 5s | `coffee with 1 sugar` | coffee, sugar_count 1 |
| C3 | 10s | `coffee with 2 sugar` | coffee, sugar_count 2 |
| C4 | 15s | `tea with 0 sugar` | tea, sugar_count 0 |
| C5 | 21s | `tea with 1 sugar` | tea, sugar_count 1 |
| C6 | 28s | `tea with 2 sugar` | tea, sugar_count 2 |

Seed `L12_D`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `one coffee with sugar` | coffee, with sugar |
| C2 | 4s | `tea please` | tea, without sugar |
| C3 | 9s | `coffee with 2 sugar` | coffee, sugar_count 2 |
| C4 | 14s | `one tea` | tea, without sugar |
| C5 | 20s | `coffee please` | coffee, without sugar |
| C6 | 27s | `tea with 1 sugar` | tea, sugar_count 1 |

Seed `L12_E`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `tea with 2 sugar` | tea, sugar_count 2 |
| C2 | 4s | `one coffee` | coffee, without sugar |
| C3 | 8s | `one tea with sugar` | tea, with sugar |
| C4 | 13s | `coffee with 0 sugar` | coffee, sugar_count 0 |
| C5 | 18s | `one coffee without sugar` | coffee, without sugar |
| C6 | 24s | `tea please` | tea, without sugar |
| C7 | 31s | `coffee with 1 sugar` | coffee, sugar_count 1 |

## Expected Behavior

Query handles all listed clear intent-chip variants without guessing, dropping
modifiers, or regressing ambiguity behavior.

## Failure Conditions

- A listed clear intent-chip pattern fails to become the correct ticket.
- Numeric sugar and binary sugar are confused.
- Query asks for help on supported clear speech.
- Query misses an order under denser arrival spacing.

## Scoring Targets

- 2-star target: 40 blocks or fewer.
- 3-star target: 520 executed instructions or fewer across all required seeds.

## Godot Notes

- This level needs stronger replay controls because validation batches are
  longer.
- Fast-forward should preserve deterministic block execution counts.
