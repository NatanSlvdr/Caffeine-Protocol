# September 2026 implementation notes

## Source of truth and completed scope

The design specification was recovered from commit `5a31554` after its deletion in `770783a`. The 14 documented Act I levels remain the campaign. The older 10-level draft in Downloads is superseded by these documents. No undocumented future acts have been invented.

## Supplied artwork overrides the earlier production pipeline

The user's current instruction is to use the supplied assets without inventing additional world art; interface drawing is allowed. This supersedes the older custom-art generation and tile-reset directions in `art_direction.md` and `asset_pipeline.md`.

The room uses the seven existing `assets/tiles/tile-B-*.png` sheets through `cafe_tiles.tres` and real TileMapLayer nodes. Existing `assets/art/characters.png` supplies actors. No new raster world art was made. `assets/art/cafe_day.png` is retained as an unused existing file. The atlas is rendered in a portrait 14×19 room with 2–10 active tables. Niko works in the top kitchen, Query takes orders at a separate bottom till, and a scripted floor helper collects drinks from the pickup counter from shift 3. The helper reuses the existing robot sprite; its programming remains a future-act mechanic.

## Visual programming implementation

The default editor is a scrollable colored block stack. All operation/condition/value choices come from the finite unlocked vocabulary, preventing arbitrary expressions in typed slots. IF, EACH and FUNCTION insert their closing END; the numbered grip moves a whole structural group. Arrow buttons also allow deliberate individual statement rearrangement. Malformed structure is reported at compile time. The same program has an optional text view for keyboard use and compatibility with earlier saves.

The current Position and Function slots have the named values `listen` and `build_ticket`, sufficient for the Act I campaign. The function receives the current heard-order context, has its own local sugar/count variables, and returns the current ticket to the caller. Recursive calls are rejected. Every executed statement records its source line, opcode and call depth. A 1024-instruction event budget and 128-block source limit bound execution.

Legacy ITEM heard, REPEAT and copying instructions remain readable for existing saves. The lessons teach explicit IF/ELSE, Position/Jump and typed variable/function blocks. SUGAR heard is a convenience refactor operation from level 11. Programs carry forward unchanged; later stress levels may pass with an already robust solution, as the original persistence specification requires.

## Timing and replay

Validation evaluates every required seed deterministically and stops at the first incorrect order. Replay uses those recorded results and traces; it never reruns a modified program invisibly. An 18-second presentation interval per customer compresses the simulation clock. Ticket details show actual simulation timestamps rather than the presentation interval.

The model reserves the intake station, preparation station, server and earliest clean table. Manual intake takes 9 seconds; Query takes 1 second per ticket. Coffee takes 6 seconds, tea 7, delivery 5, customer departure 5 after delivery, and cleaning 4. Satisfaction decays by 0.6 points/second before tickets and 0.3 afterward until service. The scripted service is a deterministic validation harness, not a free-movement restaurant simulation.

The first two shifts unlock after replay completion. Ticket inspection is optional in both observation shifts. Programming results can unlock the next shift immediately after correctness validation; the replay remains inspectable. Editing is locked until replay completion or Stop & edit. Replay and Restart seed inspect the recorded run; Run service starts fresh validation with the current program.

## Screen and movement redesign

The user requested a separate campaign, less dense level interface and nearly enclosed kitchen. Campaign selection and animated entry now precede a shared café/program workspace for all shifts. Observation uses a locked Automatic service block. Options, Help, Results and ticket inspection open separate dialogs. Returning after completion selects the next campaign shift.

The portrait café has a dedicated order till, a brick kitchen partition, a staff doorway and a separate pickup counter. Niko and the floor helper hand off drinks across the counter. Actors follow continuous waypoint routes, keeping kitchen staff inside and floor actors outside except when Niko performs every role in observation. Presentation tests cover all ten tables, phase boundaries and wall crossings. The existing character atlas contains static poses; motion uses those poses and continuous positioning.

## Step-target tuning

The original documentation marked timing/scoring values as first-pass tuning. Levels 5, 6 and 7 now allow 100, 165 and 145 executed instructions respectively so their examples can earn three stars with explicit conditional branches, position markers and variable reads. All other documented block/step targets are retained. Markers, branch boundaries and function operations count when executed, consistently with the trace.

## Verification

The player, runtime, UI-interaction and independent reference validation scripts are under `scripts/validation/`. They cover all 14 levels, the ending, attainable three-star solutions, deterministic service schedules, branches and local function scope, invalid/missing values, bounded execution, saved-program inheritance, mouse insertion, shortcuts and replay controls. Rendering checks cover 1280×720 and 1100×720.
