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

The 3D chunk is preloaded because the front door already shows the café. The rest of the build loads as it's needed: 77 WebP stills and portraits (10.0 MiB) as their scenes open, and the music (2.2 MiB WAV) once the player starts it. The offline worker stores the whole build, 14.1 MiB, in the background on the first visit, so a first visit on a slow connection pays for it once.

### Simulating a service

Pressing Run simulates every round of the shift before the café starts playing it back, so this is the wait between the press and the service starting. The quickest of several runs of each shift's reference routines:

| Shifts                    | Per service | Steps run |
| ------------------------- | ----------- | --------- |
| 02–08 (Query)             | 1–8 ms      | 6–372     |
| 09–15 (Brew, then Porter) | 2–6 ms      | 192–696   |
| 16–21 (the whole crew)    | 10–17 ms    | 1368–3066 |

The worst case is a routine that never finishes. A robot spinning in a loop on shift 21 runs until the step limit stops it: Brew alone takes 22 ms, Porter alone 29 ms, and both together 27 ms (each robot stops at its own limit). A robot waiting for something that never comes stops sooner, about 2 ms.

## Budgets

| What                                | Budget  | Measured | Held by                                                  |
| ----------------------------------- | ------- | -------- | -------------------------------------------------------- |
| Startup scripts and styles, gzipped | 540 KiB | 480 KiB  | `tools/size-check.mjs`, the last step of `npm run build` |
| The whole build                     | 16 MiB  | 14.1 MiB | `tools/size-check.mjs`                                   |
| One service, any shift, worst case  | 250 ms  | 30 ms    | `tests/unit/simulation/service-time.test.ts`             |

The size budgets leave about an eighth for growth. The service budget is eight times the worst measured, which allows for a slower laptop or tablet and a busy test runner, and still starts a service with no wait anyone would notice.

## Not measured yet

These need the game running in a browser on the devices in the [playtest matrix](PLAYTEST.md), so they belong to the release pass, not to the unit tests:

- **Readiness:** time from opening the page to the front door's café drawing, cold and from the offline cache.
- **Frame time:** playback of an Act IV service at 1× and the fastest speed, on the iPad and on a desktop, with the pixel-art shader on and off. The browser's performance panel records it.
- **Memory:** the page's memory after playing several services in a row and coming back to the campaign, to check that replays and the 3D scene are released.

A budget for each follows its first measurement. Until then, [T06](ROADMAP.md) (graphics quality controls) and [T07](ROADMAP.md) (loading cost) wait on them.
