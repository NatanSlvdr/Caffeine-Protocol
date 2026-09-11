# Level 10: How Many Sugars?

## Purpose

Teach numeric variables and comparisons by upgrading sugar from a binary chip to
a count chip.

## Story Beat

One customer asks for two sugars. Query proudly marks the ticket as "sugar:
yes," which is no longer precise enough.

## Player Task

Update Query so tickets use `sugar_count` when a speech event includes a numeric
sugar-count chip.

## Setup

- Active tables: 6.
- Menu: coffee, tea.
- Modifier: numeric sugar count.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `Heard sugar count exists`
- `Read heard sugar count`
- `Set sugar_count`
- `Number equals`
- `Number value`
- `If sugar count found`

## Starter Program

Start from the player's saved Level 9 solution. The old `with_sugar` logic may
remain for previous binary sugar chips, but numeric sugar chips must set
`sugar_count`.

## Validation Seeds

Required seeds: 4.

Seed `L10_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee with 0 sugar` | coffee, sugar_count 0 |
| C2 | 8s | `coffee with 1 sugar` | coffee, sugar_count 1 |
| C3 | 16s | `tea with 2 sugar` | tea, sugar_count 2 |

Seed `L10_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `tea with 0 sugar` | tea, sugar_count 0 |
| C2 | 7s | `coffee with 2 sugar` | coffee, sugar_count 2 |
| C3 | 14s | `tea with 1 sugar` | tea, sugar_count 1 |

Seed `L10_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `one coffee with 2 sugar` | coffee, sugar_count 2 |
| C2 | 6s | `one tea with 1 sugar` | tea, sugar_count 1 |
| C3 | 12s | `regular` | ask for help |

Seed `L10_D`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee with sugar` | coffee, with_sugar true |
| C2 | 7s | `tea without sugar` | tea, with_sugar false |
| C3 | 14s | `tea with 2 sugar` | tea, sugar_count 2 |

## Expected Behavior

Numeric sugar chips create tickets with `sugar_count`. Older binary sugar chips
must still work.

## Failure Conditions

- Numeric sugar chips only set `with_sugar`.
- Sugar count is off by one or missing.
- Zero sugar is treated as ambiguous or as `with_sugar = true`.
- Ambiguity handling from Level 9 regresses.

## Scoring Targets

- 2-star target: 38 blocks or fewer.
- 3-star target: 310 executed instructions or fewer across all required seeds.

## Godot Notes

- `Read heard sugar count` reads a deterministic intent chip, not raw text.
- Do not introduce raw natural-language number parsing in Act I.
