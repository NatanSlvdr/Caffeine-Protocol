# Level 14: Employee of the Month

## Purpose

Certify that Query can run Act I order intake without Niko intervening at the
counter.

## Story Beat

Query finishes a full service shift and receives the cafe's first repaired
employee badge. Order intake is no longer the bottleneck; preparation is.

## Player Task

Pass a final validation suite covering every Query concept from Act I.

## Setup

- Active tables: 10.
- Menu: coffee, tea.
- Modifiers: binary sugar and numeric sugar.
- Query owns order intake.
- Scripted preparation becomes visibly busy to set up Act II.

## Available Blocks

All Act I Query blocks.

## Starter Program

Start from the player's saved Level 13 solution. No starter hints.

## Validation Seeds

Required seeds: 7.

Seed `L14_A`: simple coffee/tea clear intents.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee` | none | coffee |
| C2 | 5s | `tea` | none | tea |
| C3 | 10s | `coffee` | none | coffee |
| C4 | 16s | `tea` | none | tea |
| C5 | 23s | `coffee` | none | coffee |

Seed `L14_B`: binary sugar intents.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee with sugar` | none | coffee, with sugar |
| C2 | 5s | `coffee without sugar` | none | coffee, without sugar |
| C3 | 11s | `tea with sugar` | none | tea, with sugar |
| C4 | 17s | `tea without sugar` | none | tea, without sugar |
| C5 | 24s | `one coffee with sugar` | none | coffee, with sugar |
| C6 | 32s | `one tea without sugar` | none | tea, without sugar |

Seed `L14_C`: numeric sugar intents.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee with 0 sugar` | none | coffee, sugar_count 0 |
| C2 | 5s | `coffee with 1 sugar` | none | coffee, sugar_count 1 |
| C3 | 10s | `coffee with 2 sugar` | none | coffee, sugar_count 2 |
| C4 | 16s | `tea with 0 sugar` | none | tea, sugar_count 0 |
| C5 | 23s | `tea with 1 sugar` | none | tea, sugar_count 1 |
| C6 | 31s | `tea with 2 sugar` | none | tea, sugar_count 2 |

Seed `L14_D`: source phrase variants with clear intents.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `one coffee` | none | coffee, without sugar |
| C2 | 4s | `coffee please` | none | coffee, without sugar |
| C3 | 9s | `one tea` | none | tea, without sugar |
| C4 | 15s | `tea please` | none | tea, without sugar |
| C5 | 22s | `one coffee with sugar` | none | coffee, with sugar |
| C6 | 30s | `one tea with 2 sugar` | none | tea, sugar_count 2 |

Seed `L14_E`: multi-order speech.

| Customer | Arrival | Phrase | Clarification | Expected Tickets |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee and tea` | none | coffee; tea |
| C2 | 6s | `two coffees` | none | coffee; coffee |
| C3 | 14s | `tea and coffee` | none | tea; coffee |
| C4 | 22s | `two teas` | none | tea; tea |

Seed `L14_F`: ambiguity/help cases.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `regular` | coffee without sugar | coffee, without sugar |
| C2 | 5s | `the usual` | tea with 1 sugar | tea, sugar_count 1 |
| C3 | 11s | `same as yesterday` | coffee with 2 sugar | coffee, sugar_count 2 |
| C4 | 18s | `something warm` | tea without sugar | tea, without sugar |
| C5 | 26s | `coffee please` | none | coffee, without sugar |
| C6 | 35s | `tea with sugar` | none | tea, with sugar |

Seed `L14_G`: mixed full-service shift.

| Customer | Arrival | Phrase | Clarification | Expected Ticket |
| --- | ---: | --- | --- | --- |
| C1 | 0s | `coffee` | none | coffee |
| C2 | 4s | `tea with 2 sugar` | none | tea, sugar_count 2 |
| C3 | 8s | `regular` | coffee with 1 sugar | coffee, sugar_count 1 |
| C4 | 12s | `one coffee without sugar` | none | coffee, without sugar |
| C5 | 17s | `the usual` | tea with sugar | tea, with sugar |
| C6 | 22s | `coffee with 0 sugar` | none | coffee, sugar_count 0 |
| C7 | 27s | `tea please` | none | tea, without sugar |
| C8 | 33s | `same as yesterday` | coffee with 2 sugar | coffee, sugar_count 2 |
| C9 | 39s | `one tea with sugar` | none | tea, with sugar |
| C10 | 46s | `something warm` | tea without sugar | tea, without sugar |
| C11 | 54s | `coffee please` | none | coffee, without sugar |
| C12 | 63s | `tea with 1 sugar` | none | tea, sugar_count 1 |

## Expected Behavior

Query creates the correct number of tickets for every supported clear intent,
asks for help only when speech confidence is ambiguous, handles clarification
chips correctly, and remains active for the full service run.

## Failure Conditions

- Any Act I behavior regresses.
- Any wrong delivered order occurs.
- Any customer abandons because Query missed or delayed order intake.
- Query creates the wrong number of tickets for a speech event.
- Query asks for help for supported clear speech.
- Query guesses ambiguous speech.

## Scoring Targets

- 1 star: all seven seeds pass.
- 2-star target: 48 blocks or fewer.
- 3-star target: 1000 executed instructions or fewer across all required seeds.

## End Of Act

Completion unlocks the Act II hook: preparation is now the bottleneck. The next
documentation pass should define the preparation robot arc before implementing
Act II.

## Godot Notes

- This level should be the main Act I acceptance test.
- Keep the failure report strict and explicit; the player should know exactly
  which learned concept failed.
