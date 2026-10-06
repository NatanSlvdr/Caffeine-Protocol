# Audio tools

`generate_audio.py` synthesizes the game's only sound, the `cafe_loop.wav` lo-fi
jazz loop, with the standard library only (no dependencies, no samples, so
nothing to license). There are no sound effects or room tone: the music alone
carries the café's ambiance. It writes `assets/audio/` (the source of truth);
`npm run audio:sync` copies the result plus the icon into `public/` for serving.
The id list is shared with the build in `src/shared/audio-manifest.ts` and
checked by `npm run validate:data`.

Regenerate with `npm run gen:audio && npm run audio:sync`. Playback lives in
`src/shared/lib/audio.ts`: the music waits a moment after the first gesture and
fades in slowly.

The loop is voiced for the place on screen instead of being arranged again
(`MusicMood`, held with `useMusicMood`): as recorded in the café, an old record
in a memory (320 Hz to 2.6 kHz, a little softer), and the café heard through
the wall in the repair bay and at closing time (below 900 Hz, softer still).
Two filters and a gain after the volume slider glide between moods over a few
seconds. Each further recording would add about 2.2 MiB to a build budgeted at
16 MiB, so the single loop stays until the music can ship compressed.
