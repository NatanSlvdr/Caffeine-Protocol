# Programming system

## Query language

The block editor and text editor serialize the same finite language. Query starts with `LISTEN`, optionally preceded by a `POSITION listen` marker. Early conditions test `CUSTOMER SPEECH`; `item` refers to the selected group only inside FOR.

Act I offers these operations progressively:

- `LISTEN`, `TAKE <direction>`, `ITEM coffee`, `ITEM tea`, `MOVE <direction> <tiles>`, `DEPOSIT <direction>`.
- `IF <token> IN item` or `IF <token> NOT IN item`, `ELSE`, `END`.
- `POSITION <label>` and `JUMP <label>` for continuous service. `REPEAT` remains accepted at the end of a program.
- `WRITE 1 sugar` and `WRITE 0 sugar`.
- `FOR item IN heard orders` with a closing `END`.
- `STORE var1 FROM number` and `WRITE var1 sugar`.
- `HELP` and `ERROR`.

Tokens unlock as coffee/tea at Level 4, sugar at Level 6, negation at Level 7, number at Level 10, and ambiguous at Level 11. The editor offers one IF block with editable token and source operands. The connector control at the end of a condition row adds AND or OR and a new row with the same operands within that IF. Connectors can be changed or removed. Text mode keeps the expression on one line, for example `IF sugar IN item AND negation NOT IN item`; AND binds more tightly than OR. It offers one FOR block with separate variable and collection operands.

`EACH`, semantic-copy item/sugar commands, and shorthand Query conditions are retired. Functions are not available to Query in Act I. The kitchen/floor compilers and their existing function infrastructure remain intact. A future kitchen controller memory limit should make function reuse meaningful; that redesign is outside this change.

## Selected order and loop execution

Speech is an authored array of `{ tokens: string[], number?: number }` values, separate from validation metadata. Membership evaluates `bindings[source]?.tokens.includes(token)`. Query never derives commands from a solved ticket intent or raw text.

A FOR instruction has independent `variable` and `selector` fields. The selector registry resolves the collection; the loop runtime binds one value, executes its body, advances at END, and restores the previous binding when finished. Act I allows only variable `item` and selector `heard orders`. Unsupported selectors and nested FOR blocks fail compilation. Empty collections skip the body. Jumps out of an active loop fail at runtime.

Store creates or updates a named numeric local: `STORE var1 FROM number` copies the current item’s numeric metadata. The four fixed slots are var 1, var 2, var 3, and var 4, each with its own icon. The assignment displays two selectors separated by =. Sources include Number in item, constants from 0 to 19, and another variable. `WRITE var1 sugar` writes that amount onto the held paper while preserving its drink and quantity. The shared Write block also offers fixed sugar amounts from 0 to 19. Locals reset between customers and loop iterations, preventing a number from a previous order from leaking into the next ticket. Missing number tokens and unassigned variables produce an error at the relevant source line. Saved `READ number` and `SUGAR` instructions migrate to Store and Write.

HELP replaces the heard collection and current item with authored clarification data. It runs before taking paper or entering FOR. Unresolved ambiguity is deferred without guessing.

## Physical workflow

Every ticket begins with a fresh sheet from the register paper stack. Query can write only on held paper. It must move right to the handoff, deposit right, then return left to the register. The stack is also reachable diagonally from the handoff tile. Movement respects the existing walkable cells and obstacles.

Different drinks or modifier choices need separate sheets; identical drinks can share one sheet with a quantity. Taking another sheet while holding one, depositing an itemless sheet, ending FOR while holding paper, or finishing checkout away from the register fails. Legacy `TICKET`, `PICKUP`, and `SUBMIT` action aliases use the same physical handlers or migrate to TAKE/DEPOSIT.

## Editor, debugging, and limits

IF and FOR insert matching END delimiters; dragging or deleting a scope carries its children. Source lines survive formatting and are used for execution/error highlighting. Text is parsed as finite commands, never evaluated as JavaScript.

The existing 128-block Query limit, 1,024-instruction customer limit, and 10,000-instruction seed limit remain. Correctness precedes scoring. Block and instruction targets are calibrated to attainable reference solutions, including Query's additional explicit token logic in later acts.

The live game and offline validation drain the same interpreter. Run, Pause, Step, and Stop & edit preserve the existing physical simulation and service pipeline. Tests exercise branches, loops, explicit modifier logic, HELP, number scope, editor operands, save migration, and all 32 reference programs.

## Save migration

Save version 3 replaces incompatible Query programs with the redesigned lesson starters. It clears old Query solutions and Act I stars/story flags while retaining selected/unlocked levels, settings, and kitchen/floor routines. Completed legacy Act I still unlocks the kitchen. Current-version programs continue carrying forward normally. The existing storage key is retained so old saves can be found and migrated.


## Current editor and quantity behavior

Early conditions use `CUSTOMER SPEECH`, which tests the recognized tokens across the heard groups. The `item` source becomes available only inside a `FOR item IN heard orders` body. Compilation enforces that scope, and saved implicit-item conditions outside loops migrate to customer speech.

Write displays an editable quantity before the drink, for example `Write 2 Coffee` (`ITEM 2 coffee` in text). Quantities range from 1 to 19. One paper can request several identical drinks with the same modifiers; the kitchen creates individual cup jobs while retaining the original paper and its quantity. Payment and validation count every cup. The original `ITEM coffee` syntax means one coffee.

Customer bubbles retain the original phrase and grouped 3D drink/sugar icons throughout the visit. Sugar uses three cubes. Clarification appears only after HELP. The handoff counter displays its pending order list, updating quantities as the cook claims cups. Service starts at the beginning of the full six-second street approach, before any order instructions execute.
