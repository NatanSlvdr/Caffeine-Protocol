# September 2026 implementation notes

The sections below describe an earlier prototype. The current TypeScript Query implementation is documented in [programming.md](programming.md), [orders.md](orders.md), and the Level 3–14 documents. Those documents supersede the former Act I EACH, semantic-copy, and function progression. The current game has 32 shifts; kitchen/floor behavior is preserved by the Query redesign.

## Source of truth and completed scope

The design specification was recovered from commit `5a31554` after its deletion in `770783a`. The 14 documented Act I levels remain the campaign. The older 10-level draft in Downloads is superseded by these documents. No undocumented future acts have been invented.

## Historical supplied artwork

The Godot prototype used supplied assets without generating additional world art. At the time, this superseded the custom-art generation and tile-reset directions in `art_direction.md` and `asset_pipeline.md`.

The retired Godot prototype used seven `assets/tiles/tile-B-*.png` sheets and `assets/art/characters.png`; those prototype assets and Godot scene files have since been removed. The web implementation and current campaign data live in `src/`. The prototype used a portrait 14×19 room with 2–10 active tables, a top kitchen, a separate bottom till, and a scripted floor helper.

## Visual programming implementation

The current editor uses `IF <token> IN item` and `FOR item IN heard orders` with editable operands and matched END scopes. Authored heard groups are separate from expected tickets. Functions and semantic-copy commands are absent from Query's Act I vocabulary; existing kitchen/floor function support remains available.

Query retains Position/Jump, physical paper handling, and explicit numeric reads. Save version 3 resets incompatible Query programs and Act I scores while preserving unlocks, settings, and other robot routines. Full language and runtime behavior is described in [programming.md](programming.md).

## Timing and replay

Validation evaluates every required seed deterministically and stops at the first incorrect order. Replay uses those recorded results and traces; it never reruns a modified program invisibly. An 18-second presentation interval per customer compresses the simulation clock. Ticket details show actual simulation timestamps rather than the presentation interval.

The model reserves the intake station, preparation station, server and earliest clean table. Manual intake takes 9 seconds; Query takes 1 second per ticket. Coffee takes 6 seconds, tea 7, delivery 5, customer departure 5 after delivery, and cleaning 4. Satisfaction decays by 0.6 points/second before tickets and 0.3 afterward until service. The scripted service is a deterministic validation harness, not a free-movement restaurant simulation.

The first two shifts unlock after replay completion. Ticket inspection is optional in both observation shifts. Programming results can unlock the next shift immediately after correctness validation; the replay remains inspectable. Editing is locked until replay completion or Stop & edit. Replay and Restart seed inspect the recorded run; Run service starts fresh validation with the current program.

## Screen and movement redesign

The user requested a separate campaign, less dense level interface and nearly enclosed kitchen. Campaign selection and animated entry now precede a shared café/program workspace for all shifts. Observation uses a locked Automatic service block. Options, Help, Results and ticket inspection open separate dialogs. Returning after completion selects the next campaign shift.

The portrait café has a dedicated order till, a brick kitchen partition, a staff doorway and a separate pickup counter. Niko and the floor helper hand off drinks across the counter. Actors follow continuous waypoint routes, keeping kitchen staff inside and floor actors outside except when Niko performs every role in observation. Presentation tests cover all ten tables, phase boundaries and wall crossings. The existing character atlas contains static poses; motion uses those poses and continuous positioning.

## Step-target tuning

`src/data/campaign.json` contains the redesigned Act I targets. `src/data/service-targets.json` accounts for the more explicit Query program in later acts. All reference solutions can earn three stars. Instruction targets include a small margin over measured execution counts.

## Verification

The current tests live in `tests/` and run with `npm test`. They cover all 32 reference solutions, the live interpreter, movement and handoffs, token membership, negation, numbers, multiple paper tickets, clarification, editor operands, and versioned saves. `npm run build` checks TypeScript and builds the production bundle. Browser testing is performed only when explicitly requested.
