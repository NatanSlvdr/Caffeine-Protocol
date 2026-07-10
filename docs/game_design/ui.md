# User Interface

## Main Puzzle Screen

The Act I puzzle screen is a fixed split view:

- Left two-thirds: cafe simulation.
- Right one-third: Query code editor, block palette, run controls, and results.

The player should be able to understand what Query did without leaving this
screen.

## Cafe Panel

The cafe panel shows:

- counter queue;
- compact cafe footprint with the kitchen/prep zone on the left side;
- service countertops enclosing that kitchen zone;
- bottom entrance/order point;
- Query near the counter;
- future preparation and floor/server robot stations;
- customer speech bubbles;
- queue board with tickets;
- active tables;
- dirty table states;
- preparation and serving animations;
- validation failure marker when a run stops.

The cafe should not be shown as a large empty hall. Start with a compact room:
left-side kitchen/prep zone, main seating/walking area to the right, and only the
tables needed for the current level.

## Code Panel

The code panel contains:

- block palette filtered by unlocked level blocks;
- Query's current program;
- function area when functions are unlocked;
- selected block inspector, if needed for configured values;
- run controls;
- compact result panel.

The currently executing block highlights during simulation. If a runtime error
occurs, the failing block remains highlighted with its reason visible.

## Run Controls

Required controls:

- Run validation.
- Pause.
- Step.
- Fast-forward.
- Restart seed.
- Stop and edit.

During validation, editing is disabled. The player can stop the run to edit the
program.

## Ticket Debug Toggle

Tickets show a simple view by default. A debug toggle expands tickets to show
structured fields such as source phrase, intent chips, customer id, table id,
sugar data, and timing.

The debug toggle is available in all programming levels. It can be hidden or
disabled in story-only interludes.

## Failure Result Panel

When validation fails, show:

- seed id;
- customer id;
- event time;
- spoken phrase and intent chips;
- expected ticket;
- actual ticket, if any;
- failing block id/name, if applicable;
- concise failure reason.

The panel should offer `Replay Failure`, `Restart Seed`, and `Edit Program`.

## Godot Implementation Notes

Recommended scenes:

- `MainPuzzleScreen.tscn`: split layout root.
- `CafeRoom.tscn`: cafe-only room art scene that can be embedded by gameplay
  screens. The first art pass uses `TileMapLayer` nodes over a 16x10 tile
  rectangle with the shared `cafe_assets_48.tres` TileSet. Draw order is
  `Floor`, `Walls`, `Furniture`, then `Objects`.
- `CafePanel.tscn`: embeds `CafeSimulation.tscn`.
- `CodeEditorPanel.tscn`: block palette, program canvas, run controls.
- `TicketWidget.tscn`: simple/debug ticket rendering.
- `ValidationResultPanel.tscn`: pass/fail metrics and first failure details.

Use explicit minimum sizes for the code panel so block labels remain readable at
the target resolution.
