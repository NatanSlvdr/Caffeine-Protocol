# ADR 001: 32 shifts from split campaign sources

- Status: accepted
- Date: 2026-09-18

## Context

The campaign grew from 14 authored shifts (Act I, Query) to 32 (Acts II–IV,
Brew and Porter) by generating L15–L32 from seeds. `campaign.json` held Act I
while `extension.ts` held titles, notes, omissions, and targets in parallel
positional arrays, and `shiftBriefs.ts` held a third copy of the story beats.

## Decision

- Act I lives in `src/data/campaign/levels/L01.json…L14.json`,
  `lessons/L01.json…L14.json`, plus `manifest.json` (canonical order).
- A valibot `load.ts` validates every file (`safeParse`, no casts) and exports
  typed `levels`/`lessons` plus `lessonById` (keyed by `id`, never by index).
- Extension shifts derive from `extension-seeds.ts: LevelSeed[]`
  (`{id,title,note,omission,blocks,instructions}`) and a deterministic
  `extensionCustomers` generator.
- Story, objective, lesson note, and interludes merge into
  `data/campaign/narrative.ts` (one row per shift).

## Consequences

Adding L33 is one seed plus one narrative row. `npm run validate:data` runs
in the build; `npm run docs:gen` regenerates `docs/campaign/`.
