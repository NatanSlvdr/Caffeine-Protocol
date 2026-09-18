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
  `src/audio.ts`) wires everything: routing, `GameStore`, pages.

Enforced by `eslint.config.mjs` (`boundaries/dependencies`, `import/no-cycle`,
`no-restricted-imports` for deep relative domain/data paths) and `knip`.

## Single sources of truth

| Concept | Home |
| --- | --- |
| Blocks | `domain/blockRegistry.ts` (+ `blockFields.ts`) |
| Drink recipes | `domain/drinks.ts` (`RECIPE_RULES`), prices in `domain/pricing.ts` |
| Robot meta | `domain/robots.ts` (names, areas, unlocks, `robotForLevel`, `splitByUnlock`) |
| Conditions | `program/conditions.ts` (query) vs `robotConditions.ts` (worker) |
| Tickets | `domain/tickets.ts` (units, paper, sugar) |
| Scoring | `domain/scoring.ts` (blocks, stars, satisfaction, tables) |
| Constants | `domain/constants.ts` (limits, timings, drag tuning) |
| Narrative | `data/campaign/narrative.ts` (one row per shift) |
| Audio | `src/shared/audio-manifest.ts` (`SOUNDS`) |

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
- UI never calls the engine directly: `Workspace` drives runs through
  `useLiveRun`, which owns programs, role, result, and the clock.

## Saves

`features/campaign/save/`: `settings` (key, defaults, `newSave`), `validate`
(structural guards), `migration` (`parseSave`, legacy v1/v2 migration),
`progression` (drafts, completion), `io` (storage). Versions:

- **v1** — Act I flat drafts/solutions. Migrated: Query programs reset to
  starters, unlocks preserved past shift 14.
- **v2** — per-robot drafts. Migrated like v1 for Query; kitchen/floor kept.
- **v3** — current. `robotDrafts`/`robotSolutions` per shift and role.

The save layer takes a `LessonCatalog` parameter instead of importing data,
so validation stays testable without the campaign bundle.

## Where to add things

- **Shift L33**: one `LevelSeed` in `data/campaign/extension-seeds.ts` plus one
  `ShiftNarrative` row in `data/campaign/narrative.ts`. No code edits.
  Regenerate docs with `npm run docs:gen`.
- **Block**: one `BlockRegistry` entry (family/operands) plus the command in
  the compiler's `availableCommands` and interpreter dispatch — the registry
  is the discovery point; the language core stays explicit.
- **Drink** (e.g. matcha): one `RECIPE_RULES` entry in `domain/drinks.ts`
  plus `PRICES` in `domain/pricing.ts`.
- **Sound** (e.g. pour): one `SOUNDS` entry in `shared/audio-manifest.ts`,
  generate with `npm run gen:audio`, sync with `npm run audio:sync`. The id
  flows into the precache list and `npm run validate:data` automatically.

## Offline build

`vite/plugins/offline-cafe.ts` emits `sw.js` precaching `./`, `index.html`,
`icon.svg`, bundles, and every `SOUNDS` wav. `Vary: Origin` on static responses
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
