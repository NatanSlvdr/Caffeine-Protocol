# Level 3: Boot Sequence

## Purpose

Teach Query to create a coffee ticket when a customer speaks.

## Story Beat

Niko repairs Query enough to hear customers. Query proudly announces that it can
listen, but it does not yet know what to do with what it hears.

## Player Task

Program Query to wait for one customer speech event, then add one coffee ticket.

## Setup

- Active tables: 3.
- Menu: coffee only.
- Query owns order intake.
- Scripted systems still prepare, serve, and clean.

## Available Blocks

- `Wait for customer speech`
- `Create ticket`
- `Set item: coffee`
- `Submit ticket`

## Starter Program

Prefilled:

```text
Wait for customer speech
Create ticket
```

The player must set the item to coffee and submit the ticket.

## Validation Seeds

Required seeds: 2.

Seed `L03_A`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | coffee |

Seed `L03_B`:

| Customer | Arrival | Phrase | Expected Ticket |
| --- | ---: | --- | --- |
| C1 | 6s | `coffee` | coffee |

## Expected Behavior

After the wait block receives the customer speech event, Query creates exactly
one ticket with `item = coffee`.

## Failure Conditions

- No ticket is created.
- More than one ticket is created for one speech event.
- The ticket has no item.
- The ticket item is not coffee.
- Query creates a ticket before the wait block receives customer speech.

## Scoring Targets

- 2-star target: 4 blocks or fewer.
- 3-star target: 18 executed instructions or fewer across all required seeds.

## Godot Notes

- First programming level; keep failure messages direct.
- Query's saved program becomes the starting point for Level 4.
