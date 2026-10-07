# Release notes and credits

What ships in a release of Caffeine Protocol, who and what made it, how to play it, and what it doesn't do yet. The [release playtest matrix](PLAYTEST.md) says how a release is checked; this page is what goes out with it. `tests/unit/release-notes.test.ts` holds the version, the credits and the asset list here to what the repository actually ships.

## Version 1.0.0

The first release: the whole campaign, start to finish.

- **21 shifts** in a prologue and four acts ([ADR 005](adr/005-21-shifts.md)). The opening day is watched; from Shift 02 you program Query at the counter, from Shift 09 Brew in the kitchen, and from Shift 14 Porter on the floor. Act IV runs all three together.
- **Two ways to write a routine:** blocks you drag or move from the keyboard, and a text editor that round-trips with them. A routine notebook keeps the ones worth keeping under a name, to bring back on any shift, and travels as a file. A page can be written up as a lesson, with notes on its blocks, and exported as plain text to share.
- **Seeing what happened:** a replay timeline with the crew's events, pause marks on blocks, a robot inspector, the receipt's wait breakdown, and two runs of the same rounds side by side.
- **A test bench:** write guests of your own for a shift, from what its guests ask for and when they come in, and run your routines on them for no stars. The café works out what each guest should get, and a bench that trips stops on the guest and the block, as a service does. On the shifts with a rule to ease, the bench can ease it (twice the cups, one drink a trip, no closing time) to practise one thing at a time, and says so wherever the run shows.
- **Cafés of your own:** keep up to eight cafés in one browser, each its own playthrough with its own progress, routines and settings, named as you like and opened from Settings. A café from before there could be several is the first, untouched; an import can come in as a new café instead of replacing one. The routine notebook is shared by them all.
- **Specials, after the campaign:** the regulars ask for optional shifts past the last, each with one new rule. Rosa's reading group orders for the table, and every table gets its drinks together, within four seconds. Dot's knitting circle wants every cup hot: a drink keeps warm twenty seconds at pickup, Porter's inspector counts each one down, and the way through is serving the next drink before clearing the last cup. A special opens on your own Shift 21 routines and keeps its stars apart from the campaign's.
- **Plan the Saturday menu:** Mr. Albert's special is a choice of three menu cards, side by side before any is served: a tea table with four cups, an espresso bar in a rush, and a hatch with lids and a closing call. Each card says what it brings and has its own targets, and a routine cut to the card earns its stars.
- **The Long Day:** Juno's whole year revises at the café through exam week, in six waves from eight to six, each one asking for everything the ones before it did and one thing more. One set of routines serves the day: change them between waves, stop after any wave, and carry on later from the next, even after closing the tab. Each wave keeps its own stars, and the board shows the furthest wave served.
- **Memories of Lou's café:** once Act I is served, play Query's first morning at Lou's, two winters ago, with the tools of its day and Lou's own routine to mend. It keeps its own stars and never touches your café's routines.
- **The repair bay:** as the shifts go on, each robot comes to the bench in the back room with its scrapyard wiring. Wire its sensors to its actions until every worked case comes out right, and the panel closes on a scene and a small mend that stays with the robot. Optional, and apart from the stars.
- **Photo mode:** hold the café still with the routines put away, frame the whole café, the counter, the kitchen or the dining room, and save it as a print captioned with the shift and the moment of service. Leaving puts the service back as it was.
- **A say in the story:** twice, Niko's answer is yours to pick: whose café it is, and whose hot chocolate. Each gets a reaction on the spot and is remembered in a later scene, and neither is scored or locks anything.
- **Help without spoilers first:** each shift's lesson, then hints one at a time, then a worked example; the crew react to a failed run and point at the block where the service stopped.
- **Drills, away from the rail:** a dozen gaps in served shifts' routines, each with a few passages to fill it with, ten moments paused mid-service where you call which block runs next, and five limited kits where you build a passage without the block you'd reach for (two Ifs for an Else, a Jump for an Else, a function written out). The café itself plays every pick out, so the verdict is the café's and never an answer key's. Six flights play the drills on one idea one after another. One got right on the first pick is ticked, apart from the stars. Help names a drill when a run fails the way its idea is missed.
- **The café remembers:** stars and routines per shift, the optional challenges met on the later shifts, four regulars who come back for their usual and are greeted by name at the counter, their guestbook, a shelf of keepsakes for finishing each act and more, the cushions and print the café picks from the looks each act brings, and a café that is put back together as the story goes, from the sidewalk board to Lou's postcard on the wall.
- **Music for the place:** the café's one lo-fi loop plays as recorded in the café, like an old record in a memory of Lou's, and through the wall in the repair bay and at closing time, gliding from one to the next.
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
| Dialogue       | Back to the line before                     | <kbd>←</kbd>                                                                  |
| Dialogue       | Move between a scene's buttons              | <kbd>Tab</kbd>, <kbd>Shift + Tab</kbd>                                        |

With a mouse: drag a block from the library or within the routine (a group by its first block), drop one outside the code to remove it, and scrub the replay timeline. On a tablet: tap to add a block, rest a finger on one until it rises and then drag it, swipe to scroll a long routine, and tap through dialogue.

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
- **Saves stay in one browser.** Progress lives in the browser's storage on one device. Clearing the site's data clears every café in it, so move or keep one with **Settings → Export café** and import it back.
- **French, in part.** **Settings → Language** offers French for the front door, the order rail, the controls on a shift's screen and every window it opens (options, restore, help, receipt, notebook, test bench and compare), the failure and handover cards under the routine, the robot inspector and tabs while the service is paused, the replay timeline and the card that follows an order, the note beside a block's preview, the house settings and the handbook, for every café in the browser. The rest of a shift, the rail's windows, the story and the shift names are still in English, and the blocks and the text editor read the same in both.
- **No typeface ships.** The interface uses Inter where it is installed and the system's sans-serif font elsewhere, so it looks a little different from one computer to the next.
- **No licence for the code yet.** The repository has no licence file, so its terms are unstated.
- **No screenshots in this page.** Captures are made only when a release asks for browser work.
