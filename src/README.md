# src

- `App.tsx` — shell composer only (`GameProvider` + route screens).
- `main.tsx` — React mount, one stylesheet import, service-worker register.
- `audio.ts` — backwards-compatible audio entry (service: `shared/lib/audio`).
- `app/` — hash routing (`navigation`, `useHashRoute`) and `SettingsWindow`.
- `shell/` — header, rail, home/campaign/story pages.
- `state/` — `GameStore`: persisted save, route, campaign actions, selectors.
- `shared/domain/` conceptually is `domain/` (see `docs/ARCHITECTURE.md`):
  simulation language/runtime, layout, tickets, scoring, registries.
- `shared/lib/` — `audio` service, `download`, `format`, `navigation`.
- `shared/ui/` — `Modal`, `SceneBoundary`, `AutoHeight`, `Button`, `SettingRow`.
- `components/` — presentation: `editor/`, `cafe/`, `street/`, `selects/`,
  `robots/`, `thumbnails/`, orders, feedback, and the `Editor`/`Cafe` shells.
- `features/` — behavior: `workspace/` (live runs, playback, modals),
  `campaign/save/` (settings, validation, migration, progression, io).
- `data/` — campaign sources: split JSON (`campaign/`), generated extension
  shifts, narrative, schema-validated loader.
- `hooks/` — shared interaction hooks (drag, collision, anchors, textures).
- `styles/` — `tokens.css`, `base.css`, `themes/playful.css` via `index.css`.
