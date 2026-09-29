# Story

## Campaign Setup

Niko inherits his Aunt Lou's small, modern, cozy café, closed for a while and
full of half-working equipment, old service manuals, and a quiet repair bay in
the back room with three empty charging docks. Lou has retired to the seaside.
The café can still open, but only because Niko can patch together temporary
scripted routines and salvaged machines.

He doesn't start alone. Moka, Lou's friend who ran the espresso machine beside
her for forty years, lives across the street and walks in on his first night.
Pip, a kid who lives in the flat upstairs, wants to help: he is saving his
pocket money (for something new every week) and spent last summer helping at
his mum's restaurant.

The early cafe runs prove that doing everything by hand does not scale. Niko
starts repairing robots from a nearby scrapyard so the cafe can become stable
without constant human intervention.

## Act I: Query, The Order-Taking Robot

Query is the first robot Niko repairs. Query can hear customers clearly, but it
needs programming before it can translate human requests into the structured
tickets used by the rest of the cafe.

Act I teaches Query through increasingly demanding order-intake puzzles:

- listen for a customer;
- create a ticket;
- distinguish menu items;
- wait for repeated arrivals;
- create multiple tickets from one customer speech event;
- preserve modifiers;
- share ticket logic across varied customer language;
- ask for help on ambiguous speech;
- handle sugar counts;
- pass larger randomized validation batches.

By the end of Act I, Query can operate the counter without Niko intervening.
The next bottleneck becomes drink preparation, setting up the preparation robot
for Act II.

## Pricing Machine

The cafe has an old pricing machine near the counter. During Act I it is world
context, not an implementation requirement: it explains why totals can be
handled automatically while the player is focused on teaching Query order
intake.

TODO future act: the pricing machine stops working later, forcing the player to
program how totals are calculated from tickets and how Query gives the total
back to customers.

## Dialogue

Story is told in visual-novel dialogue: a portrait beside a speech box, one
line at a time. Lines type out (instantly under reduced motion), click, Enter or
Space advances, and Escape or Skip ends the scene.

- **Shift intros** play in the café every time a shift opens, so replaying a
  shift always starts the same way. Skip gets straight to the code, and Help →
  "Replay the intro" plays it again. The old between-level interludes are folded
  into these intros.
- **Reactions** replace the failure panel. When a run fails, the guest who got
  the wrong order, or the robot that got stuck, reacts first, then Niko names
  the problem and gives a hint while the failing block stays highlighted. A
  finished service gets a cheer from the robot before the receipt.
- **Cutscenes** move the story on between shifts (see below). The last one,
  _Closing Time_, plays before the final receipt.

Writing the scripts (`src/data/campaign/dialogue.ts`):

- Robots talk in short, clipped sentences and are shown in uppercase machine
  type. `*bip boop*` marks a sound effect, set in italics.
- `[LISTEN|Wait for Orders]` shows a command as its shop block (colour and icon
  from the command, text after the bar). Use it when a command is introduced,
  not in every line.
- A customer's name reads "Customer: Juno", with "Customer:" in a lighter
  weight ("Customer" alone for a plain guest), so guests never pass for the crew.
- The crew (Niko, Moka, Pip) may speak to the player; customers and robots
  never do. A new command gets a short scene: someone notices the problem, Niko
  tinkers with the robot, then shows the player the new block and what it does,
  never where it goes.

Scripts live in `src/data/campaign/dialogue.ts` (intros),
`src/data/campaign/cutscenes.ts` (cutscenes) and
`src/features/workspace/reactions.ts` (failure and success lines). The tone is
cozy only: no villains, no stakes beyond a busy morning.

### Cast

| Id       | Name       | Who                                                                                      |
| -------- | ---------- | ---------------------------------------------------------------------------------------- |
| `niko`   | Niko       | The new owner, a young man. Warm, a little tired, loves a pun.                           |
| `query`  | Query      | Counter robot. Literal-minded, precise, speaks in short reports.                         |
| `brew`   | Brew       | Kitchen robot. Eager perfectionist, loves the grinder.                                   |
| `porter` | Porter     | Floor robot. Cheerful and chatty, occasionally clumsy.                                   |
| `moka`   | Moka       | Lou's friend of forty years, the old kitchen stand-in. Dry, grumpy, retires in shift 22. |
| `pip`    | Pip        | Kid from the flat upstairs, the delivery stand-in. Fast, kind, easily excited.           |
| `albert` | Mr. Albert | Elderly regular. Always orders “the usual”. It is coffee.                                |
| `juno`   | Juno       | Student with a laptop. Tea, never sugar.                                                 |
| `dot`    | Dot        | Sweet-toothed regular. Counts her sugars exactly.                                        |
| `rosa`   | Rosa       | Arrives with friends and orders for the whole group.                                     |
| `guest`  | Guest      | Any customer at the counter.                                                             |

### Cutscenes

Seven scenes tell the story between shifts, each a few full-screen stills with
dialogue over them. A still stays up while its lines play, then crossfades to
the next one.

| Scene                  | Plays before | Stills | What happens                                          |
| ---------------------- | ------------ | ------ | ----------------------------------------------------- |
| The Keys               | Shift 1      | 5      | Niko opens Lou's café; Moka walks in; Pip signs on.   |
| The Scrapyard          | Shift 3      | 4      | Too many tickets; Niko rebuilds Query.                |
| A Second Pair of Hands | Shift 15     | 4      | Query's badge; the kitchen floods; Brew is found.     |
| Ninety-Two Degrees     | Shift 22     | 4      | Moka's last morning; she hands Brew her tamper.       |
| The Floor Robot        | Shift 23     | 4      | Pip is swamped and school is coming; Porter is found. |
| Back to School         | Shift 31     | 3      | Pip leaves for school; Niko becomes just the owner.   |
| Closing Time           | The receipt  | 4      | The café runs itself; everyone comes by.              |

Scenes appear on the campaign rail as rows of their own, just above the shift
they open, with a prune clapperboard instead of a number. The next shift stays
locked until its scene has been watched or skipped; after that the scene can be
rewatched at any time. Seen scenes are stored in the save's `story` map, under
the index of the shift they open. Closing Time is the last row of the Finale
and opens with the ending.

Stills go in `assets/cutscenes/<scene>/<nn>.png`, numbered from `01`. Run
`python3 tools/cutscenes.py` (needs Pillow) to crop them to 16:9 and write
1920 × 1080 WebPs to `src/assets/cutscenes/`, which are bundled and precached
automatically. A still that isn't drawn yet shows a placeholder card with its
description. The prompts are in `cutscene_prompts.md`.

### Portraits

Put the full-size PNGs in `assets/portraits/<id>/<mood>.png`, then run
`python3 tools/portraits.py` (needs Pillow). It lines each bust up with the
bottom edge and writes a 768 × 1024 WebP to
`src/assets/portraits/<id>/<mood>.webp`, which is picked up, bundled and
precached automatically. Moods are `neutral`, `happy`, `worried`
and `surprised`. Only `neutral` is needed; a missing mood falls back to it, and
a character with no art shows a coloured initial card instead.

Suggested framing: transparent background, bust from the chest up, about
3:4 (for example 600 × 800), facing right toward the speech box, with the
bottom edge cut flat.
