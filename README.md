# Caffeine Protocol

A browser-based café programming campaign with 21 shifts: one observation shift, seven Query puzzles (Act I), five Brew kitchen shifts (Act II), three Porter floor shifts (Act III), and five shifts where all three robots run the café together (Act IV). The game is built with React, TypeScript, Vite, and Three.js; the [documentation map](docs/README.md) lists what describes it.

## Run locally

Requires a current Node.js release with npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The production build is fully static and supports offline reloads after its first successful load.

## Play

1. Choose a shift on the **Campaign** screen. The first shift is watch-only: Niko, Moka and Pip serve it by hand. Watch the whole service to unlock the next shift.
2. From shift 2, add and arrange blocks in Query's routine. Choosing a library block appends it to the end of the routine; drag a block (or its grip) to a drop position to move a complete branch, loop, or function. IF, FOR, and FUNCTION blocks automatically include their matching END. **Undo** and **Redo** (Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z) step through each robot's edits, resets, and applied examples.
3. Select **Run service** (Ctrl/⌘ + Enter) to run the routine against each of the shift's seeds, its fixed lines of customers. Every seed must pass before the next shift unlocks. **Esc** stops a run.
4. Use the café toolbar to stop, pause, and change playback speed. From shift 9, program Brew's kitchen routines; from shift 14, Porter's floor routines.
5. **Help** explains the lesson and provides a worked example. **Options** contains the workspace pixel-art shader, text-editor toggle, and routine reset; sound, display, save import/export, and progress-reset controls live in **Settings**.

One star rewards correctness, two reward the block target, and three add the executed-step target. Progress, routines, and settings are stored in the browser. Save files can be exported and imported from **Settings**.

## Campaign and scope

Act I introduces listening, conditional branches, positions and jumps, sugar and negation, multiple orders, numeric sugar counts, and ambiguity and clarification. Act II adds kitchen recipes, functions, and batching with Brew; Act III adds table service, clearing, and a two-drink tray with Porter. Act IV runs all three robots together, and each shift brings an odd rule that one robot can't handle alone. The shift-by-shift reasoning is in [ADR 005](docs/adr/005-21-shifts.md).

Query takes orders from shift 2; Brew takes over the kitchen at shift 9; Porter takes over the floor at shift 14. Moka handles the kitchen and Pip handles the floor automatically until you program those roles. Customers progress through order intake, preparation, delivery, departure, and cleaning. Deterministic station and table reservations produce lifecycle timestamps and individual satisfaction. Tables increase from 2 to a full room of 16 across the campaign. The generated shift table lives in `docs/campaign/` (`npm run docs:gen`).

The [improvement roadmap](docs/ROADMAP.md) proposes prioritized milestones for debugging, editing, campaign design, presentation, accessibility, and release preparation.

## Project structure

- `src/` contains the React application, simulation, editor, and campaign data.
- `public/` contains static audio and icon assets shipped with the game.
- `tests/` contains unit, parity, and browser end-to-end tests.
- `docs/README.md` maps the documentation: which design notes are current and which are historical.
- `docs/game_design/` contains the original design specification and implementation history.
- `assets/` retains the original source art and audio used during development.

## Verification

Run the checks from the project root:

```sh
npm run typecheck
npx eslint src tests
npm run knip
npm run validate:data
npm test
```

`npm run build` makes the production build. `npm run test:e2e` builds first and then drives Chrome through Playwright. It is the slowest suite.

Generated dependencies, build output, test reports, screenshots, caches, and local environment files are intentionally excluded from Git.
