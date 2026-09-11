# Programming System

## Editor Model

Programming uses large Scratch-like blocks. Blocks snap together in typed slots,
but invalid logic can still happen at runtime when the data flowing through a
valid block is not usable.

The code editor is always visible on the right third of the main puzzle screen.
The cafe simulation remains visible on the left two-thirds.

## Core Runtime

Query runs a linear instruction program that starts at the top when validation
begins. A level may provide starter blocks. Query's program persists between
levels unless the level says it starts from a training template.

Customer speech is read with explicit `Wait for customer speech` instructions,
not top-level `when` event blocks. When execution reaches a wait block, Query
pauses until the next matching event, then stores the current customer, source
phrase, and intent chips for the following blocks.

Loops are built with jump instructions. A program can place a named position
marker, such as `Position: listen`, and later use `Jump to listen` to move the
instruction pointer back to that marker. Act I should teach this as a simple,
visible machine-control concept before adding more advanced flow.

The runtime should support:

- action blocks;
- condition blocks;
- intent-chip inspection blocks;
- wait-for-event blocks;
- position marker blocks;
- jump-to-position blocks;
- variable read/write blocks;
- numeric comparison blocks;
- function definition and call blocks;
- error/report/ask-for-help blocks.

## Typed Slots

Minimum slot types:

- `Statement`: executable actions.
- `Boolean`: condition result.
- `Text`: source phrase for display/debug only.
- `Number`: sugar count or counters.
- `Position`: named jump target.
- `Item`: coffee or tea.
- `Modifier`: sugar data.
- `IntentChip`: heard drink, sugar, count, or confidence data.
- `Ticket`: structured order ticket.
- `Customer`: source customer object.

Blocks should prevent obviously impossible structure, such as placing a
statement where a boolean is required. Runtime errors still occur for cases like
reading a sugar count when the current speech event has no sugar-count chip.

## Intent Chip Blocks

Act I should avoid raw string-matching blocks as core puzzle tools. Query's
language layer converts customer speech into deterministic chips, and the player
programs how those chips become order tickets.

Important Act I blocks:

- `Heard drink is coffee`
- `Heard drink is tea`
- `Set item from heard drink`
- `Heard sugar is requested`
- `Heard sugar is not requested`
- `Set with_sugar from heard sugar`
- `Heard sugar count exists`
- `Set sugar_count from heard count`
- `Speech confidence is ambiguous`
- `Use clarification`

The source phrase can be displayed for debugging and story, but correctness
should depend on intent chips and structured ticket fields.

## Runtime Errors

Runtime errors are part of the puzzle. When an error occurs:

- the run stops;
- the failing block highlights;
- the cafe view remains at the failure moment;
- the result panel shows a concise reason.

Example error text:

- `No customer speech is available.`
- `Expected a sugar count chip, but none was heard.`
- `Ambiguous customer speech: "regular".`
- `Created ticket is missing an item.`

## Debugging Visibility

During simulation:

- the currently executing block highlights;
- ticket creation flashes on the queue board;
- customer speech bubbles remain readable long enough to inspect;
- runtime errors link back to the block that caused them;
- failed validation shows seed id, event time, customer id, source phrase,
  intent chips, expected ticket, and actual ticket when applicable.

## Run Controls

The main puzzle screen must support:

- Run validation.
- Pause.
- Step one block/event.
- Fast-forward.
- Restart current seed.
- Return to edit mode.

Edits apply between runs. During a running validation, the program is read-only
except when paused in an explicit debug-edit mode added later. Act I v1 should
ship with between-run editing only.

## Starter Code And Hints

Early levels may prefill starter blocks to show structure. Later levels can
start with the persistent previous solution and no new hints.

Hints are not a separate Act I requirement. Starter blocks are the primary hint
mechanism.

## Scoring Metrics

Correctness is required before score matters. After all seeds pass, replay
scoring rewards:

- smaller program block count;
- fewer executed instructions;
- high average customer satisfaction.

Each level defines block-count and instruction-count targets for 2-star and
3-star scoring.

## Godot Implementation Notes

Recommended resources/classes:

- `BlockDefinition.gd`: id, display name, category, input/output slot types,
  runtime opcode, and unlock level.
- `BlockInstance.gd`: placed block state, child connections, configured values.
- `ProgramGraph.gd`: serialized robot program with function definitions.
- `ProgramRuntime.gd`: interpreter for Query's program.
- `RuntimeFrame.gd`: call stack/function execution state.
- `ProgramResult.gd`: pass/fail, metrics, first failure, executed block count.

The runtime should be deterministic for the same `ProgramGraph` and
`ValidationSeed`.
