# Level 8: Regulars

## Purpose

Teach functions by sharing repeated ticket-building logic across customer speech
variants.

## Story Beat

Regular customers start saying the same things in slightly different ways. Query
hears the same useful intent chips, but the ticket-building code is getting
awkward.

## Player Task

Create and call a function that converts the current speech intent into a ticket
without duplicating item and sugar setup.

## Setup

- Active tables: 6.
- Menu: coffee, tea.
- Modifier: binary sugar.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `Define function`
- `Call function`
- `Function parameter: speech intent`
- `Return ticket`
- `Set item from heard drink`

## Starter Program

Start from the player's saved Level 7 solution. The level may prefill an empty
function shell:

```text
Function build_ticket_from_intent(speech intent)
  Create ticket
  Set item from heard drink
  Set sugar from heard sugar
  Return ticket
```

## Validation Seeds

Required seeds: 3.

Seed `L08_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `one coffee` | coffee, without sugar |
| C2 | 8s | `coffee please` | coffee, without sugar |
| C3 | 16s | `one tea` | tea, without sugar |

Seed `L08_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `tea please` | tea, without sugar |
| C2 | 7s | `one coffee with sugar` | coffee, with sugar |
| C3 | 14s | `one tea with sugar` | tea, with sugar |

Seed `L08_C`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee please` | coffee, without sugar |
| C2 | 6s | `tea please with sugar` | tea, with sugar |
| C3 | 12s | `one coffee without sugar` | coffee, without sugar |
| C4 | 18s | `one tea without sugar` | tea, without sugar |

## Expected Behavior

Query uses reusable logic to map clear intent chips to the same ticket outcomes
even when the source phrases vary.

## Failure Conditions

- Variant source phrases with clear intent chips create wrong items.
- Variant source phrases lose sugar data.
- Function recursion causes a runtime error.
- Existing clear intent patterns regress.

## Scoring Targets

- 2-star target: 24 blocks or fewer.
- 3-star target: 165 executed instructions or fewer across all required seeds.

## Godot Notes

- The interpreter must support function calls, returns, and local parameters.
- The debugger should show function call entry and return in the highlighted
  block flow.
