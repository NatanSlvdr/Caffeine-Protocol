# Audio tools

`generate_audio.py` synthesizes the soundtrack and effects with the standard
library only (no dependencies): `morning_loop.wav` plus `click`, `retry`,
`serve`, and `success` one-shots. It writes `assets/audio/` (the
source of truth); `npm run audio:sync` copies the results plus the icon into
`public/` for serving. The id list is shared with the build in
`src/shared/audio-manifest.ts` and checked by `npm run validate:data`.
