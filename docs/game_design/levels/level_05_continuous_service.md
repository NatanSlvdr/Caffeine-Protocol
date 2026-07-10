# Level 5: Continuous Service

## Purpose

Teach repeated service with explicit jump instructions. A one-shot program
should fail after the first order.

## Story Beat

Query handles one customer beautifully, then powers down its listening routine.
Niko has to teach it to jump back to the listening position because the counter
keeps receiving customers.

## Player Task

Update Query so it waits for and handles repeated customer speech events during
the whole validation run.

## Setup

- Active tables: 5.
- Menu: coffee, tea.
- Customers arrive over time.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `Position marker`
- `Jump to position`
- `Current speech intent`

## Starter Program

Start from the player's saved Level 4 solution. Add a highlighted position
marker above the existing wait block and an empty `Jump to` slot after ticket
submission.

Suggested structure:

```text
Position: listen
Wait for customer speech
Create ticket
If heard drink is tea
  Set item: tea
Else
  Set item: coffee
Submit ticket
Jump to listen
```

## Validation Seeds

Required seeds: 3.

Seed `L05_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | coffee |
| C2 | 15s | `tea` | tea |
| C3 | 32s | `coffee` | coffee |

Seed `L05_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `tea` | tea |
| C2 | 9s | `coffee` | coffee |
| C3 | 26s | `tea` | tea |
| C4 | 44s | `coffee` | coffee |

Seed `L05_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | coffee |
| C2 | 5s | `tea` | tea |
| C3 | 19s | `tea` | tea |
| C4 | 37s | `coffee` | coffee |

## Expected Behavior

Query remains available for the entire run and creates exactly one correct
ticket per customer speech event.

## Failure Conditions

- Query handles only the first customer and never jumps back to listen.
- Query creates tickets before a customer speaks.
- Query misses a later arrival.
- Query creates duplicate tickets for the same speech event.

## Scoring Targets

- 2-star target: 12 blocks or fewer.
- 3-star target: 70 executed instructions or fewer across all required seeds.

## Godot Notes

- The runtime should expose the current instruction pointer so `Jump to`
  behavior is easy to inspect.
- The step debugger must show Query waiting between events and then jumping
  back to the named listening position.
