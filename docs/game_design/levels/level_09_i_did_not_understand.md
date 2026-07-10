# Level 9: I Did Not Understand

## Purpose

Teach ambiguity handling through speech confidence and asking for help.

## Story Beat

A regular says "the usual." Query freezes because it does not know whose usual
that is. Niko teaches Query not to guess.

## Player Task

Update Query so `confidence: ambiguous` speech triggers the ask-for-help path
instead of creating a guessed ticket.

## Setup

- Active tables: 6.
- Menu: coffee, tea.
- Modifier: binary sugar.
- Ambiguous speech confidence appears.
- Query owns order intake.

## Available Blocks

Existing blocks plus:

- `Report error`
- `Ask Niko for help`
- `Default case`
- `Use clarification`
- `Speech confidence is ambiguous`

## Starter Program

Start from the player's saved Level 8 solution. No new blocks are prefilled, but
the first ambiguous failure replay should highlight the branch that creates a
guessed ticket without checking speech confidence.

## Validation Seeds

Required seeds: 3.

Seed `L09_A`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `regular` | coffee without sugar | coffee, without sugar |
| C2 | 8s | `coffee please` | none | coffee, without sugar |
| C3 | 16s | `tea with sugar` | none | tea, with sugar |

Seed `L09_B`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `the usual` | tea with sugar | tea, with sugar |
| C2 | 7s | `one coffee` | none | coffee, without sugar |
| C3 | 14s | `something warm` | coffee with sugar | coffee, with sugar |

Seed `L09_C`:

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `same as yesterday` | tea without sugar | tea, without sugar |
| C2 | 6s | `one tea with sugar` | none | tea, with sugar |
| C3 | 12s | `regular` | coffee with sugar | coffee, with sugar |

## Expected Behavior

Query must identify ambiguous speech confidence, ask for help, and then create
the ticket from the provided clarification chips.

## Failure Conditions

- Query guesses coffee or tea for ambiguous speech without asking for help.
- Query asks for help for a clear supported speech event.
- Query ignores the clarification.
- Query reports an error but creates no ticket after help is provided.

## Scoring Targets

- 2-star target: 31 blocks or fewer.
- 3-star target: 230 executed instructions or fewer across all required seeds.

## Godot Notes

- Validation seeds need optional clarification chip data.
- The help interaction is deterministic in validation; no free-form player text
  input is required in Act I.
