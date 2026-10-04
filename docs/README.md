# Documentation map

What each document is for, and which ones describe the game as it ships. The game has 21 shifts in a prologue and four acts ([ADR 005](adr/005-21-shifts.md)). When a document here disagrees with the code or with a generated page, the code and the generated page win.

## Current

- [Campaign shifts](campaign/README.md): the shift table, and a page per shift with its story, lesson, customers and reference programs. Generated from `src/data/` by `npm run docs:gen`; authoritative for anything about a shift. Don't edit by hand.
- [Architecture](ARCHITECTURE.md): how the code is laid out, the simulation and validation pipeline, saves and their migrations, and the offline build.
- [Roadmap](ROADMAP.md): the improvement backlog and its progress log.
- [Decision records](adr/): why the campaign, the Query language, asset sync and the CSS are the way they are. [ADR 001](adr/001-32-shifts.md) is superseded in part by [ADR 005](adr/005-21-shifts.md).
- Game design notes that are kept up to date:
  - [Programming](game_design/programming.md): the routine language, the editor, the runtime and save migration.
  - [Orders](game_design/orders.md): heard speech, tokens and tickets.
  - [Gameplay](game_design/gameplay.md): the puzzle loop, scoring and which shift brings what.
  - [Robots](game_design/robots.md): who owns each role and what every robot can do, through Act IV.
  - [Story](game_design/story.md) and [Vision](game_design/vision.md): the cast, the arc and the tone.
  - [Cutscene prompts](game_design/cutscene_prompts.md) and [Portrait prompts](game_design/portrait_prompts.md): prompts for the story stills and dialogue portraits.

## Historical

Kept for the record. They describe the retired Godot prototype or its original 14-shift Act I slice, and nothing new should be built from them.

- [Implementation notes](game_design/implementation.md): the September 2026 prototype and how it became the web game.
- [Simulation](game_design/simulation.md): the first-pass café model. Its rules still hold in spirit; its timing figures and Godot notes are out of date.
- [User interface](game_design/ui.md): the prototype's screens and Godot scenes.
- [Art direction](game_design/art_direction.md) and [Asset pipeline](game_design/asset_pipeline.md): the prototype's tile sheets and import rules.
- [Pricing](game_design/pricing.md): a pricing puzzle that was planned for a later act and isn't in the game.
- `game_design/levels/`: stray copies of the original 14 level specs. The generated shift pages replace them.
