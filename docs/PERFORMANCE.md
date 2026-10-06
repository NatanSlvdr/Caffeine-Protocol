# Performance

What the café costs to load and to run, measured before anything is optimized, and the budgets held from those measurements. Re-measure when a budget is near, and before raising one.

## Measured

On 2026-10-05, from the build of commit `60502748`, on an Apple M4 Pro with Node 24.

### Startup payload

`npm run build` prints the size of every file. What matters at startup is what `index.html` loads or preloads before the café can draw:

| File               | Size     | Gzipped     |
| ------------------ | -------- | ----------- |
| `index-*.js` (app) | 506 KiB  | 164 KiB     |
| `cafe-3d-*.js`     | 1045 KiB | 289 KiB     |
| `index-*.css`      | 126 KiB  | 25 KiB      |
| **Startup**        |          | **480 KiB** |

By 2026-10-06 the features added since had brought the startup to 538 KiB, two short of the budget. The shift's screen (the editor, playback and receipt, with the special's and the memory's wrappers) moved out of startup into a chunk of its own (`app/screens.tsx`), fetched once the page is idle, so a shift opened from the rail draws at once. Only a shift opened straight from its address, before that chunk has arrived, shows “Opening the shift…” for a moment. From the build after commit `5b63e632`:

| File               | Size     | Gzipped     |
| ------------------ | -------- | ----------- |
| `index-*.js` (app) | 499 KiB  | 160 KiB     |
| `cafe-3d-*.js`     | 1072 KiB | 299 KiB     |
| `index-*.css`      | 165 KiB  | 32 KiB      |
| **Startup**        |          | **478 KiB** |
| `Workspace-*.js`   | 185 KiB  | 64 KiB      |

The 3D chunk is preloaded because the front door already shows the café. The rest of the build loads as it's needed: 77 WebP stills and portraits (10.0 MiB) as their scenes open, and the music (2.2 MiB WAV) once the player starts it. The offline worker stores the whole build, 14.1 MiB, in the background on the first visit, so a first visit on a slow connection pays for it once.

### Simulating a service

Pressing Run simulates every round of the shift before the café starts playing it back, so this is the wait between the press and the service starting. The quickest of several runs of each shift's reference routines:

| Shifts                    | Per service | Steps run |
| ------------------------- | ----------- | --------- |
| 02–08 (Query)             | 1–8 ms      | 6–372     |
| 09–15 (Brew, then Porter) | 2–6 ms      | 192–696   |
| 16–21 (the whole crew)    | 10–17 ms    | 1368–3066 |

The worst case is a routine that never finishes. A robot spinning in a loop on shift 21 runs until the step limit stops it: Brew alone takes 22 ms, Porter alone 29 ms, and both together 27 ms (each robot stops at its own limit). A robot waiting for something that never comes stops sooner, about 2 ms.

The longest routines the editor takes, 512 blocks each for Brew and Porter on shift 21, compile in under 1 ms and serve in 39 ms. Checking a routine as it's typed (`compileRobot`) and the block preview's dry run of one round both stay well under a frame's worth of work, so neither moves to a worker: the extra message protocol would cost more than the work it moves.

### Memory held by runs

Measured in Node with `--expose-gc` on 2026-10-05, from the heap after a collection. A finished run carries every robot's step-by-step events, which the café plays back, follows and inspects: 96–98% of the run. A service on shifts 3–8 takes about 1.0–1.8 MiB serialized (2.6 MiB on the heap for shift 8), shifts 16–21 take 1.8–2.8 MiB (4.1 MiB on the heap for shift 21), and a robot spinning to the step limit 3.6 MiB.

A shift keeps its last 12 runs to compare (`RUN_HISTORY`). Kept in full, those held 49 MiB on shift 21 and 31 MiB on shift 8. Only the newest run is ever played back, though; an older one is only compared and named. So once a newer run is kept, an older one lets go of its step-by-step events and keeps its outcome, numbers, guests and round lengths (`keepRecord`). Twelve runs on shift 21 now hold 6.5 MiB: the newest in full and about 0.2 MiB for each of the others.

Running 100 more services on top of those, the heap stays where it was, and dropping the kept runs gives it all back: repeated runs don't leak. Undo history is bounded too, at 100 routines a robot (`HISTORY_LIMIT`).

## Budgets

| What                                | Budget                 | Measured            | Held by                                                  |
| ----------------------------------- | ---------------------- | ------------------- | -------------------------------------------------------- |
| Startup scripts and styles, gzipped | 540 KiB                | 486 KiB             | `tools/size-check.mjs`, the last step of `npm run build` |
| The whole build                     | 16 MiB                 | 14.1 MiB            | `tools/size-check.mjs`                                   |
| One service, any shift, worst case  | 250 ms                 | 39 ms               | `tests/unit/simulation/service-time.test.ts`             |
| Runs a shift keeps                  | 12, the newest in full | 6.5 MiB on shift 21 | `keepRecord`; `compare-runs.test.ts`                     |

The size budgets leave about an eighth for growth. The service budget is over six times the worst measured, which allows for a slower laptop or tablet and a busy test runner, and still starts a service with no wait anyone would notice.

## Not measured yet

These need the game running in a browser on the devices in the [playtest matrix](PLAYTEST.md), so they belong to the release pass, not to the unit tests:

- **Readiness:** time from opening the page to the front door's café drawing, cold and from the offline cache.
- **Frame time:** playback of an Act IV service at 1× and the fastest speed, on the iPad and on a desktop, with the pixel-art shader on and off. The browser's performance panel records it.
- **Memory:** the page's memory after playing several services in a row and coming back to the campaign, to check that the 3D scene is released. The runs themselves are measured above.

A budget for each follows its first measurement. Until then, [T06](ROADMAP.md) (graphics quality controls) and [T07](ROADMAP.md) (loading cost) wait on them.
