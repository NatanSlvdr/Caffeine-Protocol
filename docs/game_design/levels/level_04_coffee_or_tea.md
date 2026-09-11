# Level 4: Coffee or Tea?

## Purpose

Teach conditions and intent-chip inspection by adding tea.

## Story Beat

Niko finds the tea station manual. Query assumes every warm drink is coffee
until Niko teaches it the difference.

## Player Task

Update Query so it creates coffee tickets when the heard drink chip is coffee
and tea tickets when the heard drink chip is tea.

## Setup

- Active tables: 4.
- Menu: coffee, tea.
- Query owns order intake.
- No unknown or ambiguous intent chips appear in this level.

## Available Blocks

Existing Level 3 blocks plus:

- `If`
- `Else`
- `Heard drink is`
- `Set item: tea`

## Starter Program

Start from the player's saved Level 3 solution.

Suggested structure shown by starter ghost outline:

```text
Wait for customer speech
Create ticket
If heard drink is tea
  Set item: tea
Else
  Set item: coffee
Submit ticket
```

## Validation Seeds

Required seeds: 3.

Seed `L04_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | coffee |

Seed `L04_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 7s | `tea` | tea |

Seed `L04_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 12s | `tea` | tea |

## Expected Behavior

Query must distinguish `drink: coffee` and `drink: tea` intent chips. An `else
coffee` branch is acceptable because validation includes no unknown drink chips
yet.

## Failure Conditions

- Tea intent creates a coffee ticket.
- Coffee intent creates a tea ticket.
- Any speech event creates no ticket or duplicate tickets.

## Scoring Targets

- 2-star target: 9 blocks or fewer.
- 3-star target: 45 executed instructions or fewer across all required seeds.

## Godot Notes

- Do not include ambiguity or synonyms yet.
- Level result text should mention that `else` is safe only because this level's
  heard drink chips are limited.
