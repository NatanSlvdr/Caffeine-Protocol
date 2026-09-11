# Caffeine Protocol

A playable Godot café programming campaign: 14 shifts (two observation shifts and twelve Query puzzles), based on the restored design documents in `docs/game_design/`.

## Play

Double-click **Play.command**, or open `project.godot` in Godot 4.6 or newer and press **F5**.

1. Choose a shift on the separate **Campaign** screen. A short transition opens the café and its program workspace. The first two shifts have a locked **Automatic service** block; choose **Watch service** and observe the complete service to unlock the next shift.
2. From shift 3, choose an instruction and click **Add block**. Click a block to insert after it, use ↑ / ↓ to move a single block, or drag its numbered grip to move an entire IF, EACH or function group. **×** removes a block. IF, EACH and FUNCTION automatically insert their matching END.
3. **Run service** (Ctrl/⌘ + Enter) validates every required seed. The same button becomes **Stop & edit** during playback. Every required seed must pass before the next shift unlocks.
4. The café toolbar contains **Pause**, playback speed and **Inspect**. Inspection pauses playback and opens ticket details, customer navigation, **Step block**, **Restart seed** and **Replay** in a separate window. Each customer has an 18-second presentation at 1×; recorded simulation timestamps remain separate.
5. **Help** explains the lesson and offers a worked example. **Options** contains the optional text editor and program reset. **Results** opens detailed validation metrics. **Back to campaign** selects the next shift after completion.

One star rewards correctness, two reward the block target, and three add the executed-step target. Best stars, drafts, the last passing program, story interludes and settings save locally. Each new level inherits your last passing program. Reset restores the incoming program; starting a new café asks before clearing progress and preserves settings.

Esc returns from a shift to the campaign. Settings include fullscreen, reduced motion, and separate master/music/effect volumes.

## Campaign and scope

The implementation-ready campaign is **Act I: Query**. It introduces listening, conditional branches, positions and jumps, multiple orders, typed sugar variables, functions with local variables and a heard-order parameter, ambiguity/clarification, numeric sugar counts, refactoring and final certification.

Preparation, serving and cleaning are scripted, as specified. Customers progress through order intake, preparation, delivery, departure and cleaning. Deterministic station/table reservations produce lifecycle timestamps and individual satisfaction. Tables increase from 2 to 10 across the campaign. The campaign, transitions and ending complete the Act I arc. From shift 3, Niko prepares drinks in the enclosed kitchen and a scripted floor robot collects them at the pickup counter. Programming that helper remains a future-act mechanic.

## Graphics

The café is assembled with Godot `TileMapLayer` nodes from the **seven supplied `assets/tiles/tile-B-*.png` sheets**. Floors, kitchen tiles, walls, counters, appliances, tables and decorations use those atlases. Existing `assets/art/characters.png` supplies Niko, Query, customers and the cat. The old `cafe_day.png` painted backdrop is not used. No new world-art images were generated. Labels, controls and debug overlays are interface elements.

The portrait room separates the order till near the entrance, the enclosed kitchen at the top, and the pickup counter between kitchen and dining room. Actors follow continuous routes through the staff doorway and central aisle. Existing audio is retained. The game renders the tile room with nearest-neighbor filtering and pixel snapping.

## Verification

Use the Godot executable directly, with a log path inside this workspace. On this Mac:

```sh
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --log-file "$PWD/.godot/player.log" --script scripts/validation/validate_player.gd
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --log-file "$PWD/.godot/runtime.log" --script scripts/validation/validate_runtime.gd
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --log-file "$PWD/.godot/input.log" --script scripts/validation/validate_interaction.gd
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --log-file "$PWD/.godot/reference.log" --script scripts/validation/validate_act1.gd
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --log-file "$PWD/.godot/presentation.log" --script scripts/validation/validate_presentation.gd
```

Player checks cover all worked solutions, attainable three-star scores, save/reload behavior and the full campaign through the ending. Runtime checks cover actual conditional execution, continuous listening, typed reads, function-local scope, recursion rejection, bounded loops, deterministic timings, drag-group structure and passing-program persistence. Interaction checks send in-engine mouse and keyboard input through the UI. Presentation checks cover movement continuity, kitchen boundaries, pickup handoff and all ten table routes. Tests use temporary saves.

Rendered inspection cases are available through `scripts/smoke/capture_main_screen.gd`: `main`, `menu`, `campaign`, `pass`, `fail`, `help`, `settings`, `ending`, `inspect`, `pickup`, `delivery`, and optional `--small` (1100×720). PNGs are written under `.godot/`. Screenshots use a temporary save.

## Design provenance

The gameplay specification was restored from Git commit `5a31554`; commit `770783a` had removed it. The September 2026 implementation notes in `docs/game_design/implementation.md` record the supplied-art override and the small tuning decisions made during completion.
