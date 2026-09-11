# User Interface

## Campaign

The campaign is a separate screen with all 14 shifts, lock states, completion and stars. Selecting a shift shows its lesson and launch button. Launching fades through a short title transition into the level. Returning after completion selects the next shift. Reduced motion shortens transitions.

## Level Workspace

The level has a compact header with campaign navigation and the current shift. A portrait café occupies the left side; a spacious program workspace occupies the right. The café is a 14×19 tile room rendered with the supplied TileSet and actor atlas.

The first two observation shifts use this same layout. Their editor contains a locked Automatic service block describing intake, preparation, serving and cleaning. Watch service starts observation; opening inspection is optional.

## Café Panel

The top kitchen is almost enclosed by a brick partition. A staff doorway and a distinct pickup counter connect it to the dining room. A separate order till sits near the bottom entrance. Labels distinguish Orders, Kitchen, Pickup and Staff. Tables occupy two columns beside a central aisle.

Niko works inside the kitchen from shift 3. Query remains at the order till. A scripted floor robot collects drinks from the outside of the pickup counter and delivers them to tables. During observation Niko performs every role. Movement follows continuous routes through the doorway and aisle.

Below the café, one caption describes the current service stage. A slim toolbar contains pause, progress, playback speed and Inspect. Detailed tickets and navigation do not occupy the main workspace.

## Program Panel

The program panel contains Help and Options, a short lesson summary, the unlocked block palette, the scrollable program and one primary Run service button. That button becomes Stop & edit during playback. The active instruction highlights in the recorded trace. Completion offers Back to campaign; the final shift offers the ending.

## Separate Dialogs

- Help explains the lesson and optionally reveals the worked solution.
- Options contains the source editor toggle, incoming-program reset and ticket inspection.
- Inspect pauses playback and shows the phrase, intent chips, tickets, simulation timestamps, customer navigation, replay, step and restart controls.
- Results shows seed counts, satisfaction, block/step metrics and the first failure details.

Editing is locked during playback until Stop & edit or replay completion. Inspection is optional for every shift. Controls and dialogs must remain usable at 1100×720 as well as 1280×720.

## Implementation

`Campaign.tscn` hosts the campaign. `Game.tscn` arranges `Cafe.tscn` and `Code.tscn`. `cafe_art.gd` assembles the supplied tiles and animates actors; `screen_transition.gd` handles entry and departure. Interface decoration may be drawn in code; world art uses existing assets only.
