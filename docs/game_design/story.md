# Story

## Campaign Setup

Niko inherits his Aunt Lou's small, modern, cozy café. Lou died in March and
left the café to him, with a postcard for Moka to post: “The café is yours now,
Niko. Be kind to the old machine.” Moka didn't post it. She ran the café alone,
the way Lou had, until the counter robot broke in June and she had to close.
The card reaches Niko in October, with the keys: a café full of half-working
equipment, old service manuals, and a quiet repair bay in the back room with
three empty charging docks.

He doesn't start alone. Moka, who ran the espresso machine beside Lou for forty
years, lives across the street and walks in on his first night. She tells him
the post is slow. Pip, a kid who lives in the flat upstairs, wants to help: Lou
made him a hot chocolate every Saturday and let him carry the empties, he is
saving his pocket money (for something new every week), and he spent last
summer helping at his mum's restaurant.

The early cafe runs prove that doing everything by hand does not scale. Niko
starts repairing robots from a nearby scrapyard so the cafe can become stable
without constant human intervention.

## Act I: Query, The Order-Taking Robot

Query is the first robot Niko repairs. Query can hear customers clearly, but it
needs programming before it can translate human requests into the structured
tickets used by the rest of the cafe.

Act I teaches Query through seven short order-intake puzzles:

- listen for a customer and write a ticket;
- tell coffee from tea;
- keep serving the queue;
- sugar, and “without sugar”;
- one ticket per drink when a customer orders several;
- exact sugar counts;
- ask Niko for help on unclear orders (“the usual”).

By the end of Act I, Query can operate the counter without Niko intervening.
The next bottleneck becomes drink preparation, setting up the preparation robot
for Act II.

## Acts II–IV

- **Act II, Brew (five shifts).** The kitchen robot learns the coffee machine,
  tea, sugar cubes, a recipe function, and carrying two cups. Moka retires
  before the last one.
- **Act III, Porter (three shifts).** The floor robot learns to read the table
  off the order, clear dirty cups, and carry two drinks. Pip leaves for school
  after the last one.
- **Act IV, the whole crew (five shifts).** Nobody is left to cover for the
  robots, and each shift brings an odd day that one robot can't handle alone:
  take-away orders, only four cups, customers in a hurry, and closing time.
  The last shift is the busiest day of all.

The shift-by-shift table is in [docs/campaign/README.md](../campaign/README.md).

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
  the problem and gives a hint while the failing block stays highlighted.
- **Payoffs** close a finished service before the receipt: whoever the intro
  left waiting gets what they came for (Juno's tea, Dot's two sugars, Moka's
  grudging nod), then Niko gives the star verdict. A shift without a written
  payoff gets a stock cheer from its robot.
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

Scripts live in `src/data/campaign/dialogue.ts` (intros and payoffs),
`src/data/campaign/cutscenes.ts` (cutscenes) and
`src/features/workspace/reactions.ts` (failure and success lines). The tone is
cozy, with grief handled gently: no villains, Lou's death is never shown, and
the story is about moving on, not about loss.

### Cast

| Id       | Name       | Who                                                                                     |
| -------- | ---------- | --------------------------------------------------------------------------------------- |
| `niko`   | Niko       | The new owner, a young man. Warm, a little tired, loves a pun.                          |
| `query`  | Query      | Counter robot. Literal-minded, precise, speaks in short reports.                        |
| `brew`   | Brew       | Kitchen robot. Eager perfectionist, loves the grinder.                                  |
| `porter` | Porter     | Floor robot. Cheerful and chatty, occasionally clumsy.                                  |
| `moka`   | Moka       | Lou's friend of forty years, the old kitchen stand-in. Dry, proud, retires in shift 13. |
| `pip`    | Pip        | Kid from the flat upstairs, the delivery stand-in. Fast, kind, easily excited.          |
| `albert` | Mr. Albert | Elderly regular. Always orders “the usual”. It is coffee.                               |
| `juno`   | Juno       | Student with a laptop. Tea, never sugar.                                                |
| `dot`    | Dot        | Sweet-toothed regular. Counts her sugars exactly.                                       |
| `rosa`   | Rosa       | Arrives with friends and orders for the whole group.                                    |
| `guest`  | Guest      | Any customer at the counter.                                                            |

### Cutscenes

Seven scenes tell the story between shifts, each a few stills with dialogue
under them. The stills are photo prints dropped one by one onto a dark table:
a still stays on top while its lines play, then the next one lands on the
pile.

Underneath the robots, the campaign asks one question: whose café is it? It
starts as Lou's. Moka guards it that way (six sharp, cups on the left, no
robots in the kitchen) because keeping it Lou's is how she holds on to her.
Each scene moves it a step toward being Niko's, and the two stand-ins each
change their mind on the way: Moka lets go of the kitchen, Pip lets a robot
onto his floor. Lou never appears; her card opens the story and closes it.

The menus follow the same question. The name on the front ticket, the order
rail and the handbooks reads “Lou's” until the campaign is finished, and the
closing receipt is the first place that says “Café Niko” (`useCafeName`).

| Scene                  | Plays before | Stills | What happens                                                                        |
| ---------------------- | ------------ | ------ | ----------------------------------------------------------------------------------- |
| The Keys               | Shift 1      | 10     | Lou's card arrives seven months late; Moka says the post is slow; Pip signs on.     |
| The Scrapyard          | Shift 2      | 8      | Too many tickets; Niko rebuilds Query, Lou's robot that Moka threw out.             |
| A Second Pair of Hands | Shift 9      | 8      | Query's badge; Moka refuses a robot in Lou's kitchen; Niko finds Brew anyway.       |
| Ninety-Two Degrees     | Shift 13     | 8      | Moka admits she kept the card, hands Brew her tamper and tells Niko to make it his. |
| The Floor Robot        | Shift 14     | 8      | Pip doesn't want a robot on the floor, until he meets Porter.                       |
| Back to School         | Shift 17     | 6      | Pip leaves for school; Niko moves the cups and becomes just the owner.              |
| Closing Time           | The receipt  | 8      | “It's your café.” Lou's card goes up: the old machine was Moka all along.           |

Scenes appear on the campaign rail as rows of their own, just above the shift
they open, with a prune clapperboard instead of a number. The next shift stays
locked until its scene has been watched or skipped; after that the scene can be
rewatched at any time. Seen scenes are stored in the save's `story` map, under
the index of the shift they open. Closing Time is the last row of Act IV and
opens with the ending.

Twice in the story the player picks what Niko says, and the question is the
campaign's own. In _The Scrapyard_ Query asks who its new operator is: "It's my
café now" or "I'm minding Lou's café". In _Back to School_ Pip promises hot
chocolate "the way Lou made it": "The way we make it!" or "Just the way Lou
did." Each answer plays at once, Niko's words and then someone's reaction, and
a later scene recalls it: Query in _A Second Pair of Hands_ and _Closing Time_,
Pip in _Closing Time_. Neither answer is the right one, and nothing is scored,
locked or unlocked by it.

- The answers are buttons numbered 1 and 2 (the number keys pick them too).
  Nothing moves a scene past a choice but an answer, or Skip.
- An answer is kept in the save's `choices` map (choice id → answer id) as it
  is given, so skipping the rest of the scene keeps it. Skipping past a choice
  gives no answer; a scene recalling one never given plays as first written.
- Watching a scene again asks again, with the last answer marked "Said last
  time", and a new answer replaces it. Going back a line to a choice already
  answered can change it too, and the lines after it follow.
- A scene recalls the answers as they were when it began, so an answer given
  partway through never rewrites the scene being watched.

In a script, `ask(line, id, answers)` puts a choice after a line and
`recall(id, answer, line)` writes a line said only for that answer
(`src/data/campaign/cutscenes.ts`). `tests/unit/components/cutscene.test.tsx`
holds every answer to Niko speaking first and someone reacting, and every answer
to being recalled in a later scene.

Stills go in `assets/cutscenes/<scene>/<nn>.png`, numbered from `01`. Run
`python3 tools/cutscenes.py` (needs Pillow) to crop them to 16:9 and write
1920 × 1080 WebPs to `src/assets/cutscenes/`, which are bundled and precached
automatically. A still that isn't drawn yet shows a placeholder card with its
description, but a release ships every panel: `tests/unit/assets/art.test.ts`
wants one still per panel of every scene. The prompts are in
`cutscene_prompts.md`.

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

`npm run validate:data` (and so `npm run build`) checks the converted art with
`tools/art-check.mjs`: every source has its WebP and every WebP its source,
stills are opaque 1920 × 1080, portraits are 768 × 1024 with transparency,
panels are numbered from `01` without gaps, and every character has `neutral`.
Re-run the conversion tool it names to fix what it reports.
