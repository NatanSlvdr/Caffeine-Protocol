# Caffeine Protocol

## Project Overview

**Caffeine Protocol** is a Godot game about running a cafe staffed only by robots. The player gradually repairs, manages, and programs the robots until the cafe can operate autonomously.

The programming gameplay is intentionally approachable: instructions should be represented as large visual blocks, inspired by **Human Resource Machine** and **Scratch**, rather than by text-heavy code.

## Core Game Pillars

- **Automation through learning:** the campaign introduces each robot and programming concept one step at a time.
- **Manual work as pressure:** scripted human work demonstrates a cafe role before a robot takes ownership; once a robot owns that role, failed robot logic is a puzzle failure instead of being manually recovered.
- **Readable robot logic:** robot behavior should be easy to inspect, debug, and adjust.
- **Cafe operations as puzzles:** each level teaches a new operational problem through the cafe workflow.

## Robots

The cafe has three main robot roles:

- **Order-taking robot:** receives customer orders and is the only robot that understands human language.
- **Preparation robot:** prepares drinks and food once orders are expressed in robot-readable form.
- **Floor robot:** serves orders, brings items to tables, and cleans tables.

## Campaign Structure

The player inherits a cafe and finds broken robots in a scrapyard. The first levels are about repairing and introducing the robots gradually.

Early in the game, scripted human work performs cafe tasks because the robots are not yet operational. Later, that human fallback becomes unavailable for floor service, forcing the player to program the floor robot to replace serving and cleaning work.

The campaign ends when all employees are programmed and the cafe can run autonomously.

## Pricing Mechanic

At the start, the cafe has a pricing machine that automatically totals customer orders after tickets are created.

Later in the story, this pricing machine stops working. From that point, the player must program a way to calculate the total for each customer's tickets and give that total back to the customer.

Because only the order-taking robot understands customer intent, later robots may still relay customer-facing questions back to it. For example, if the floor robot needs to answer a customer question about an order or total, it may need help from the order-taking robot.

## Gameplay Documentation Workflow

All gameplay-related direction lives under `docs/game_design/`. Before making gameplay, campaign, level, robot, feature, or story changes, read the relevant Markdown files there and treat them as the current design source of truth.

When the user asks for gameplay changes that are not already documented, update or add the appropriate design documentation in `docs/game_design/` as part of the task. Gameplay decisions should not exist only in code or conversation; keep the design docs current as the game evolves.

## Initial Technical Direction

- Engine: Godot 4.6.2.
- Game view: 2D top-down.
- Initial repository state: empty structured project, no main scene yet.
- Keep early systems simple and inspectable before adding abstractions.
- Prefer clear Godot-native organization under `scenes/`, `scripts/`, `assets/`, and `docs/`.

## Godot Command-Line Testing

When running Godot from the command line for validation or smoke tests, use the app's internal executable directly:

`/Applications/Godot.app/Contents/MacOS/Godot`

Do not use `open -a Godot` and do not pass `--editor` for automated checks, because that can collide with an already-open editor instance. Always pass an explicit `--log-file` inside the workspace; letting Godot use the default `user://logs/...` path has crashed during headless runs.

Recommended validation command:

```bash
/Applications/Godot.app/Contents/MacOS/Godot \
  --headless \
  --log-file "/Users/natan/Documents/Caffeine Protocol/.godot/codex-headless.log" \
  --path "/Users/natan/Documents/Caffeine Protocol" \
  -s res://scripts/validation/validate_act1.gd
```

Recommended short player smoke test:

```bash
/Applications/Godot.app/Contents/MacOS/Godot \
  --log-file "/Users/natan/Documents/Caffeine Protocol/.godot/codex-player.log" \
  --path "/Users/natan/Documents/Caffeine Protocol" \
  --quit-after 30
```
