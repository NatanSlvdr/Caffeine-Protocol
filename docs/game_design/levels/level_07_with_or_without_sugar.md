# Level 7: With or Without Sugar?

## Purpose

Teach binary modifier chips and storing order data beyond the item type.

## Story Beat

Customers start asking for sugar. Query understands the drink name but keeps
forgetting the sweet part.

## Player Task

Update Query so coffee and tea tickets copy the heard binary sugar chip into
`with_sugar = true` or `with_sugar = false`.

## Setup

- Active tables: 5.
- Menu: coffee, tea.
- Modifier: binary sugar.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `Heard sugar is requested`
- `Heard sugar is not requested`
- `Set with_sugar`
- `Boolean true`
- `Boolean false`
- `Ticket modifier slot`

## Starter Program

Start from the player's saved Level 6 solution. Existing item recognition must
continue working.

## Validation Seeds

Required seeds: 3.

Seed `L07_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee with sugar` | coffee, with sugar |
| C2 | 8s | `tea without sugar` | tea, without sugar |
| C3 | 16s | `coffee without sugar` | coffee, without sugar |

Seed `L07_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `tea with sugar` | tea, with sugar |
| C2 | 6s | `coffee with sugar` | coffee, with sugar |
| C3 | 12s | `tea without sugar` | tea, without sugar |
| C4 | 18s | `coffee without sugar` | coffee, without sugar |

Seed `L07_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee without sugar` | coffee, without sugar |
| C2 | 7s | `coffee with sugar` | coffee, with sugar |
| C3 | 14s | `tea with sugar` | tea, with sugar |
| C4 | 21s | `tea without sugar` | tea, without sugar |

## Expected Behavior

Query creates the correct item ticket and sets `with_sugar` from the heard sugar
chip for both coffee and tea.

## Failure Conditions

- Sugar is omitted.
- Sugar is inverted.
- Sugar works for coffee but not tea, or tea but not coffee.
- Existing coffee/tea item recognition regresses.

## Scoring Targets

- 2-star target: 18 blocks or fewer.
- 3-star target: 145 executed instructions or fewer across all required seeds.

## Godot Notes

- Keep `with_sugar` and future `sugar_count` as separate nullable fields so Level
  10 can introduce numeric sugar without rewriting old tickets.
