# ADR 003: Audio asset sync

- Status: accepted
- Date: 2026-09-18

## Context

Sound files existed in both `assets/audio/` and `public/audio/`, the
precache list in `vite.config.ts` named them by hand, and the generator
lived under `scripts/art/`.

## Decision

- `tools/audio/generate_audio.py` (stdlib only) writes `assets/audio/`, the
  source of truth.
- `npm run audio:sync` copies wavs plus the icon into `public/`.
- `src/shared/audio-manifest.ts` (`SOUNDS`) is the single id list: the
  `AudioService`, the offline precache plugin, and `npm run validate:data`
  all read it.

## Consequences

Adding a sound is one manifest entry plus generation; a missing or stale
shipped file fails the build-time validation (`npm run validate:data`
hash-compares every manifest sound plus the icon, and `prebuild` runs
`audio:sync --check`; heal with `npm run audio:sync`).
