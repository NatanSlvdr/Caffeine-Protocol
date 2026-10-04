# Game Design Specification

Design notes from the original 14-shift Act I slice, built first as a Godot
prototype. The game now ships as a React + TypeScript web build with 21 shifts
([ADR 005](../adr/005-21-shifts.md)). Some of these files are kept up to date
and some are historical; [docs/README.md](../README.md) says which.

Shift-by-shift specs (story, lesson, customers, reference programs) are
generated into [../campaign/shifts/](../campaign/shifts/README.md) by
`npm run docs:gen`, and they win over anything written here.

## Kept up to date

- `programming.md` - the routine language, editor, runtime and save migration.
- `orders.md` - heard speech, tokens and tickets.
- `gameplay.md` - the puzzle loop, scoring and which shift brings what.
- `robots.md` - role ownership and what each robot can do.
- `story.md` and `vision.md` - cast, arc, tone and pillars.
- `cutscene_prompts.md` and `portrait_prompts.md` - art prompts for the story.

## Historical

- `implementation.md` - the September 2026 prototype notes.
- `simulation.md` - the first-pass café model and its Godot notes.
- `ui.md` - the prototype's screens.
- `art_direction.md` and `asset_pipeline.md` - the prototype's art rules.
- `pricing.md` - a pricing puzzle that was never built.

## Documentation Rules

- Record new decisions in [`docs/adr/`](../adr/), not in the historical files.
- If a gameplay change touches shifts, robots, orders or story, update the
  files kept up to date in the same task, and rerun `npm run docs:gen`.
