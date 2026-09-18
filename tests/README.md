# tests

- `setup.ts` — global DOM/storage isolation (runs for every unit file).
- `helpers/` — shared builders, not assertions: `saves` (fresh saves,
  storage seeding), `run` (reference programs, live-run completion,
  single-seed service runs), `query` (one-shot customer execution),
  `customers` (Act I coffee/tea/request fixtures), `editorHarness.tsx`
  (stateful editor, static props, operand chooser, source reader).
- `unit/simulation/` — engine behavior: campaign parity, query language,
  service reference/runtime, live runs, tickets, variables, handoffs,
  playback, street, layout.
- `unit/persistence/` — save round-trips, migration (v1/v2 → v3), malformed
  rejection, storage adapters.
- `unit/editor/` — visual editor interactions, execution feedback, drag
  placement, full `App` workspace lifecycle.
- `unit/components/` — speech bubbles and holding display.
- `fixtures/` — the unreferenced golden replay snapshot (archaeology only).
- `e2e/helpers.ts` + `e2e/specs/` — Playwright flows against `preview`:
  observation, campaign win, robot shifts (Brew/Porter), settings,
  framing, offline reload, no-WebGL fallback.

Run `npm test` (unit, jsdom) and `npm run test:e2e` (builds first via
`pretest:e2e`, then Chromium/Firefox/WebKit/Chrome).
