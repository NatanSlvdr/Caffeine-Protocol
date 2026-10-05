# Release playtest matrix

What a release of the café is played on, and what a person has to check by hand before it ships. The unit tests prove the simulation, the saves and the components; the browser tests in `tests/e2e/` prove the campaign can be played start to finish in real engines. Neither says the café looks right, reads well or feels good to play. That takes someone at the screen, so every release gets the pass below.

## Where the café is played

Desktop browsers and landscape tablets. Phones aren't supported: the routine editor and the café need the room side by side, and the layout fills the viewport's height instead of scrolling.

| Engine          | Browser it stands for          | Automated (Playwright project) | Played by hand    |
| --------------- | ------------------------------ | ------------------------------ | ----------------- |
| Chromium        | Chrome, Edge, Brave, Arc       | `chromium`, `chrome`           | Chrome on desktop |
| Chromium (Edge) | Microsoft Edge                 | `edge`, only with `TEST_EDGE`  | Edge on Windows   |
| Gecko           | Firefox                        | `firefox`                      | Firefox desktop   |
| WebKit          | Safari, and every iPad browser | `webkit`                       | Safari and iPad   |

Every project runs at 1280 × 720. The framing test also squeezes Special Delivery to 1100 × 720 and checks the editor, the café, the run button and Help all fit without the page scrolling sideways.

### Viewports

Play the release at each of these. They are the sizes the layout is tuned for, from a small landscape tablet to a full HD monitor.

| Size        | Stands for            | Watch for                                                                                                  |
| ----------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1180 × 820  | 11″ iPad in landscape | The narrow layout (`max-width: 1180px`); shorter panels under `max-height: 820px`; touch instead of hover. |
| 1280 × 800  | Small laptop          | The size the browser tests use, near enough. The editor and the café share the width.                      |
| 1512 × 982  | 14″ MacBook Pro       | The wide layout (`min-width: 1500px`) switches on here.                                                    |
| 1920 × 1080 | Desktop monitor       | Nothing stretches thin or floats in empty space.                                                           |

At each: the campaign page, a Query shift, a Brew or Porter shift, an Act IV shift with all three robots, the receipt, Settings and Help all fit the height without the page scrolling, and nothing is cut off.

## Input

| Input              | What has to work                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mouse and trackpad | Add blocks from the library, drag a block or a whole IF, FOR or FUNCTION group by its grip, drop it outside the code to remove it, scrub the replay timeline, and switch the camera between the full café and one robot.                                                                                     |
| Keyboard           | Ctrl/⌘ + Enter runs the service; Esc stops it, then leaves the shift. Ctrl/⌘ + Z undoes and Ctrl/⌘ + Shift + Z (or Ctrl + Y) redoes. Space lifts a block, the arrow keys move it and Space drops it; Esc cancels. Enter or Space advances dialogue. Every control is reachable with Tab and shows its focus. |
| Touch              | On a tablet the hover hints and keyboard badges are hidden. Tap to add blocks, press and drag to move them, and tap through dialogue. No control is too small to hit with a finger.                                                                                                                          |

## Offline

The production build is static and caches itself on its first successful load. The browser tests reload it offline, check the precache manifest covers every asset, and check an upgrade waits to be asked. By hand, on a deployed build:

1. Load the café once online and play into a shift.
2. Go offline (the browser's dev tools, or flight mode on a tablet) and reload. The café, its art, its music and the shift you were on come back.
3. Back online, deploy a new build and reload. The café offers the update rather than swapping it in mid-shift, and the save survives the update.

## Accessibility paths

Play a shift through each of these, start to finish.

- **Reduced motion.** With the system's reduce-motion setting on, and separately with **Settings → Reduced motion**, the extra animation stops, dialogue lines show whole, and nothing a player needs only happens in motion. With the system setting on, the Settings box shows it on and can't be turned off.
- **Dialogue text.** **Settings → Dialogue text** set to Typed, Quick and Whole lines: every line can be read in full before it moves on.
- **Text editor.** **Options → Text editor** in a shift shows the routine as code. Edits made there round-trip into blocks without losing anything.
- **Screen reader.** With VoiceOver (Safari) and NVDA (Firefox or Chrome): the selected shift is read when it changes; dragging a block says where it is and where it will land; a run says when it starts, pauses and finishes; the receipt reads its stars and targets; dialogue is read as it appears.
- **Shorter repeats.** **Settings → Shorter repeats** opens a shift you've worked on straight on the code and keeps reactions already heard to one line, and Help still replays the intro.
- **No graphics.** With WebGL turned off, or after the graphics drop out mid-shift, the editor, the validation messages and the run controls still work, and the café comes back when it can.
- **Zoom.** At 200% browser zoom on the 1920 × 1080 screen, nothing overlaps or is cut off.

## What the browser tests cover

`npm run test:e2e` runs these in every Playwright project. Run it before a release; it isn't part of the everyday checks.

| Spec                   | What it plays                                                                |
| ---------------------- | ---------------------------------------------------------------------------- |
| `campaign.spec.ts`     | Shift 3's intro, its worked example, and a three-star receipt.               |
| `framing.spec.ts`      | Special Delivery fitting at 1280 and 1100 wide, and Help opening.            |
| `nowebgl.spec.ts`      | The editor and validation without WebGL.                                     |
| `observation.spec.ts`  | The opening day: watching the service and its receipt.                       |
| `offline.spec.ts`      | Offline reloads, the precache manifest, and the offline upgrade.             |
| `robot-shifts.spec.ts` | A full service programmed for Brew and for Porter.                           |
| `settings.spec.ts`     | Settings persisting, the text editor round trip, and save import and export. |

## The release pass

Before each release, someone plays through the list below and fills in a row. A release ships when every row is signed off or has an issue filed against it.

| Check                                                    | Chrome | Firefox | Safari | iPad | Notes |
| -------------------------------------------------------- | ------ | ------- | ------ | ---- | ----- |
| Default checks and `npm run test:e2e` pass               |        |         |        |      |       |
| A new café, from the opening day to Shift 3's receipt    |        |         |        |      |       |
| One Brew shift and one Porter shift, to three stars      |        |         |        |      |       |
| An Act IV shift with all three robots                    |        |         |        |      |       |
| A failed run: the crew's reaction, the timeline, the fix |        |         |        |      |       |
| Every viewport above fits without scrolling              |        |         |        |      |       |
| Keyboard only, through one shift                         |        |         |        |      |       |
| Touch only, through one shift                            | n/a    | n/a     | n/a    |      |       |
| Offline reload and update                                |        |         |        |      |       |
| Each accessibility path                                  |        |         |        |      |       |
| Music and sound at the default volume, and muted         |        |         |        |      |       |
| Export a save, reset progress, import it back            |        |         |        |      |       |
