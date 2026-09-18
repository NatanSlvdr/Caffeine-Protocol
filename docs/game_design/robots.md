# Robots

## Ownership Rule

Each cafe role has exactly one owner during validation. Before a robot is
introduced, scripted human work can own the role. After a robot is introduced,
that robot owns the role and there is no human fallback for failed robot logic.

Act I ownership:

- Order intake: scripted human in Levels 1-2, Query from Level 3 onward.
- Drink preparation: scripted human/system for all Act I levels.
- Serving: Niko in Levels 1–2; a scripted floor helper from Level 3 onward.
- Cleaning: scripted human/system for all Act I levels.

The floor helper reuses the supplied robot sprite. Niko deposits drinks inside the pickup counter and the helper collects them outside. This visual role separation does not add floor-robot programming, charging or route-planning puzzles to Act I.

## Query

Query is the order-taking robot. Query can hear customer speech, inspect the
recognized tokens of the current customer event, and create structured tickets.
FUNCTION/CALL/RETURN are not part of Query's Act I vocabulary; functions belong
to Brew's kitchen and Porter's floor routines.

Act I capabilities:

- receive `customer_spoke` events;
- read source phrase text for display/debug;
- inspect recognized tokens such as drink, sugar, count, and confidence;
- create coffee and tea tickets;
- attach sugar modifiers;
- store binary and numeric sugar values;
- report runtime errors;
- ask for help when speech confidence is ambiguous.

Act I limits:

- Query may move locally around the counter for animation and flavor.
- Query has no FUNCTION/CALL/RETURN in Act I.
- Query does not prepare drinks.
- Query does not serve tables.
- Query does not clean.
- Query has no battery, charging, carrying, or route-planning mechanics in Act I.

## Program Persistence

Query's program persists between levels. Each level starts from the previous
level's saved solution unless the level file specifies a training template.

The level spec should define:

- expected incoming knowledge;
- newly unlocked blocks;
- starter or prefilled blocks;
- what the player must add or refactor;
- any old behavior that must continue passing.

## Future Robot Notes

Preparation robot:

- Act II hook only in the current docs.
- It will likely introduce carrying constraints for prepared items and planning
  around station availability.

Floor robot:

- Future programmable role for serving, cleaning, and table navigation; its Act I presentation is scripted.
- Charging mechanics should belong to the floor robot because it cannot remain
  plugged in while moving through the cafe.
- Carrying constraints and route planning should become important here.
- `Run` is a future movement mechanic that lets a robot move faster only under
  safe conditions.

Customer-facing relay:

- Future mechanic, not Act I scope.
- Because only Query understands customer intent, the floor robot may later
  relay customer-facing questions or total requests to Query for interpretation.

## Godot Implementation Notes

Recommended structure:

- `RobotActor.tscn`: shared visual actor base for robots.
- `QueryRobot.tscn`: counter robot with local counter movement and speech event
  binding.
- `RobotController.gd`: connects robot actor, program runtime, and simulation
  events.
- `RobotProgramSave.gd`: serialized persistent program per robot.

Query should be implemented as a real actor even though its Act I movement is
mostly local. This keeps later robot animation and positioning consistent
without adding Act I route-planning complexity.
