# Shift audit

Kept by hand, unlike the generated [README](README.md) and [shift pages](shifts/README.md). This file records why each
shift exists: the one idea it adds, what it builds on, where players are likely to slip, and the routines that can
serve it. Update it whenever a shift's lesson, starter or rules change.

**Checked by** `tests/unit/data/shift-purpose.test.ts`. Every shift from L03 to L20 rejects the routines a player
carries in from the shift before, and the first failure is the one its lesson is about (the "First trips on" line
below). The finale is the one exception: it accepts the Last Orders routines, because it asks for every rule at once
rather than a new one.

Where a shift lists more than one routine, the reference comes first. The others are plausible ways in that C03
checks against every seed.

## Prologue

### L01 Brew Beginnings (watch)

- **New idea.** An order makes one trip: register, kitchen, table. The ticket is the only thing that travels with it.
- **Builds on.** Nothing.
- **Likely slip.** Thinking the kitchen hears the guest. The watch-only goal asks which job Query could take over, and
  points at the hand-written ticket.
- **Routines.** None: a demo service runs.
- **Why it exists.** It shows the whole loop before the player owns any part of it, so Act I's ticket has a reason.

## Act I: Query

### L02 Hello, World Roast

- **New idea.** A routine runs top to bottom, one block at a time.
- **Builds on.** L01's trip.
- **Likely slip.** Writing before taking up paper. Or stopping at the handoff and never walking back, which is
  harmless here but is the first thing L03 needs.
- **Routines.** One shape: Wait, Take up, Write, Move, Deposit, Move back (6 blocks).
- **Why it exists.** The first program, and the handoff that every later robot depends on.

### L03 Groundhog Latte

- **New idea.** Repetition: a Jump back to a destination above Wait for Orders.
- **Builds on.** L02's routine, unchanged.
- **First trips on.** `stopped-listening`.
- **Likely slip.** Putting the destination below Wait for Orders, so Query keeps writing tickets nobody ordered. Or
  jumping before walking back to the register.
- **Routines.** Destination above Wait for Orders, Jump at the end.
- **Why it exists.** Every later routine is a loop; this is the only shift where the loop is the whole lesson.

### L04 Coffee or Tea?

- **New idea.** A choice: If and Else, testing the guest's words.
- **Builds on.** L03's loop.
- **First trips on.** `ticket-item`.
- **Likely slip.** An If with no Else, so a tea order writes Tea and then Coffee as well. Or Write placed after the If
  instead of inside both branches.
- **Routines.** Test for tea (the reference) or for coffee; both are a single If/Else.
- **Why it exists.** Conditions are the backbone of every later lesson.

### L05 Sugar, No Sugar

- **New idea.** Nested conditions. Words are matched rather than understood, so "without sugar" still contains
  "sugar".
- **Builds on.** L04's If/Else.
- **First trips on.** `ticket-sugar`.
- **Likely slip.** One If on Sugar, which sweetens the "without" orders. Or testing Negation outside the sugar If.
- **Routines.** Negation tested inside the sugar If (the reference), or Negation tested first with the sugar check
  inside its Else.
- **Why it exists.** It is the first time a condition looks right and is wrong, which is what the run report and Help
  are for.

### L06 For Each Their Own

- **New idea.** A loop over a list: For item in order, with `item` standing for one drink.
- **Builds on.** L05's checks, which move inside the loop.
- **First trips on.** `ticket-count`.
- **Likely slip.** Keeping the checks on the whole speech. A coffee-and-tea group then gets two teas, because the
  speech mentions tea for both. Also taking paper once outside the loop.
- **Routines.** Every check reads `item`, with a fresh sheet and a return trip on every pass.
- **Why it exists.** The difference between "what the guest said" and "this drink" returns as the ticket in every later
  act.

### L07 One Lump or Two?

- **New idea.** A variable: Store a number, then Write it.
- **Builds on.** L06's per-item checks.
- **First trips on.** `ticket-sugar` again, but now for an exact count: "zero sugars" mentions sugar without a
  negation, so the old routine writes one.
- **Likely slip.** Putting the number check after the sugar check, so counted orders fall into the yes/no branch.
- **Routines.** Number first, with the sugar/negation checks in its Else (the reference). A ladder of If
  Number = 1, 2… is longer and only covers the counts it lists.
- **Why it exists.** Var A comes back for Brew's sugar (L11) and Porter's table (L14).

### L08 The Usual Suspect

- **New idea.** Don't act on what you can't read. Help comes before anything is written.
- **Builds on.** L07's full order routine.
- **First trips on.** `unclear-order`.
- **Likely slip.** Asking for Help inside the For loop or after taking paper, or guessing a coffee.
- **Routines.** If Ambiguous with Help right after Wait for Orders, before the For.
- **Why it exists.** It closes Act I with a judgement call, not one more data rule, and gives Query its finished form:
  the Query routine Acts II–IV build on.

## Act II: Brew

### L09 A Brew-tiful Friendship

- **New idea.** A second robot with its own routine, and a recipe as a strict sequence of stations.
- **Builds on.** Query's tickets, Move, Take up and Use up.
- **First trips on.** `recipe-order`: Brew's starter leaves out the grinding step.
- **Likely slip.** Treating the steps as interchangeable, for example water before the grinder.
- **Routines.** One shape. Brew's route is fixed by the stations.
- **Why it exists.** It hands the kitchen from Moka to the player. C02 makes that handover show what Moka used to do.

### L10 Steep Thoughts

- **New idea.** The same choice Query makes, now read from the ticket: Brew can't hear the guest.
- **Builds on.** L04's If/Else and L09's recipe.
- **First trips on.** `recipe-order`: tea leaves meet the grinder.
- **Likely slip.** Thinking Brew can test the guest's words. Or duplicating the whole recipe in both branches, which
  works but costs blocks.
- **Routines.** Branch only around the grinder (the reference), or one full recipe per drink.
- **Why it exists.** It moves the idea of data from speech to paper, the link between the robots.

### L11 A Spoonful of Sugar

- **New idea.** A loop that counts: For Var A times, where zero means not at all.
- **Builds on.** L07's variable and L06's loop.
- **First trips on.** `sugar-count`.
- **Likely slip.** One Take up for any sugar, or forgetting that zero cubes is a valid count.
- **Routines.** Store, then a counted For (the reference). A ladder of Ifs per count is longer and brittle.
- **Why it exists.** It is the second kind of loop, and the reason Store reads a ticket as well as a guest.

### L12 Call Me Maybe

- **New idea.** A function: a recipe with a name, written once and called.
- **Builds on.** L11's full recipe.
- **First trips on.** `recipe-not-function`. The service is the same as L11's, so the lesson is enforced directly.
- **Likely slip.** Expecting the routine to get shorter. With one cup it gets longer, by the Function, Call and Return
  blocks. Also letting the main loop run into the function's body.
- **Routines.** The recipe inside Function recipe, called once per ticket.
- **Why it exists.** L13 needs the recipe twice per trip, and Porter's deliver and clear arrive as functions. Its goal
  now says so rather than claiming the routine already repeats itself.

### L13 Double Trouble

- **New idea.** Batching: gather two tickets first, then make both, in the order they came.
- **Builds on.** L12's Call.
- **First trips on.** `carry-more`.
- **Likely slip.** Claiming one ticket per trip, or claiming two and calling the recipe once.
- **Routines.** Two Waits, then two Calls.
- **Why it exists.** Brew's classic capacity case. Moka retires here, so Brew runs the kitchen alone.

## Act III: Porter

### L14 Special Delivery

- **New idea.** Movement driven by data: Store the ticket's table, then Move to Var A.
- **Builds on.** L07's variables and L12's functions (deliver).
- **First trips on.** `unset-variable`: Porter's starter leaves out the Store.
- **Likely slip.** Fixed moves to one table. Or storing the table before claiming the drink it belongs to.
- **Routines.** Store, Move to Var A, Deposit up, Move back to the home position kept in Var B.
- **Why it exists.** It hands the room from Pip to the player. C02 makes that handover show what Pip used to do.

### L15 Cups and Robbers

- **New idea.** A second kind of job, with its own Wait.
- **Builds on.** L14's delivery.
- **First trips on.** `table-not-cleared`.
- **Likely slip.** Clearing at delivery time instead of waiting for the guest to finish, or leaving the cup on the
  counter instead of in the sink.
- **Routines.** Deliver, then clear in the same loop (the reference), each as its own function.
- **Why it exists.** Porter becomes the only robot with two queues. Act IV's to-go and cups rules hinge on that.

### L16 Tea for Two

- **New idea.** Brew's batching, on the floor. It deliberately echoes L13: each robot meets its own capacity case.
  What's new is that each drink on the tray keeps its own table.
- **Builds on.** L13's batching and L14–L15's functions.
- **First trips on.** `carry-more`.
- **Likely slip.** Reading one table for both drinks, or serving them in reverse order.
- **Routines.** Two Waits and Take downs, two delivers, two clears.
- **Why it exists.** Pip's goodbye, and Porter's tray at full size before Act IV. Its concept line now names the echo
  instead of teaching batching as if it were new.

## Act IV: the whole crew

These shifts start from the previous shift's routines. Each adds one café rule that the Act III routines can't handle,
and rules only add work, so code for a rule that isn't active stays harmless.

### L17 To Go

- **New idea.** One mark on a ticket changes all three jobs.
- **Builds on.** L06's item checks, L10's ticket reading, L15's floor jobs.
- **First trips on.** `ticket-to-go-missing` (Query). Brew's lid and Porter's shelf come next.
- **Likely slip.** Fixing Query only. Lidding every drink. Walking a take-away drink to a table.
- **Routines.** A mark, a lid and a shelf, each behind its own If. Batched routines still work.
- **Why it exists.** The first shift where one robot's routine is only right if the other two do their part.

### L18 Four Cups

- **New idea.** A shared, finite supply that goes round in a loop of its own.
- **Builds on.** L15's clearing, which already returns the cups.
- **First trips on.** `no-clean-cups`.
- **Likely slip.** Waiting at storage for a cup that has to be washed first. Or changing Porter, whose clearing
  already brings the cups back.
- **Routines.** Brew washes at the sink after each drink (the reference), or before taking the next cup.
- **Why it exists.** Resource contention between robots. **Known weak spot:** the fix is Brew's alone, because Porter's
  clearing from L15 already feeds the sink. That is kept for now: F06 is the place for richer contention.

### L19 In a Hurry

- **New idea.** Priority: some work can't wait, and nothing new is picked up while it's in hand.
- **Builds on.** L13/L16's batching, which now has to make room.
- **First trips on.** `ticket-rush-missing` (Query). Brew and Porter batching around a rush order fail next.
- **Likely slip.** Marking Rush without changing how Brew and Porter claim work.
- **Routines.** Make and serve one at a time (the reference), or keep batching but break out of the batch on Rush.
- **Why it exists.** It turns batching from a pure optimisation into a trade-off.

### L20 Last Orders

- **New idea.** Termination: every routine needs an ending.
- **Builds on.** Every loop since L03.
- **First trips on.** `closing-ticket` (Query). Robots that keep waiting fail next.
- **Likely slip.** Stopping Query only. Stopping with a drink still in hand. A half-full batch at closing.
- **Routines.** If Closed, then Stop after each Wait, finishing what's already claimed.
- **Why it exists.** A routine that never ends was the right answer for every shift since L03; here it stops being one.

### L21 Espresso Yourself

- **New idea.** None: every rule at once, with groups and unclear orders back in the queue.
- **Builds on.** Everything.
- **Passes with.** The Last Orders routines, by design (ADR 005). L20's service doesn't run to-go, rush or the cup
  limit, so routines that dropped one of those rules fail here.
- **Likely slip.** Fixing several robots at once. The concept line says to fix one robot at a time.
- **Why it exists.** The integration test and the story's ending.

## Findings

- **No repeats.** Every shift from L03 to L20 turns away its predecessor's routines and trips on its own lesson,
  checked as above. No shift needs merging or adding.
- **Echoes.** L10 (If, now on paper), L11 (a loop, now counted) and L16 (batching, now on the floor) each reuse an
  earlier idea for a new robot or data source. L10 already said so. L16's concept line now does too.
- **L12's goal** claimed Brew's routine "repeats the same recipe steps for every ticket". That isn't true of the
  routine a player brings in, which has one copy. It now names the real reason: Brew will soon need the recipe more
  than once per trip.
- **For C02.** Brew and Porter start from a starter missing one step, without seeing what Moka and Pip did.
- **For C03/C04.** Act IV's references make one drink at a time, but carried-in routines are batched. Targets and
  seeds have to hold for both, and for the alternatives listed above.
