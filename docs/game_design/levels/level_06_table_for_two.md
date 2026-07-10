# Level 6: Table for Two

## Purpose

Teach that one customer speech event can contain more than one order intent, and
Query must create one ticket for each heard order.

## Story Beat

Two customers step up together and one of them orders for both. Query proudly
creates one perfect ticket, then the second drink never appears. Niko explains
that a single sentence can contain multiple cafe orders.

## Player Task

Update Query so it loops through the current speech event's order chips and
submits one ticket per order.

## Setup

- Active tables: 5.
- Menu: coffee, tea.
- Multi-order speech appears.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `For each heard order`
- `Current order`
- `Heard order count`
- `Set item from current order`

## Starter Program

Start from the player's saved Level 5 solution. Add a highlighted wrapper slot
around ticket creation to suggest iterating over heard orders.

Suggested structure:

```text
Position: listen
Wait for customer speech
For each heard order
  Create ticket
  If current order drink is tea
    Set item: tea
  Else
    Set item: coffee
  Submit ticket
Jump to listen
```

## Validation Seeds

Required seeds: 3.

Seed `L06_A`:

| Customer | Arrival | Speech | Expected Tickets |
| --- | ---: | --- | --- |
| C1 | 0s | `two coffees` | coffee; coffee |
| C2 | 12s | `coffee and tea` | coffee; tea |
| C3 | 24s | `two teas` | tea; tea |

Seed `L06_B`:

| Customer | Arrival | Speech | Expected Tickets |
| --- | ---: | --- | --- |
| C1 | 0s | `tea and coffee` | tea; coffee |
| C2 | 9s | `two coffees` | coffee; coffee |
| C3 | 21s | `coffee` | coffee |

Seed `L06_C`:

| Customer | Arrival | Speech | Expected Tickets |
| --- | ---: | --- | --- |
| C1 | 0s | `two teas` | tea; tea |
| C2 | 8s | `coffee and tea` | coffee; tea |
| C3 | 18s | `tea` | tea |
| C4 | 30s | `tea and coffee` | tea; coffee |

## Expected Behavior

Query creates exactly one ticket for each heard order chip in the speech event,
in the same order the chips were heard.

## Failure Conditions

- Query creates only one ticket for a multi-order speech event.
- Query creates too many tickets.
- Query creates the right number of tickets in the wrong order.
- Any ticket has the wrong item.
- Query stops listening after the first customer.

## Scoring Targets

- 2-star target: 16 blocks or fewer.
- 3-star target: 95 executed instructions or fewer across all required seeds.

## Godot Notes

- Validation must compare the ordered list of tickets per customer speech event.
- Earlier levels still expect one ticket per speech event; this level unlocks
  multiple tickets only when the current speech intent contains multiple order
  chips.
