# Caffeine Protocol

A browser-based café programming campaign with 32 shifts: two observation shifts, twelve Query puzzles (Act I), eight Brew kitchen shifts (Act II), eight Porter floor shifts (Act III), and two full-café finales (Act IV). The game is built with React, TypeScript, Vite, and Three.js from the design documents in `docs/game_design/`.

## Run locally

Requires a current Node.js release with npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The production build is fully static and supports offline reloads after its first successful load.

## Play

1. Choose a shift on the **Campaign** screen. The first two shifts use an automatic-service block; observe the complete service to unlock the next shift.
2. From shift 3, add and arrange instructions in the program workspace. Blocks insert after the selected block; drag a block's grip to move a complete branch, loop, or function. IF, FOR, and FUNCTION blocks automatically include their matching END.
3. Select **Run service** (Ctrl/⌘ + Enter) to validate every required seed. Every seed must pass before the next shift unlocks.
4. Use the café toolbar to stop, pause, and change playback speed. From shift 15, program Brew's kitchen routines; from shift 23, Porter's floor routines.
5. **Help** explains the lesson and provides a worked example. **Options** contains display and editor controls; sound, save import/export, and progress-reset controls live in **Settings**.

One star rewards correctness, two reward the block target, and three add the executed-step target. Progress, programs, story interludes, and settings are stored in the browser. Save files can be exported and imported from **Options**.

## Campaign and scope

Act I introduces listening, conditional branches, positions and jumps, multiple orders, typed sugar variables, functions with local variables and a heard-order parameter, ambiguity and clarification, numeric sugar counts, refactoring, and final certification. Act II adds kitchen recipes, functions, and batching with Brew; Act III adds table service and clearing with Porter; Act IV runs all three robots together.

Query takes orders from shift 3; Brew takes over the kitchen at shift 15; Porter takes over the floor at shift 23. Moka handles the kitchen and Pip handles the floor automatically until you program those roles. Customers progress through order intake, preparation, delivery, departure, and cleaning. Deterministic station and table reservations produce lifecycle timestamps and individual satisfaction. Tables increase from 2 to a full room of 16 across the campaign. The generated shift table lives in `docs/campaign/` (`npm run docs:gen`).

## Project structure

- `src/` contains the React application, simulation, editor, and campaign data.
- `public/` contains static audio and icon assets shipped with the game.
- `tests/` contains unit, parity, and browser end-to-end tests.
- `docs/game_design/` contains the original design specification and implementation history.
- `assets/` retains the original source art and audio used during development.

## Verification

Run the focused test suite and production build from the project root:

```sh
npm test
npm run build
npm run test:e2e
```

Generated dependencies, build output, test reports, screenshots, caches, and local environment files are intentionally excluded from Git.
