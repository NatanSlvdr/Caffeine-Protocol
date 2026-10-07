# Architecture

Caffeine Protocol is a static offline-first React + Three.js game. The build
emits plain files (`base: './'`) plus a `sw.js` precache, so a reloaded page
works with no network.

## Layers

```
data → shared/domain → components → app shell
              ↑              ↑
           features ─────────┘
```

- **`src/shared/domain/`** is innermost: types, constants, commands, robots,
  tickets, scoring, layout, and the simulation language/runtime. It never
  imports `features/`, `data/`, or `components/`.
- **`src/data/`** merges campaign sources (split JSON, generated extension
  shifts, narrative). It may read `shared/domain`, preferably type-only.
- **`src/components/`** is presentation: editor tiles, selects, café scene,
  bubbles. It reads `shared/domain` and `data` through barrels, never
  sideways into `features/`.
- **`src/features/`** owns behavior: the workspace (live run lifecycle),
  campaign save modules. It composes `components/` and `shared/*`, injects
  `data` via props or the store — never imports `data/` or app shell.
- **App shell** (`src/App.tsx`, `src/app/`, `src/state/`, `src/shell/`,
  `src/audio.ts`) wires everything: routing, `GameStore`, pages. The shift
  screens (`Workspace`, `SpecialShift`, `MemoryShift`) come through
  `app/screens.tsx`, which keeps them out of the startup chunk and fetches
  them once the page is idle; the unit tests' setup fetches them first, so a
  test renders a shift at once. See [PERFORMANCE](PERFORMANCE.md).

Enforced by `eslint.config.mjs` (`boundaries/dependencies`, `import/no-cycle`,
`no-restricted-imports` for deep relative domain/data paths) and `knip`.

## Single sources of truth

| Concept | Home |
| --- | --- |
| Blocks | `domain/blockRegistry.ts` (+ `blockFields.ts`) |
| Drink recipes | `domain/drinks.ts` (`RECIPE_RULES`), prices in `domain/pricing.ts` |
| Robot meta | `domain/robots.ts` (names, areas, unlocks, `robotForLevel`, `splitByUnlock`) |
| Unlock shifts | `domain/unlocks.ts` (`UNLOCKS`: the shift where each robot and each part of the language arrives) |
| Conditions | `program/conditions.ts` (query) vs `robotConditions.ts` (worker) |
| Tickets | `domain/tickets.ts` (units, paper, sugar) |
| Scoring | `domain/scoring.ts` (blocks, stars, satisfaction, tables) |
| Constants | `domain/constants.ts` (limits, timings, drag tuning) |
| Narrative | `data/campaign/narrative.ts` (one row per shift) |
| Extension shift mechanics | `data/campaign/extension-config.json` (stages) merged by `extension-config.ts` |
| Audio | `src/shared/audio-manifest.ts` (`SOUNDS`) |
| Words on screen | One catalog per screen (`shell/homeWords.ts`, `app/settingsWords.ts`, `app/cafeWords.ts`, `app/guideWords.tsx`), made with `words` from `src/shared/language.tsx` |

Key registries by `id`, never by index. No positional arrays for concepts.
No `as` casts in loaders — campaign files are `safeParse`d with valibot.

## Simulation

- `program/compiler.ts` compiles the finite instruction language; player text
  is never evaluated as JavaScript.
- `program/interpreter.ts` (`streamCustomerEvent`) is a suspended generator
  used identically by offline validation (`simulation/run.ts`) and live runs
  (`live/` + `features/workspace/useLiveRun.ts`).
- `service.ts` runs kitchen/floor workers on a deterministic event clock. It
  stays a single-module orchestrator on purpose: splitting the clock across
  modules risks event-ordering drift. Pure pieces (recipes, scoring, seating,
  satisfaction) live in their own modules.
- Offline validation is not the service the player watches: without
  presentation delays Query takes orders several times faster, so the waits
  between floor steps differ. Rules timed in seconds of waiting (the knitting
  circle's serving window, `ServiceConfig.fresh`) are calibrated and tested on
  live runs (`finishLiveRun(createLiveRun(...))` in `tests/helpers/run.ts`),
  and the café preview's dry round (`blockPreview.ts`) leaves the window out.
  A drink's window runs from `Job.readyAt` (set down at pickup) to its
  guest; each warm drink's deadline joins the clock's future events, so a
  drink goes cold at its deadline even while every robot waits.
- UI never calls the engine directly: `Workspace` drives runs through
  `useLiveRun`, which owns programs, role, result, and the clock.
- The café's animation follows the replay, never the other way round.
  `sampleReplay` times a hand's reach (`reachAt`) so it is over the station
  when the block ends, the moment the service hands a cup over, and brings it
  back after (`REACH_FOLLOW_THROUGH`); the snapshot also marks a robot that is
  `waiting` and the one whose block `failed`. The arms (`cafe/arms.ts`) put an
  empty hand at full reach where a carrying hand holds its cup. A waiting
  robot's glance and a failed one's head shake (`cafe/headPose.ts`) run on the
  wall clock, since neither moves anything in the service: they read the same
  at any speed, and the shake still plays once the replay stops at a failure.

## Saves

`features/campaign/save/`: `settings` (key, defaults, `newSave`), `validate`
(structural guards), `migration` (`parseSave`, legacy v1–v3 migration),
`progression` (drafts, completion), `io` (storage). Versions:

- **v1** — Act I flat drafts/solutions. Migrated: Query programs reset to
  starters, unlocks preserved past shift 14.
- **v2** — per-robot drafts. Migrated like v1 for Query; kitchen/floor kept.
- **v3** — `robotDrafts`/`robotSolutions` per shift and role, indexed against
  the 32-shift campaign.
- **v4** — current. Same shape as v3, indexed against the 21-shift campaign.
  v1–v3 saves move over through `LEGACY_COUNTERPARTS`: a new shift keeps the
  stars and programs of the old shift that played the same way, and play
  resumes at the first new shift whose counterpart wasn't served. Act IV has no
  counterparts, so a finished 32-shift save resumes at its first shift.

`complete` is a sticky historical flag (the then-final shift was finished), never
a length check: imports require earned stars for the unlocked shift instead of
`unlocked === lessons.length - 1`, and a completed save from a shorter catalog
unlocks exactly the next appended shift on import.

`SAVE_KEY` (`caffeine-protocol.v1`) is a stable storage namespace, not a schema
version: the `v1` suffix names the localStorage slot, while the schema version
lives inside the payload (`version: 1 | 2 | 3 | 4`). Schema bumps migrate via
`parseSave` and must never rename the key, or existing saves become orphans.
Historical `tests/fixtures/save-v1.json` + `save-v2.json` (pinned by
`save-fixtures.test.ts`) prove compat with real serialized history.

A browser keeps up to eight cafés, listed under `caffeine-protocol.v1.cafes`
(`features/campaign/save/cafes.ts`). The first café's save stays at `SAVE_KEY`,
so a browser from before there could be several finds its café as the first
with nothing to migrate; each café added later saves at
`caffeine-protocol.v1.cafe-<n>`. Which café a tab plays is settled once as it
opens (`settleCafe`) and read through `cafeKey()`; switching cafés reloads the
page, so a tab never writes into a café it didn't open with.

Beside each café's save, and never in it, are `<café key>.backup` (the kept
copy, taken ahead of a fresh start, an import or an update) and two keys a
fresh start or an import leaves alone: `<café key>.seen` (which shelf and
guestbook entries this browser has shown) and `<café key>.bench` (each shift's
test bench, `features/workspace/bench.ts`). Removing a café clears them all.
One key is shared by every café: `caffeine-protocol.v1.notebook` (the routine
notebook, `features/workspace/notebook.ts`), since a routine worth keeping is
the player's, not one playthrough's.

The notebook is stored in the same format it exports as, and its pages are
checked against the open robot and shift when shown (`unreadableLine`), not
when kept. A page's lesson (a word on what it shows, notes on its blocks by
their place among the blocks) is plain text, cleaned of control characters
whenever it is read or written out, and exported by `lessonText` as a `.txt`
file. A kept bench holds only what its guests ask for, and the shift's rules it
eases, if any; `benchSeed` (domain) works out what they should get each time it
runs, and a bench the shift can no longer take is dropped. An eased bench
travels as its seed's `eased` list, and `easedShift` (domain) plays it under
those rules: twice the cups, a load of one, or no closing time. Runs under
other rules never compare, as their fingerprints differ.

What Niko said at each story choice is the save's `choices` map (choice id →
answer id, left out until one is answered). Like drills, ids no longer in the
story are kept, harmlessly, and nothing reads them but the scenes that recall
them (`sceneLines(scene, choices)`).

The café's looks are the save's `decor` map (spot → look id), kept by
`pickDecor`, which leaves out a spot set back to Lou's and the map once none
is picked. `decorOf` (domain) reads what the café shows: a pick it has earned,
and Lou's for one it hasn't or doesn't know, so an imported save never shows a
look early. Earning reads only stars and `complete`, as keepsakes do; nothing
in a service reads the looks. The 3D print and the shelf's thumbnail draw from
the same shapes (`components/cafe/prints.ts`), and a memory always shows Lou's.

The save layer takes a `LessonCatalog` parameter instead of importing data,
so validation stays testable without the campaign bundle.

A special (`data/specials.ts`) keeps its progress in the save's `specials`
map, by id: a draft, a solution, stars and challenges, and nothing for one
never touched. It plays in the ordinary `Workspace` as the shift after the
campaign's last: `app/SpecialShift.tsx` hands the workspace a save laid out by
`projectSpecial`, with the special's progress at index `CAMPAIGN_LENGTH` and the
lesson appended to the catalog, and folds every change back with
`keepSpecial`, which moves that index's progress into `specials` and restores
`selected`, `unlocked` and `complete`. So the workspace needs no special case,
the routines carried in are Shift 21's, and serving a special never unlocks,
finishes or stars anything in the campaign. `parseSave` checks the map (ids,
star counts, known challenges, at most 100 entries) and drops empty entries.

The robots mended on the repair bench are a list of ids in `repairs`, checked
like `drills`; a wiring in progress lives in the bay's own state and is never
saved. The bench's logic (`domain/repair.ts`) is pure, and each bench in
`data/repairs.ts` checks as the module loads that its starter is broken and its
solution mends it.

A memory (`data/memories.ts`) keeps its progress the same way, in `memories`,
but plays in the place of the shift whose toolkit it borrows (`L05-day-one`
plays at index 4, with Shift 5's blocks). `app/MemoryShift.tsx` hands the
workspace a café of its own from `projectMemory`: nothing of the campaign's
drafts, routines, stars or challenges, only the memory's at that index, and the
memory's lesson in that index's place in the catalog. So it opens on the
memory's starter, and its earlier versions are only its own. `keepMemory` folds
every change back, restoring each map the campaign keeps by shift; anything
else the workspace changed, like the settings, stays changed. A special and a
memory lay out as a shift: the app root carries `workspace` beside their own
screen class.

The Long Day keeps its progress in `endurance`: the version of the waves it
was played on, the wave the open day is on (none when no day is open), the
furthest wave served, each wave's stars, and one draft and one set of served
routines for every wave. That is the checkpoint a day resumes from after the
tab is closed; a wave is a single short run, so nothing of a run in progress is
saved. `app/LongDayShift.tsx` plays wave N at `#/long-day/N` in the slot after
the campaign's last, like a special: `projectEndurance` lays the day's routines
and that wave's stars out as a temporary specials entry, and `keepEndurance`
folds them back and restores the specials. Serving the open day's wave moves
the day on (`servedWave`), so stopping on the receipt resumes from the next;
the receipt's `onward` prop gives it **Next wave** and **Stop for now**.
`waveOpen` lets the address reach the open day's wave and any wave served
before, on the current version only. `startDay` opens a day from the first
wave; on a new version it keeps the routines and drops the stars and the
furthest wave, which were earned on other waves.

## Languages

The browser's language (`src/shared/language.tsx`) is English or French,
kept under its own storage key rather than in a café: every café in the
browser reads in it, the way they share the notebook, and an export carries
none. `LanguageProvider`, at the top of `App`, keeps `<html lang>` in step
and follows other tabs; Settings offers the choice, each language named in
itself. It sits at the root of `src/shared/` so every layer may read it.

A screen's words are a catalog made with `words(en, fr)`. The French must
have the English's shape, so a missing line, or a sentence that takes other
values, fails to type-check. A sentence built from a count or a name is a
function, so each language builds it its own way (`countFr` counts zero and
one in the singular). French is written with plain spaces and set by
`words`: a no-break space before `:` and inside `« »`, a narrow one before
`; ? !`, and one after `n°` and before `%`. JSX in a catalog is left alone,
so it spells those spaces as entities. `useWords(catalog)` gives the
reader's.

French covers the front door, the top bar, the order rail with its tickets
and specials board, Settings with its cafés and the fresh-start slip, the
handbook, and the close button every window shares. On a shift screen it
covers the controls: the bar over the café
(`features/workspace/workspaceWords.ts`), the playback toolbar with its
pause menu, the coding pane's tools and robot tabs
(`components/paneWords.ts`), the photo bar, the practice card and the first
routine's tips. Of the shift's windows it covers Options and Restore, with
the line-by-line comparison and the versions' names
(`modals/optionsWords.ts`; `routineVersions` takes those names, English by
default), Help with its hints and clues (`modals/helpWords.ts`; `clueFor`
takes the clue's sentences), the receipt (`modals/receiptWords.ts`) and the
notebook with its lessons (`modals/notebookWords.ts`; `lessonText` takes the
lesson file's words, and `parseNotebook` throws a `NotebookRefusal` keyed by
why), the test bench (`modals/benchWords.ts`; `easeChoice` and `easedWords`
take its words, so the toolbar and practice card say the eased rules in
French too, while what a guest says stays English, quoted, since a routine
listens for its words) and Compare runs (`modals/compareWords.ts`; `runName`
and `compareRuns` take its words, and `guestCalled` a guest's). Under the
routine, the failure card reads in French too (`failureWords.ts`): where the
run stopped, the comparison (`comparisonOf` takes its words), Query's
decisions and the hint by code (`failureHint` takes the hints, English by
default, so Niko's line in the crew's scene still says it in English). Why
the run stopped, what the guest said and the IFs Query tested stay English,
marked so. The evidence keeps only a regular's name (`regularCalled`), so
anyone else is numbered in the reader's language. So do the handover card
(`handoverWords.ts`: the jobs are written once in `HANDOVERS`, and the
French follows them step by step) and the note beside a picked block's
preview (`previewWords.ts`): the domain names the places a block reaches as
`Place` keys (`reachedPlace`, `standingPlace`), so French can give each its
article, and `visitWords` takes the words, with where a run stopped said
apart, in English. So do the robot inspector, the robot tabs' activity and
what a paused step says (`pauseWords.ts`: when and why the service paused,
what each robot is doing or waiting for, the inspector's rows, the ticket
and the drinks keeping warm; `inspectRobot`, `startedWords` and
`crewActivity` take the words, English by default), with what a robot
carries and remembers in `components/cargoWords.ts` (English is the domain's
`heldLabel`, `paperLabel` and `placeLabel`; `storedPlace` names a remembered
place as a key). So do the replay timeline and the card that follows an
order (`routeWords.ts`: the jumps, each moment, and every leg of the order's
way; `legWords` and `momentWords` take the words, English by default). The
domain names a cup of a two-drink order as an `OrderCup` (its drink and
which of the two), so `cupName` says *second tea* and French *deuxième thé*;
why a robot stopped stays English, marked so. So does the café in words
(`summaryWords.ts`: the summary beside the scene and what a screen reader
hears happen; `summarize`, `guestDoing` and `happenings` take a `ServiceSay`
of it with the pause, cargo and route words, English by default), which now
keeps what a guest said and why a robot stopped apart, so they are marked
English. So does the café itself (`components/sceneWords.ts`: the floor
lettering, the robots' bubbles, the order queue and the order icons). Its
overlays are drei `Html`, each a React root of its own that context doesn't
reach, so `SceneHtml` passes the language on with `LanguageRelay`; a hand
action now names its station as a `Place` key. The code editor reads in
French too (`components/editor/editorWords.ts`): its library and code zone,
the text view's help, a picked block's buttons, its number, fold and jump
buttons, its fields' labels (*Bloc 2, valeur*), and what a screen reader
hears as blocks are added, moved, folded, marked and dragged;
`dragAnnouncements`, `dragInstructions` and `spotWords` take those words,
and `copyBlocker` returns why by key. What each library block does is
`editor/blockHelpWords.ts`, which `blockHelp` and `spokenHelp` take. Block
names, the words on the blocks and the compiler's verdict stay English. So
does the dialogue box around a scene
(`components/dialogue/dialogueWords.ts`: Back, Skip and Next, the count of
lines, the marks on Niko's answers, and a guest's role, which `speakerParts`
and `speakerLabel` take), while the lines, the answers and the scene's title
stay the story's English, marked so; a screen reader hears who speaks in
French and what they say in English. So do the button that ends a scene
between shifts and the closing receipt's bar, rows and ways on
(`shell/storyWords.ts`, with each act's milestone in the order of `acts`);
the receipt's heading and Niko's last lines stay English, marked so. So does
the save notice over every screen (`app/saveNoticeWords.ts`): `readSave` and
`writeSave` return a `SaveProblem` key (`SAVE_PROBLEMS` keeps the English),
so the notice and Settings say why the café isn't being saved in the
reader's language. Of the rail's windows, the drills read in French
(`shell/drillWords.ts`): the list by act and by flight, a flight's progress,
and the frame around a gap, a moment to call and a kit, with what a robot
holds from `cargoWords` and `spokenLines` joining blocks in the reader's
language. A drill's title, question and idea, a flight's, a kit's rule and
why the café turned a pick away stay English, marked so. Block names, what a
guest said and what Query heard stay as they are. So do the shelf
(`shell/shelfWords.ts`: each keepsake's name, goal and story and each
look's, by id, with the English taken from `keepsakes` and `DECOR_OPTIONS`,
and a wrapped keepsake naming its act as the rail does, *l’acte III*,
through `lower`), and the guestbook and memories' frames
(`shell/keptWords.ts`); the regulars' notes and the memories stay the
story's English, marked so. So do the specials board
(`shell/specialsWords.ts`: a special's and a menu's card, a menu laid out
card by card, and the Long Day's waves and ways in) and the repair bay
(`shell/repairWords.ts`: the bay, a bench's card and the bench's frame,
cases and tally); what the regulars ask for, a card's rule, and a robot's
part, fault, sensors, actions and cases stay the story's English, marked so,
with a menu's or part's name as the window's title through `titleLang`. So
do the tab's title and what a shift past the campaign is called in its bar
(*Souvenir*, *Vague 2 sur 6*, *Vague suivante*; `app/screenWords.ts`), and
the notices that stand in for the 3D café (`shared/ui/stageWords.ts`, with
`NoGraphics` shared by `SceneBoundary` and `SceneCanvas`). `DialogueBox`
takes a `kickerLabel` in the reader's language before the kicker, and a
`kickerLang` for a kicker still English: a scene's, a special's or a part's
name. The shifts' titles and briefs read in French too
(`data/campaign/narrative.fr.ts`, row for row with `campaignNarrative`, its
lesson notes naming the same blocks in their own words): `useNarrative`
gives every shift's in the reader's language and `useShift` the open one's,
lesson note included, so the rail, the board, the front door, Help, the
coding pane, the receipt and the windows that cite a shift say its French
name. A special's, a memory's and a Long Day wave's are still English, so
`WorkspaceShift` takes a `lang` that the pane, Help and the intro's kicker
carry. `CHALLENGE_WORDS` is a catalog too; the generated shift docs read its
English. A window whose title is still English marks it with `titleLang`.
Short repeats is worded once, as `SHORT_REPEATS` beside `SettingRow`, for
Settings and Options both. The words of the crew's scenes and reactions, the
levels' own data and the stories of the specials, memories, drills and
repairs are still in English, and so is the list of what bringing an old
save up to date changed, marked so under the notice's French heading. Where
English data sits on a French screen (a special's name, its story and goal,
a scene's logline), it carries `lang={useUntranslated()}`, so a screen
reader says it as English; on an English page the attribute is left off. Act
names and taglines for the tickets are in `shell/rail/railWords.ts`;
`acts.ts` keeps the English names the English-only windows still read. The
save checks' refusals are keyed (`SAVE_REFUSALS`) so Settings can say them
in French; a damaged file's field is left out in French. The handbook names
the buttons and windows as they read in French. The French toolbar reads
longer, so its step buttons fold to their icons below 1360px rather than
1180px. Programming words (blocks, values, the text editor's syntax) are
never translated, so a routine and a shared notebook read the same in either
language.

## Photo mode

Photo mode (`features/workspace/PhotoBar.tsx`, `photo.ts`) is workspace state
only: it pauses a playing service and resumes it on the way out, and drives
the café's `focusRole` through its own framing, so the workspace's camera
view, followed guest and routines are untouched. `Cafe` takes a `snapshot`
ref, filled by `components/three/Snapshot.tsx` inside the canvas. It reads
the canvas in an `addAfterEffect` callback, straight after a frame is drawn
(pixel pass included), because the renderer doesn't keep its frames. A
frame that hasn't come within two seconds gives nothing. `framePhoto` then
mounts the shot as a captioned print on a 2D canvas; where there is none
(jsdom), the shot is saved as it is.

## Where to add things

- **Shift L22**: one `LevelSeed` in `data/campaign/extension-seeds.ts` plus one
  `ShiftNarrative` row in `data/campaign/narrative.ts`. No code edits.
  Regenerate docs with `npm run docs:gen`, then check `npm run validate:data`.
- **Extension constraints**: shift mechanics live only in
  `data/campaign/extension-config.json` (stages merged by `extensionShiftConfig`).
  Language and robot unlocks read their shift from `domain/unlocks.ts`; there
  are no other `level >= N` thresholds or `level === <final>` gates, and future
  shifts inherit the latest stage. `tools/docs-gen.mjs` reads the same JSON for
  table counts and never asserts a seed count; `tools/validate-data.mjs`
  requires every extension seed to have a narrative row. Locked-robot stand-ins
  compile at `ROBOT_STAND_IN_LEVEL`, which exceeds every unlock by design — it
  is not the campaign length. Save validation follows the injected catalog
  length, so longer campaigns validate without code changes.
- **Special**: one `Special` in `data/specials.ts` (its level, lesson, brief,
  intro, outro and thanks) and a test that serves its reference. Its route
  (`#/special/<id>`), its card in the campaign's Specials window and its save
  entry follow from the id; it validates itself as the module loads. A menu
  card is a special with `card` set: the window groups the cards of one `Menu`
  behind a single entry and lays them out side by side, and `menuCard` builds
  each one's rounds from bench guests, with a reference made of the rules the
  card brings. The Long Day (`data/longDay.ts`) builds its waves the same way,
  through `benchShift`, all on the day's full set of rules; a change to its
  waves bumps `longDay.version`, and a day open on an older set starts over.
- **Memory**: one `Memory` in `data/memories.ts`, with `opens` (the campaign
  shift whose service brings it out) and a level id naming the toolkit it
  borrows, plus a test that plays its reference and its starter.
- **Repair bench**: one `Repair` in `data/repairs.ts`, with `opens`, its
  sensors, actions and worked cases, a starter and a solution. It checks itself
  as the module loads, and its card in the Repair bay follows from the id.
- **Block**: one `BlockRegistry` entry (family/operands) plus the command in
  the compiler's `availableCommands` and interpreter dispatch — the registry
  is the discovery point; the language core stays explicit.
- **Drink** (e.g. matcha): one `RECIPE_RULES` entry in `domain/drinks.ts`
  plus `PRICES` in `domain/pricing.ts`.
- **French for another screen**: move its words into a catalog beside it,
  made with `words(en, fr)`, and read them with `useWords`. List the catalog
  in `tests/unit/shell/language.test.tsx`, which checks that no French line
  is left in English.
- **Sound** (e.g. pour): one `SOUNDS` entry in `shared/audio-manifest.ts`,
  generate with `npm run gen:audio`, sync with `npm run audio:sync`. The id
  flows into the precache list and `npm run validate:data` automatically.

## Offline build

`vite/plugins/offline-cafe.ts` emits `sw.js` precaching `./`, `index.html`,
`icon.png`, bundles, and every `SOUNDS` wav. `Vary: Origin` on static responses
means the worker matches with `ignoreVary: true`. No PWA manifest or
OpenGraph tags by design: the game is a self-contained static page, not an
installed app.

## Known deviations from the original modularization plan

- `src/domain/` was not physically renamed to `src/shared/domain/` (and the
  simulation was not moved under `src/features/simulation/`). The eslint
  `shared-domain` element already covers `src/domain/**`, so the layering is
  enforced logically; a physical move is pure churn until a second consumer
  needs it.
- `service.ts` keeps its generator core (~230 lines) instead of splitting
  into context/steps/clock modules (see Simulation above).
- `replay.ts` keeps its single sampling pass; counter extractions live in
  `domain/counters.ts`.
- `street.ts` keeps its timings (cohesive street domain) instead of moving
  them into `constants.ts`; cross-module numbers already live there.
- `referencePrograms` stays in `data/extension.ts` (data→domain is legal);
  tests pin its one-argument shape.
- Legacy `CHARGE`/`BATTERY` save migration stays: `save-v2` tests pin it for
  old saves, so the grace period is not over.
- `Modal` gained an `aria-label` (dialogs have no name-from-content) and
  `SceneCanvas` probes WebGL support because renderer-creation errors escape
  error boundaries with current three/fiber versions.
- `Editor` shell is ~155 lines (target <150): the remainder is DndContext
  wiring, which is the shell's job.
