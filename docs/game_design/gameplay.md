# Gameplay

## Core Puzzle Loop

1. The player selects a shift on the campaign screen; a short transition opens the level. The level loads with a cafe scenario and Query's current saved program.
2. The player edits visual blocks in the code editor on the right side of the
   screen.
3. The player runs a deterministic validation simulation.
4. The cafe view on the left shows customers, tickets, and Query's execution.
5. If a seed fails, the run stops on the first failing case and highlights the
   relevant block or cafe event.
6. The player revises the program and reruns validation.
7. Completion requires every required validation seed to pass.

## Manual Work Model

The player never directly moves Niko around the cafe in Act I. Manual work is
represented by scripted human behavior before a robot has taken ownership of a
role.

- Shift 1 uses scripted human work in every role, to teach the workflow and
  show the bottleneck.
- Query owns order intake from shift 2, Brew the kitchen from shift 9 and
  Porter the dining room from shift 14. Until then Moka and Pip do those jobs
  automatically.
- If a robot fails its role, the shift fails. Nobody recovers the failed order
  during validation.

## Automation Progression

The campaign has 21 shifts. Each shift's lesson, customers and reference
programs are on its generated page in [docs/campaign/](../campaign/README.md);
the shift numbers below come from `src/domain/unlocks.ts`.

| Shift | Robot     | New programming focus                                   |
| ----- | --------- | ------------------------------------------------------- |
| 1     | None      | Observe the whole café workflow.                        |
| 2     | Query     | Wait for Orders, paper, Write coffee, Move and Deposit. |
| 3     | Query     | Jump destination and Jump, for a queue of customers.    |
| 4     | Query     | If and Else on what the customer said; tea.             |
| 5     | Query     | Sugar and “without” in speech; Write sugar.             |
| 6     | Query     | For item in order, for several drinks at once.          |
| 7     | Query     | Numbers in speech; Store and Write a variable's sugar.  |
| 8     | Query     | Unclear orders and Help.                                |
| 9     | Brew      | The coffee recipe in the kitchen.                       |
| 10    | Brew      | Tea: branch on the ticket.                              |
| 11    | Brew      | Sugar cubes counted from the order.                     |
| 12    | Brew      | Functions, for the recipe.                              |
| 13    | Brew      | Two cups at once.                                       |
| 14    | Porter    | Carrying drinks to tables.                              |
| 15    | Porter    | Clearing used cups.                                     |
| 16    | Porter    | A tray of two.                                          |
| 17    | All three | Drinks to go.                                           |
| 18    | All three | Only four café cups, so Brew washes up.                 |
| 19    | All three | Customers in a rush jump the queue.                     |
| 20    | All three | Closing time: every robot has to Stop.                  |
| 21    | All three | Everything at once.                                     |

Shift 1 shows the same workspace with a locked Automatic service block.
Watching the whole service is enough to go on; ticket inspection is optional.

## Completion And Replay

Correctness is mandatory. A programming level is complete only when every
required validation seed passes with no wrong delivered orders and no Query role
failure.

Replay scoring uses stars plus metrics:

- 1 star: all required seeds pass.
- 2 stars: all required seeds pass and program size is at or below the level's
  target block count.
- 3 stars: all required seeds pass, program size target is met, and executed
  instruction count target is met.

Shifts 15 to 21 also carry optional challenges, which earn no stars and come
to light on the receipt once the shift has been served. Each weighs the service
from one side: the tiles Porter walks, the longest any guest waits, the longest
a rush order waits, or how long the longest round runs until the crew has
stopped. They pull against the step target as often as with it (Brew claiming
two tickets at once runs fewer steps and serves later), so none of them names
one best routine. Each challenge's target is met by a routine in which Porter
waits by the table to clear it, and missed by the worked example
(`tests/unit/data/challenges.test.ts`). A challenge once met stays met in the
save, and the first one puts a stopwatch on the shelf.

Away from the rail, the campaign's Drills take one idea at a time: a gap in a
served shift's worked example, and two or three passages to fill it with. The
pick goes in, and the café serves that shift with it, so what comes back is the
café's own verdict, its first failure reason or the idea in a sentence. A drill
opens once its shift is served, so it never gives an unplayed shift away, and
nothing in it is kept or counted. Each act has at least one, and
`tests/unit/data/drills.test.ts` serves every passage: the worked example's
alone serves the shift. When a run fails the way a served drill's idea is
missed (paper not taken up first, a lid on a drink staying in), Help's clue
names that drill.

Scoring metrics shown after a run:

- Seeds passed.
- Average customer satisfaction.
- Program block count.
- Executed instruction count.
- First failure reason, when applicable.
