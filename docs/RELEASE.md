# Release notes and credits

What ships in a release of Caffeine Protocol, who and what made it, how to play it, and what it doesn't do yet. The [release playtest matrix](PLAYTEST.md) says how a release is checked; this page is what goes out with it. `tests/unit/release-notes.test.ts` holds the version, the credits and the asset list here to what the repository actually ships.

## Version 1.0.0

The first release: the whole campaign, start to finish.

- **21 shifts** in a prologue and four acts ([ADR 005](adr/005-21-shifts.md)). The opening day is watched; from Shift 02 you program Query at the counter, from Shift 09 Brew in the kitchen, and from Shift 14 Porter on the floor. Act IV runs all three together.
- **Two ways to write a routine:** blocks you drag or move from the keyboard, and a text editor that round-trips with them.
- **Seeing what happened:** a replay timeline with the crew's events, pause marks on blocks, a robot inspector, the receipt's wait breakdown, and two runs of the same rounds side by side.
- **Help without spoilers first:** each shift's lesson, then hints one at a time, then a worked example; the crew react to a failed run and point at the block where the service stopped.
- **The café remembers:** stars and routines per shift, the regulars' guestbook, and a shelf of keepsakes for finishing each act.
- **Offline:** the build caches itself on its first load and offers updates instead of swapping them in mid-shift.
- **Accessibility:** reduced motion, dialogue text speed, shorter repeats, a screen-reader service summary, keyboard play throughout, and an editor that keeps working without WebGL.

## Controls

| Where          | Action                                      | Keys                                                                          |
| -------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Campaign       | Browse shifts, start the selected one       | <kbd>←</kbd> <kbd>→</kbd>, then <kbd>Enter</kbd> or a double-click            |
| Routine editor | Lift, move and drop a block                 | <kbd>Space</kbd>, arrow keys, <kbd>Space</kbd>                                |
| Routine editor | Put a lifted block back                     | <kbd>Esc</kbd>                                                                |
| Routine editor | Remove a block                              | <kbd>Delete</kbd> or <kbd>Backspace</kbd>                                     |
| Routine editor | Pick a block as the place new blocks go     | <kbd>Enter</kbd>                                                              |
| Routine editor | Put a pause mark on a block, or take it off | <kbd>F9</kbd>                                                                 |
| Routine editor | Undo, redo                                  | <kbd>Ctrl/⌘ + Z</kbd>, <kbd>Ctrl/⌘ + Shift + Z</kbd> (or <kbd>Ctrl + Y</kbd>) |
| Text editor    | Tidy the routine up by depth                | <kbd>Shift + Alt + F</kbd>                                                    |
| Shift          | Run the service                             | <kbd>Ctrl/⌘ + Enter</kbd>                                                     |
| Shift          | Stop and edit; with the café idle, leave    | <kbd>Esc</kbd>                                                                |
| Dialogue       | Next line                                   | <kbd>Enter</kbd> or <kbd>Space</kbd>                                          |
| Dialogue       | Move between a scene's buttons              | <kbd>Tab</kbd>, <kbd>Shift + Tab</kbd>                                        |

With a mouse: drag blocks from the library or by their grip, drop one outside the code to remove it, and scrub the replay timeline. On a tablet: tap to add a block, press and drag to move it, and tap through dialogue.

## Credits

Made by Natan. Much of the code was written with Claude, Anthropic's coding assistant, as the commits' co-author lines record.

The game runs on these open-source libraries, each under its own licence:

| Library            | Version | Licence | For                               |
| ------------------ | ------- | ------- | --------------------------------- |
| react              | 19.1.1  | MIT     | The interface                     |
| react-dom          | 19.1.1  | MIT     | The interface, in the browser     |
| three              | 0.180.0 | MIT     | The café in 3D                    |
| @react-three/fiber | 9.3.0   | MIT     | Three.js from React               |
| @react-three/drei  | 10.7.6  | MIT     | Three.js helpers                  |
| @dnd-kit/core      | 6.3.1   | MIT     | Dragging blocks                   |
| lucide-react       | 0.468.0 | ISC     | The interface's icons             |
| valibot            | 1.5.0   | MIT     | Checking saves and the shift data |

## Asset provenance

Where every piece of art and sound the game ships came from. The source files live in `assets/`; tools in `tools/` turn them into what the build loads.

| Asset                                                                                                                                       | Ships as                        | Made by                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Music: `cafe_loop`                                                                                                                          | `public/audio/cafe_loop.wav`    | Synthesized by `tools/audio/generate_audio.py` from the Python standard library alone: no samples, nothing to license.                                                                                   |
| The café, its furniture, the robots and the guests                                                                                          | Code in `src/components/cafe/`  | Drawn at run time from Three.js shapes and textures generated in code. No models or image textures are shipped.                                                                                          |
| Portraits: `albert`, `brew`, `dot`, `guest`, `juno`, `moka`, `niko`, `pip`, `porter`, `query`, `rosa`                                       | `src/assets/portraits/*/*.webp` | Generated with an image model from the prompts in [Portrait prompts](game_design/portrait_prompts.md), then trimmed and scaled by `tools/portraits.py`. **Which model, and its terms, aren't recorded.** |
| Cutscenes: `a-second-pair-of-hands`, `back-to-school`, `closing-time`, `ninety-two-degrees`, `the-floor-robot`, `the-keys`, `the-scrapyard` | `src/assets/cutscenes/*/*.webp` | Generated with an image model from the prompts in [Cutscene prompts](game_design/cutscene_prompts.md), then cropped and scaled by `tools/cutscenes.py`. **Which model, and its terms, aren't recorded.** |
| The app icon                                                                                                                                | `public/icon.png`               | Pixel art drawn after the café's robot model. **Who made it isn't recorded.**                                                                                                                            |
| Interface icons                                                                                                                             | Code, from lucide-react         | Lucide, ISC licence.                                                                                                                                                                                     |

Before a release, fill in the three gaps in bold: name the image model and the terms its output is used under, and who made the icon.

## Known limitations

- **No phones.** The café is made for desktop browsers and landscape tablets; the routine editor and the café need the room side by side.
- **Saves stay in one browser.** Progress lives in the browser's storage on one device. Clearing the site's data clears the café, so move or keep it with **Settings → Export café** and import it back.
- **English only.** Every line of the game is written in English, and there is no way to switch.
- **No typeface ships.** The interface uses Inter where it is installed and the system's sans-serif font elsewhere, so it looks a little different from one computer to the next.
- **No licence for the code yet.** The repository has no licence file, so its terms are unstated.
- **No optional challenges or practice mode.** Every shift is part of the campaign; replaying one for more stars is the only extra goal ([roadmap](ROADMAP.md) C11, C12, F09–F12).
- **No screenshots in this page.** Captures are made only when a release asks for browser work.
