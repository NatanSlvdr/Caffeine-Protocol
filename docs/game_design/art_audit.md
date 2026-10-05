# Art audit

What the shipped art is, against what the story asks for. Taken on 2026-10-05 (roadmap P01), before any art is
regenerated: this is the list to approve and draw from, not a record of art replaced.

## What is checked automatically

`tools/art-check.mjs`, run by `tests/unit/assets/art.test.ts`, holds every shipped image to:

- **A source.** Each `src/assets/<kind>/…/*.webp` has its `assets/<kind>/…` original, and every original is converted.
- **Its frame.** Stills are 1920 × 1080 with no transparency; portraits are 768 × 1024, cut out on a transparent
  canvas.
- **Its place.** Stills run `01`, `02`, … with no gap, one per panel of the scene's script; every character has a
  `neutral` portrait, and only moods the dialogue knows.
- **Being itself.** No image ships twice under two names.
- **The story's moods.** Every mood a scene or a reaction asks for has a portrait, except the ones listed below as
  still to draw, and no portrait is drawn that nothing shows.

All of this passes. What it can't see is whether a picture shows what its panel says, so that was checked by eye.

## Cutscene stills: 22 to redraw

The 56 stills are two sets. The first three to five of each scene are the first story's stills, 28 in all, kept
when the story was rewritten around Lou's last card (drawn in `3057f14e`, put back unchanged in `179f15d4`); the rest
were drawn for the current story. Six of the 28 still fit: the opening still of every scene but Back to School.
Each of the other 22 shows a beat the current script tells later in the same scene, so the player sees that beat
early, then again.

| Still                       | The script asks for                                                 | The still shows                                      |
| --------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `the-keys/02`               | Close-up: the postcard in Niko’s hand, rain spotting the ink.       | The dust sheet coming off the machine: panel 03.     |
| `the-keys/03`               | Niko pulls a dust sheet off the espresso machine, in the dark.      | The shape in the doorway, the portafilter: panel 05. |
| `the-keys/04`               | Close-up: the ticket spike, the last ticket dated June.             | Moka with her wet umbrella: panel 06.                |
| `the-keys/05`               | A dark shape in the doorway; Niko spins round with a portafilter.   | Pip waving at the window: panel 09.                  |
| `the-scrapyard/02`          | Niko bolt upright; Moka leans on her broom, not meeting his eye.    | The gate and the pile of heads: panels 03–04.        |
| `the-scrapyard/03`          | Niko pushes a wheelbarrow through the scrapyard gate at sunset.     | The robot open on the workbench: panel 06.           |
| `the-scrapyard/04`          | A cream robot head pokes out of a pile of old toasters.             | Niko beside the lit visor: panel 07.                 |
| `a-second-pair-of-hands/02` | Query hands Mr. Albert his cup across the counter.                  | The ticket tray overflowing: panel 03.               |
| `a-second-pair-of-hands/03` | The ticket tray overflows; Moka is buried behind it.                | The tarp at the scrapyard: panel 06.                 |
| `a-second-pair-of-hands/04` | Niko points at the two empty docks; Moka blocks the doorway.        | Brew waking on the workbench: panel 07.              |
| `ninety-two-degrees/02`     | Close-up: Moka’s hand on her apron pocket, beside the brass tamper. | The tamper handed to Brew: panel 06.                 |
| `ninety-two-degrees/03`     | Niko arrives at the door with Brew; Moka doesn’t turn round.        | The apron on its hook with the 92° note: panel 07.   |
| `ninety-two-degrees/04`     | Moka on a stool by the machine, tired; Niko across from her.        | Moka on her porch: panel 08.                         |
| `the-floor-robot/02`        | Rosa’s table waving; Pip spins, a cup wobbling on his top tray.     | The calendar, SCHOOL circled: panel 03.              |
| `the-floor-robot/03`        | A wall calendar with the end of August circled: SCHOOL.             | Porter under the parasol: panel 06.                  |
| `the-floor-robot/04`        | Pip in the back-room doorway, arms folded, by the last empty dock.  | All three docks taken: panel 08.                     |
| `back-to-school/01`         | The evening before: Pip points out the regulars to Porter.          | The goodbye at the door: panel 02.                   |
| `back-to-school/02`         | Morning: Pip at the door with a school bag; the robots say goodbye. | Pip running off, Niko waving a tray: panel 03.       |
| `back-to-school/03`         | Pip runs off down the street, waving; Porter waves back.            | Niko hanging up his apron: panel 06.                 |
| `closing-time/02`           | The regulars leave; Porter holds the door, Mr. Albert tips his hat. | Niko with his coffee, Query watching: panel 03.      |
| `closing-time/03`           | Niko at the counter with a coffee he made himself; Query watches.   | Moka and Pip back in the café: panel 05.             |
| `closing-time/04`           | Query prints a tiny ticket and lays it next to Niko’s cup.          | The group photo and the postcard: panel 08.          |

Each of the 22 has its prompt in [Cutscene prompts](cutscene_prompts.md), under the same scene and panel. Until
they're drawn, the scenes are better left as they are than reshuffled: every still shows the right place and people,
only too soon, and moving one into an earlier slot would leave a later slot with nothing.

## Portraits: 6 moods to draw

The 11 neutrals and 10 moods are all shipped. Six moods the story uses have no portrait yet, so the line shows that
character's neutral face instead:

| Mood             | Where it's used                                                 |
| ---------------- | --------------------------------------------------------------- |
| `pip/happy`      | The Floor Robot, before Shift 14, and after Shifts 14 and 16.   |
| `pip/surprised`  | The Keys, at the window, and finding Porter in The Floor Robot. |
| `pip/worried`    | The Floor Robot: “A robot? No way.”                             |
| `guest/happy`    | A pleased guest after Shifts 2 and 17.                          |
| `albert/worried` | Mr. Albert reacting to a wrong order of his.                    |
| `rosa/worried`   | Rosa reacting to a wrong order of hers.                         |

Their prompts are in [Portrait prompts](portrait_prompts.md). Pip's neutral is already a grin, so `pip/happy` matters
least; `pip/worried` and `pip/surprised` are the ones a player would notice.

## Duplicates

70 sync conflict copies were tracked in git, `"01 2.webp"` beside `01.webp`. 56 were byte-for-byte copies of the
stills and their sources; 14 were level notes in `docs/game_design/levels/` deleted on purpose in `b0df20d3` and put
back by the sync. All 70 are removed, and `.gitignore` keeps new ones out. The game and the art check already skip
them.

No two shipped images are the same file. Several stills share a layout on purpose, such as the counter by night and at
dawn, and these are kept.

## Not recorded

Which image model made the portraits and stills, under what terms, and who drew the app icon: see
[Asset provenance](../RELEASE.md#asset-provenance).
