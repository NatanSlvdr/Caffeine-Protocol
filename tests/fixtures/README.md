# Test fixtures

`reference-results.json` (671K) is a golden replay snapshot (`average_satisfaction`
plus per-event customer/passed/satisfaction/timing records). It is kept here for
manual result archaeology; no automated test reads it. Do not add new
unreferenced fixtures — prefer small, intention-revealing helpers in
`tests/helpers/` instead.

`save-v1.json` / `save-v2.json` are the exception: real historical payloads
(reconstructed from `migration.ts` + git history, not `newSave()` with a flipped
version) pinned by `tests/unit/persistence/save-fixtures.test.ts`. They prove
`parseSave` stays compatible with actual serialized history across Query syntax
changes (retired `TICKET`/`SUBMIT`/`CHARGE ORDER`/`EACH`/`READ`/`SUGAR`,
`BATTERY`/`CHARGE` floor routines, pre-`pixel_art` settings).
