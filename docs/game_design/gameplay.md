# Gameplay

## Core Puzzle Loop

1. The player selects a shift on the campaign screen; a short transition opens the level. The level loads with a cafe scenario and Query's current saved program.
2. The player edits visual blocks in the code editor on the right side of the
   screen.
3. The player runs a deterministic validation simulation.
4. The cafe view on the left shows customers, tickets, and Query's execution.
5. If a seed fails, the run stops on the first failing case and highlights the
   relevant block or cafe event.
6. The player revises the program and reruns validation.
7. Completion requires every required validation seed to pass.

## Manual Work Model

The player never directly moves Niko around the cafe in Act I. Manual work is
represented by scripted human behavior before a robot has taken ownership of a
role.

- Shift 1 uses scripted human work in every role, to teach the workflow and
  show the bottleneck.
- Query owns order intake from shift 2, Brew the kitchen from shift 9 and
  Porter the dining room from shift 14. Until then Moka and Pip do those jobs
  automatically.
- If a robot fails its role, the shift fails. Nobody recovers the failed order
  during validation.

## Automation Progression

The campaign has 21 shifts. Each shift's lesson, customers and reference
programs are on its generated page in [docs/campaign/](../campaign/README.md);
the shift numbers below come from `src/domain/unlocks.ts`.

| Shift | Robot     | New programming focus                                   |
| ----- | --------- | ------------------------------------------------------- |
| 1     | None      | Observe the whole café workflow.                        |
| 2     | Query     | Wait for Orders, paper, Write coffee, Move and Deposit. |
| 3     | Query     | Jump destination and Jump, for a queue of customers.    |
| 4     | Query     | If and Else on what the customer said; tea.             |
| 5     | Query     | Sugar and “without” in speech; Write sugar.             |
| 6     | Query     | For item in order, for several drinks at once.          |
| 7     | Query     | Numbers in speech; Store and Write a variable's sugar.  |
| 8     | Query     | Unclear orders and Help.                                |
| 9     | Brew      | The coffee recipe in the kitchen.                       |
| 10    | Brew      | Tea: branch on the ticket.                              |
| 11    | Brew      | Sugar cubes counted from the order.                     |
| 12    | Brew      | Functions, for the recipe.                              |
| 13    | Brew      | Two cups at once.                                       |
| 14    | Porter    | Carrying drinks to tables.                              |
| 15    | Porter    | Clearing used cups.                                     |
| 16    | Porter    | A tray of two.                                          |
| 17    | All three | Drinks to go.                                           |
| 18    | All three | Only four café cups, so Brew washes up.                 |
| 19    | All three | Customers in a rush jump the queue.                     |
| 20    | All three | Closing time: every robot has to Stop.                  |
| 21    | All three | Everything at once.                                     |

Shift 1 shows the same workspace with a locked Automatic service block.
Watching the whole service is enough to go on; ticket inspection is optional.

## Completion And Replay

Correctness is mandatory. A programming level is complete only when every
required validation seed passes with no wrong delivered orders and no Query role
failure.

Replay scoring uses stars plus metrics:

- 1 star: all required seeds pass.
- 2 stars: all required seeds pass and program size is at or below the level's
  target block count.
- 3 stars: all required seeds pass, program size target is met, and executed
  instruction count target is met.

Shifts 15 to 21 also carry optional challenges, which earn no stars and come
to light on the receipt once the shift has been served. Each weighs the service
from one side: the tiles Porter walks, the longest any guest waits, the longest
a rush order waits, or how long the longest round runs until the crew has
stopped. They pull against the step target as often as with it (Brew claiming
two tickets at once runs fewer steps and serves later), so none of them names
one best routine. Each challenge's target is met by a routine in which Porter
waits by the table to clear it, and missed by the worked example
(`tests/unit/data/challenges.test.ts`). A challenge once met stays met in the
save, and the first one puts a stopwatch on the shelf.

Under the keepsakes, the shelf keeps the café's looks: the chair cushions and
the print by the window, three of each. Lou's are there from the start; serving
each of the first three acts brings a new one, as its keepsake goes up, and
finishing the campaign brings the last. A look is picked, not bought or placed,
and nothing it changes is scored, so it marks progress without becoming a game
of its own. The café shows only looks it has earned, and a memory shows Lou's
café as it was.

Away from the rail, the campaign's Drills take one idea at a time: a gap in a
served shift's worked example, and two or three passages to fill it with. The
pick goes in, and the café serves that shift with it, so what comes back is the
café's own verdict, its first failure reason or the idea in a sentence. A drill
opens once its shift is served, so it never gives an unplayed shift away. Each
act has at least one, and `tests/unit/data/drills.test.ts` serves every passage:
the worked example's alone serves the shift. When a run fails the way a served
drill's idea is missed (paper not taken up first, a lid on a drink staying in),
Help's clue names that drill.

The other kind of drill pauses a moment from a served shift: one guest, one
robot, and the block it has just run. The player sees what the guest said,
what the robot holds and remembers, and its whole routine with that block
marked, then calls which of three lettered blocks runs next. The letters sit
beside their blocks in the routine, so two alike can't be confused. The call is
made once: the café then marks the block that really ran next, with why
(“Return goes back to the block after the call”). The answer is never authored.
`momentOf` in `src/data/predictions.ts` serves the shift with its worked example
and reads the block after the pause from the trace, and
`tests/unit/data/predictions.test.ts` checks that it is still one of the
choices. Ten moments cover all four acts: both sides of an If, a For going round
again, a loop run zero times, and where Return comes back to.

The third kind is a limited kit: a gap in a worked example and a handful of
blocks to build its passage from, each once and End included, that leave out the
block the example leans on. Two Ifs stand in for an Else, a sugar written later
replaces the one before, a Jump at the end of an If skips what an Else would
have, and a function is written out where it was called. The rule (“No Else”,
“No Call”) and the number of blocks show before anything is placed, the last
block can be taken back, and serving the build runs the shift with it.
`tests/unit/data/kits.test.ts` checks each kit can't build the worked example,
can build a passage the café serves, and isn't served by its blocks in tray
order.

A drill got right on the first pick, or a kit once served, is ticked as done.
The ticks are kept in the save (`drills`, a list of ids, left out of a café with
none) and never count toward stars. Anything else can be tried as often as it
helps.

Flights gather the drills on one idea from across the acts: where a block goes,
which way a check sends a robot, listening closely, going round again, out to a
function and back, wherever-whenever on the floor, and the kits' other ways to
write it. A flight opens with its
first drill's shift, plays its open drills one after another from the first not
yet ticked, and counts its own ticks; one still partly shut says which shift
opens the rest. A flight is only a list of drill ids (`src/data/flights.ts`), so
its progress is the drills' ticks and nothing new is stored.

The repair bay is a logic puzzle on a robot's wiring, away from any routine. A
bench lists a handful of the robot's sensors (the conditions its routines
already ask about: "hears tea", "holds a clean cup", "sees a drink at the
pickup") and its actions, and each action is wired to up to two sensors, each
read as it is or the other way round. An action goes off when every sensor
wired to it reads as set, and one wired to nothing never does: the If on two
conditions, without the routine around it (`src/domain/repair.ts`). Beside the
board are the worked cases, what the robot meets and what it should then do,
each showing what the wiring does now and whether that is right; the bench is
mended when every case is. The scrapyard's wiring gets some cases right and
never all, and `tests/unit/data/repairs.test.ts` checks every bench comes
broken, has a wiring that mends it, asks for every action somewhere and has no
two cases that read alike. Only the mended robots are kept (`repairs`, a list
of ids); a half-wired board is not.

The test bench lets the player write guests of their own for a shift and run
the routines on them. A bench is written the way the shift's guests order: the
drink, how sugar is asked for, to go, in a rush, a second drink, a mumble first,
and how many seconds after the guest before each one comes in. It only offers
what the shift's own guests ask for, so nothing untaught can be written, and
never asks what a guest should get: `benchSeed` in `src/domain/bench.ts` works
that out the way the shift's guests who asked alike get it, so a guest can't be
told to want the wrong thing. A bench starts as a copy of one of the shift's
rounds, takes up to 16 guests, and is kept per shift beside the save. It runs
as one more round of the shift for no stars, with the failure card, replay and
compare of any practice run; a passing bench says so beside the code and nothing else.
`tests/unit/simulation/bench.test.ts` writes every round of every shift as a
bench and checks it is heard and expected as the shift's own.

Once the campaign is finished, the regulars ask for specials: optional shifts
past the last, each with one new rule, a brief setup and the regular's thanks
on the receipt. The first is Rosa's reading group (Bound Together,
`src/data/specials.ts`): every third guest is a table of two who order
together, and a table that does gets all its drinks within 4 seconds of the
first. The window is in the objective and Niko's briefing before the run, and
the simulation's own timestamps judge it. Query writes Together on each ticket
of such a table, and Porter, holding one, uses Wait for Orders to bring the rest
of the table's order next, so both cups go out on one tray and one visit. A
table served apart fails with where its late drink still is (being made, at
pickup, on the tray), and the receipt counts the tables served together and how
close their drinks came. A special opens on the routines Shift 21 was served
with, and the way in from them is two blocks: its block target is theirs plus
those two, and its step target a tenth over theirs, as on the campaign's shifts.
Its stars and routines are its own and never count toward the campaign's.
`tests/unit/simulation/together.test.ts` serves the reference, the way in, and
the routines that fall short (no mark, a mark but no wait, two at once without
the check).

Dot's knitting circle (While It's Hot) is the one special with a serving
window: a drink keeps warm 20 seconds (`FRESH_SECONDS`) from the moment Brew
sets it down at pickup to the moment it reaches its guest, and no shift of the
campaign has the rule. Ten guests come three seconds apart, each with one
drink and the sugar Dot's friends count. Shift 21's Porter waits at pickup for
each guest's used cup before it takes the next drink out, so that drink cools
on the counter; serving the next drink before clearing the cup before it keeps
every drink inside the window, with the same work in another order. A drink
past its window fails with where the time went: at pickup while Porter
cleared cups or before it came, sitting at pickup so long it cooled on the way,
or on the tray while Porter waited for another drink. Paused, Porter's inspector lists each drink keeping warm, where
it is and how many seconds it has left, coldest first. The window is measured
on the live service the player watches; the café preview's dry round paces
Query faster and leaves it out. `tests/unit/simulation/fresh.test.ts` serves
the reference and the way in for every star, and turns away Shift 21's
routines, a Porter that waits at the table, and one that batches two drinks.

Juno's morning without a delivery (The Last of the Tea) is the one special
where a drink runs out. The tin holds three cups' worth (`TEA_LEFT`), and every
tea asked for after them is heard with the `soldout` token. Query can't write
down a drink that isn't there: `IF soldout IN CUSTOMER SPEECH` then `HELP` asks
what the guest would like instead, and the answer replaces what was heard, as
with a mumble. Some have a coffee with the same sugar; some come back for one
tomorrow and get no ticket at all, which is right. Twelve guests come five
seconds apart, and one mumbles, so asking only about what's sold out guesses at
that guest. Shift 21's routines write down the tea and fail as sold out; adding
one OR to the condition that already asks about mumbles serves every star. A
bench on the special asks of each tea or coffee whether it is in, or sold out
with the guest having the other drink or going without, and works out the
clarification and the ticket from that. `tests/unit/simulation/sold-out.test.ts`
serves the reference and the way in, and turns away Shift 21's routines and a
Query that asks only about what's sold out.

Mr. Albert's morning with the grinder out (The Engineer's Visit) is the one
special where a machine goes away for a while. Henri services the grinder from
1:30 to 4:30 (`GRINDER_OUT`, the service's `grinderOut`), and any coffee Brew
takes up from storage in between comes pre-ground: Brew holds "Pre-ground
coffee", and hears the `preground` token while it does. Grinding it fails as
`grinder-serviced`, so Brew checks `IF coffee IN CUSTOMER SPEECH AND preground
NOT IN CUSTOMER SPEECH` before the grinder, and takes pre-ground coffee
straight up to the sink, as it does tea. The token belongs to the cup Brew
holds, not the clock: beans taken up just before the visit are still ground,
so no routine loses a race against the timetable. Only Brew hears it; Query
and Porter never do. Fourteen guests come four seconds apart, two coffees in
three, and every round has coffee taken up both during the visit and outside
it. Shift 21's routines grind pre-ground coffee and fail; that one AND serves
every star. `tests/unit/simulation/grinder.test.ts` serves the reference and
the way in, and turns away Shift 21's routines and a Brew that never grinds.

Rosa's dishwasher (One Socket) is the one special where two machines share
something. The reading group's dishwasher is plugged into the coffee machine's
socket, with four cups in the café. Brew's Use up at the sink, with used cups
waiting there, starts a wash of all of them that runs 20 seconds by itself
(`WASH_SECONDS`, the service's `dishwasher`), and the wash start goes in Brew's
record. Using the coffee machine (grinding, brewing or steeping) before it is
done trips the fuse as `fuse-tripped`, which names the wash that had the power,
its cups and its times. Brew waits rather than fails where waiting is right: a
second wash waits for the first, and a cup taken from the shelf waits for the
clean ones still inside. Paused, Brew's inspector says who has the **Socket**:
the dishwasher, with its cups and seconds left, the coffee machine, or neither.
Twelve guests come five seconds apart, two coffees in three. Shift 21's Brew
washes after setting a drink down at pickup, and is back at the machine with
the next drink mid-wash; moving that one Use up to just after the brew, with
the sugar, the lid and pickup still ahead, serves every star.
`tests/unit/simulation/dishwasher.test.ts` serves the reference and the way in,
headless and live, and turns away Shift 21's routines and a Brew that never
washes.

A special can also be a menu to plan. Mr. Albert's Saturday Market puts three
cards side by side on the specials board before any is served, each a special
of its own with its own save entry and stars: what is on the board, who comes
and how fast, the rule it brings, and its targets. The Tea Table is tea only,
twelve guests and a pot for two now and then, with four cups in the whole café.
The Espresso Bar is coffee only, fourteen guests three seconds apart and every
other one in a rush. The Market Hatch is both drinks, ten guests, two in three
to go, and the closing call. Every card's guests are written as a bench would
write them (`benchSeed`, so each is expected exactly as the campaign's guests
who asked alike), and Shift 21's routines serve every card. The targets sit
between those routines and the card's own reference, built from
`queryReference` and the robots' sources with only the card's rules: carrying
the campaign's way of working in passes, and cutting the routine down to what
the card brings earns the stars. There is no pricing, stock or money; the plan
is the choice of workload. `tests/unit/simulation/menu.test.ts` serves each
card's reference for every star and Shift 21's routines for fewer.

The Long Day (`src/data/longDay.ts`) is an endurance service on the specials
board, asked for by Juno: exam week, the library shut, her whole year revising
at the café from eight to six. It is six waves, each one round of guests coming
in faster than the last, and each asks for everything the waves before it did
and one thing more: two drinks for one guest; then to go; a rush with only four
cups; mumbled orders; tables ordering together; the closing call. One set of
routines serves the whole day. They can be changed between waves, and after any
wave the receipt offers **Next wave** or **Stop for now**; a stopped day
carries on from its next wave, from the board, even after the tab is closed.
The waves are authored and fixed, so a wave played again is the same wave.
Every wave keeps its own stars, and the board shows the furthest wave ever
served. Shift 21's routines serve the morning and are caught out at four
o'clock, by the first table that orders together. The targets sit a little
over the day's reference: 124 blocks every wave, and about a tenth more steps
than it runs on each. `tests/unit/simulation/long-day.test.ts` checks that the
demands build up, that the reference serves every wave for every star, and
where Shift 21's routines stop.

Memories are optional shifts from Lou's café, before Niko's time
(`src/data/memories.ts`; see the story doc). Each plays with an earlier shift's
toolkit and opens on a routine of its own, so the puzzle is someone else's code.
In _Day One_, after Act I, it is Lou's: every step written twice, once for tea
and once for coffee, with the two copies drifted apart. Mending the broken copy
passes; only writing the shared steps once fits the block target.
`tests/unit/simulation/memories.test.ts` plays the reference, Lou's routine,
and the copy mended in place.

Scoring metrics shown after a run:

- Seeds passed.
- Average customer satisfaction.
- Program block count.
- Executed instruction count.
- First failure reason, when applicable.
