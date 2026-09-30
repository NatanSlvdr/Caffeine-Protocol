# Robots

## Ownership Rule

Each cafe role has exactly one owner during validation. Before a robot is
introduced, scripted human work can own the role. After a robot is introduced,
that robot owns the role and there is no human fallback for failed robot logic.

Act I ownership:

- Order intake: scripted human in Level 1, Query from Level 2 onward.
- Drink preparation: scripted human/system for all Act I levels.
- Serving: Niko in Level 1; a scripted floor helper from Level 2 onward.
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

## Act IV: The Whole Crew

From shift 17 nobody covers for the robots, and each shift adds one odd rule
that the Act III programs can't handle. Rules only ever add work: handling a
rule that isn't active is harmless, so programs carry forward.

- **To Go (17).** Take-away customers say "to go". Query writes To go on the
  ticket. Brew takes a lid at the lids, after the sugar. Porter leaves the cup
  on the to-go shelf by the door (Deposit down) instead of a table, and there's
  no cup to clear: take-away goes in paper cups.
- **Four Cups (18).** Taking beans or leaves uses one of four café cups. Porter
  drops used cups in the sink, and Use at the sink washes them. With no clean
  cup left, Brew waits at the sink for the next used one, so a Porter that
  never clears stalls the kitchen.
- **In a Hurry (19).** Query writes Rush for customers in a rush. Rush tickets
  jump the queue at the handoff and at pickup. A robot holding a rush order
  can't wait for more work, so the batching learned in Acts II and III has to
  make an exception.
- **Last Orders (20).** After the last guest, Wait for Orders reports Closed
  instead of waiting. Every robot must finish what it holds and Stop; a robot
  that waits again, or acts as if more work were coming, fails. Query hears the
  closing call too.
- **Espresso Yourself (21).** All four rules, with groups and "the usual".

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
