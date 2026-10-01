# Audio tools

`generate_audio.py` synthesizes every sound with the standard library only (no
dependencies, no samples, so nothing to license): the `cafe_loop.wav` lo-fi
jazz loop, the `cafe_room.wav` distant cups mixed under it, and the soft `click`,
`retry`, `serve`, `success` and `pour` one-shots. It writes `assets/audio/`
(the source of truth); `npm run audio:sync` copies the results plus the icon
into `public/` for serving. The id list is shared with the build in
`src/shared/audio-manifest.ts` and checked by `npm run validate:data`.

Regenerate with `npm run gen:audio && npm run audio:sync`. Playback lives in
`src/shared/lib/audio.ts`: the loops wait a moment after the first gesture and
fade in slowly; the room tone follows the music slider.
