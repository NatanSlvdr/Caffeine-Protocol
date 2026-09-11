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

- Levels 1 and 2 use scripted human order intake to teach the workflow and show
  the bottleneck.
- From Level 3 onward, Query owns order intake.
- If Query fails to create correct order tickets, the level fails. Niko does not
  recover the failed order during validation.

## Automation Progression

| Level | New Programming Focus | Main Purpose |
| --- | --- | --- |
| 1 | None | Observe the full cafe workflow. |
| 2 | None | Show that human order intake becomes a bottleneck. |
| 3 | Wait for event, action | Create a coffee ticket after a customer speaks. |
| 4 | If, else, intent-chip inspection | Distinguish coffee from tea. |
| 5 | Position marker, jump to position | Handle repeated customer arrivals. |
| 6 | For each heard order | Create multiple tickets from one customer speech event. |
| 7 | Modifier variable | Track binary sugar for coffee and tea. |
| 8 | Function | Share repeated ticket-building logic across speech variants. |
| 9 | Runtime error, ask for help | Handle ambiguous speech confidence. |
| 10 | Number variable, numeric comparison | Track sugar-count chips. |
| 11 | Refactor review | Improve persistent Query logic with less guidance. |
| 12 | Intent stress | Handle larger clear-intent batches. |
| 13 | Ambiguity stress | Combine ambiguous confidence, sugar counts, and error handling. |
| 14 | Act I certification | Pass all Query concepts in a final exam. |

Levels 1–2 retain the same editor workspace with a locked Automatic service block. Watching the complete service is sufficient to progress; ticket inspection is optional.

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

Scoring metrics shown after a run:

- Seeds passed.
- Average customer satisfaction.
- Program block count.
- Executed instruction count.
- First failure reason, when applicable.
