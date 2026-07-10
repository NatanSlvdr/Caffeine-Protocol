# Game Design Specification

This folder is the source of truth for gameplay implementation in Caffeine
Protocol. Gameplay decisions should live here before they are implemented in
Godot.

Act I is the first playable vertical slice. It covers the cafe simulation, the
visual programming interface, and Query, the order-taking robot.

## Current Specification Files

- `vision.md` - design pillars, tone, and scope boundaries.
- `art_direction.md` - custom pixel-art style, asset pipeline, and import rules.
- `story.md` - campaign setup, Act I arc, and future-act hooks.
- `gameplay.md` - player loop and Act I progression.
- `simulation.md` - cafe simulation rules, timing defaults, validation, scoring.
- `programming.md` - visual block editor, runtime, debugging, scoring metrics.
- `robots.md` - robot ownership rules, Query's Act I capabilities, future robots.
- `orders.md` - order phrases, ticket fields, modifiers, ambiguity rules.
- `pricing.md` - future pricing-machine hook and customer total rules.
- `ui.md` - main puzzle screen, debug views, and run controls.
- `levels/` - one implementation-ready spec per Act I level.

## Documentation Rules

- Act I docs should be decision-complete for implementation.
- Tuning numbers are first-pass defaults unless a file says they are locked.
- TODOs are allowed only for non-blocking polish or future acts.
- If a gameplay change touches levels, robots, orders, UI, or story, update the
  relevant docs in the same task.
