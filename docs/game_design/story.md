# Story

## Campaign Setup

Niko inherits an abandoned retro-future cafe full of half-working equipment,
old service manuals, and a quiet repair bay in the back room. The cafe can still
open, but only because Niko can patch together temporary scripted routines and
salvaged machines.

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
- **The ending** is a closing-time scene before the final receipt.

Scripts live in `src/data/campaign/dialogue.ts` (intros and ending) and
`src/features/workspace/reactions.ts` (failure and success lines). The tone is
cozy only: no villains, no stakes beyond a busy morning.

### Cast

| Id       | Name       | Who                                                                        |
| -------- | ---------- | -------------------------------------------------------------------------- |
| `niko`   | Niko       | The new owner, a young man. Warm, a little tired, loves a pun.             |
| `query`  | Query      | Counter robot. Literal-minded, precise, speaks in short reports.           |
| `brew`   | Brew       | Kitchen robot. Eager perfectionist, loves the grinder.                     |
| `porter` | Porter     | Floor robot. Cheerful and chatty, occasionally clumsy.                     |
| `moka`   | Moka       | Elderly woman, the old kitchen stand-in. Dry, grumpy, retires in shift 22. |
| `pip`    | Pip        | Very young delivery stand-in. Fast, chirpy, easily excited.                |
| `albert` | Mr. Albert | Elderly regular. Always orders “the usual”. It is coffee.                  |
| `juno`   | Juno       | Student with a laptop. Tea, never sugar.                                   |
| `dot`    | Dot        | Sweet-toothed regular. Counts her sugars exactly.                          |
| `rosa`   | Rosa       | Arrives with friends and orders for the whole group.                       |
| `guest`  | Guest      | Any customer at the counter.                                               |

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
