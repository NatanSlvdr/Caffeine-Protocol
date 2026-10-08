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

| Input              | What has to work                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mouse and trackpad | Add blocks from the library, drag a block or a whole IF, FOR or FUNCTION group by its grip, drop it outside the code to remove it, scrub the replay timeline, and switch the camera between the full café and one robot.                                                                                                                                            |
| Keyboard           | Ctrl/⌘ + Enter runs the service; Esc stops it, then leaves the shift. Ctrl/⌘ + Z undoes and Ctrl/⌘ + Shift + Z (or Ctrl + Y) redoes. Space lifts a block, the arrow keys move it and Space drops it; Esc cancels. Enter or Space advances dialogue. Every control is reachable with Tab and shows its focus.                                                        |
| Touch              | On a tablet the hover hints and keyboard badges are hidden. Tap to add blocks; rest a finger on one until it rises, then drag it; a quick swipe over the blocks scrolls a long routine instead of dragging. A block's number field shows Done on the keyboard, and Done puts the keyboard away. Tap through dialogue. No control is too small to hit with a finger. |

## Offline

The production build is static and caches itself on its first successful load. The browser tests reload it offline, check the precache manifest covers every asset, and check an upgrade waits to be asked. By hand, on a deployed build:

1. Load the café once online and play into a shift.
2. Go offline (the browser's dev tools, or flight mode on a tablet) and reload. The café, its art, its music and the shift you were on come back.
3. Back online, deploy a new build and reload. The café offers the update rather than swapping it in mid-shift, and the save survives the update.

## Routine notebook

1. On a shift, open **Notebook**, keep the open routine under a name, then change the routine and bring the page back with **Use this page**. Undo brings the change back.
2. On an earlier shift, open the notebook: a page with blocks that shift doesn't have says so, and can't be used. A page kept for another robot says which blocks the open one doesn't know.
3. Export the notebook, clear the site data, and import the file: every page comes back. Import it again: nothing is added twice.
4. Start this café over from Settings: the notebook is still there.
5. On a page, choose **Write a lesson**: say what it shows, add notes to a few blocks out of order, and check they number from the top. Export the lesson and open the text file: the routine reads with the noted blocks marked, then the notes in order, and says from which shift it can be typed in.

## Test bench

1. On Shift 04, open **Test bench**, start from a round, remove guests and add one: what each should get changes with what they ask for. Run the bench: it earns no stars, and a slip stops on the guest as a service does.
2. On Shift 18, the bench offers **Twice the cups**. With Brew's washing taken out, a bench of eight guests runs out of cups; eased, it goes right, and the toolbar, the card and the run's name in Compare runs all say it was eased. Shift 21 offers the cups and no closing time; Shift 04 offers nothing to ease.

## Story choices

1. Watch _The Scrapyard_ up to Query asking who its new operator is. Enter does nothing there; pick an answer with its number key: Niko says it, and Query answers. Skip the rest of the scene.
2. Watch it again from the rail: the answer given is marked “Said last time”. Pick the other one, then go back a line with ←: it is marked “Said this time”, and Next goes on with it.
3. Watch _A Second Pair of Hands_: Query remembers the answer. With a café that skipped the choice, the scene plays as it always did.

## Specials

1. Before the campaign is finished, the campaign page has no **Specials** button, and `#/special/together` opens the front page instead.
2. With the campaign finished, open **Specials**: Bound Together is new, asked for by Rosa. Serve it: it opens on the routines Shift 21 was served with, and the breadcrumb reads Special.
3. Run Shift 21's routines as they are: Query is caught out on the first table that orders together. Add the Together mark only: the table's drinks reach it apart, and the card says where the late one is.
4. Serve it: the receipt counts the tables served together and how close their drinks came, carries Rosa's thanks, and goes back to the campaign. The campaign's stars are unchanged, and the Specials window shows the special's own.
5. While It's Hot is second on the board, asked for by Dot. Run Shift 21's routines as they are: a drink goes cold at pickup while Porter clears a used cup, and the card says how long it sat. Pause mid-service and open Porter: **Keeping warm** lists each drink, where it is and its seconds left. Have Porter serve each drink before clearing the cup before it, and serve again for three stars.
6. The Last of the Tea is third, asked for by Juno. Run Shift 21's routines as they are: Query writes down a tea after the tin is empty, and the card says it is sold out. Add `OR soldout IN CUSTOMER SPEECH` to the condition that asks about mumbles and serve for three stars: one guest has a coffee instead, another gets no ticket. Open **Test bench**: each guest has a choice of whether their drink is in, and a sold-out guest who goes without shows no ticket.
7. The Engineer's Visit is fourth, asked for by Mr. Albert. Run Shift 21's routines as they are: once the grinder goes out at 1:30, Brew grinds coffee that came pre-ground, and the card says when the grinder is back. Pause during the visit and open Brew: it holds **Pre-ground coffee**. Add `AND preground NOT IN CUSTOMER SPEECH` to Brew's coffee check and serve for three stars; coffee taken up after 4:30 is ground again.
8. One Socket is fifth, asked for by Rosa. Run Shift 21's routines as they are: Brew is back at the coffee machine while the dishwasher runs, the fuse goes, and the card names the wash that had the power and when it would have finished. Pause mid-wash and open Brew: **Socket** says the dishwasher, its cups and its seconds left. Move Brew's Use up at the sink from after pickup to just after the brew and serve for three stars.
9. The Saturday Market is on the board too, asked for by Mr. Albert, with "0 of 3 menus served". **Plan the menu**: three cards side by side, each with what is on the board, who comes, the rule and its targets. **All specials** goes back with focus on the menu's button.
10. Serve the Tea Table on Shift 21's routines as they are: every guest is served, over the block target. Cut what a tea-only morning never needs and serve again for three stars. The breadcrumb reads Menu card, and the board then counts "1 of 3 menus served".
11. The Long Day is last on the board, asked for by Juno, with "6 waves". **Start the day**: wave 1 opens on Shift 21's routines, the breadcrumb reads "Wave 1 of 6", and the receipt names what the next wave brings, with **Next wave** and **Stop for now**.
12. Stop after a wave and close the tab. Open the board again: it shows the best wave and **Carry on: wave N**, which opens the next wave with the routines as you left them. Carry Shift 21's routines on to wave 5: the first table that orders together catches Query out. **Start over** goes back to wave 1 with the stars kept.

## Memories

1. Before Shift 08 is served, the campaign page has no **Memories** button, and `#/memory/day-one` opens the front page instead.
2. With Act I served, open **Memories**: Day One is new, from Query's log, with Shift 5's tools. Play it: the café is in faded photo colours, the breadcrumb reads Memory, and Query's routine is Lou's, not yours. No block past Shift 5's is offered.
3. Run Lou's routine: her three regulars are right, and the first baker's "coffee no sugar" is caught. Mend the coffee side in place: it passes, over the block target. Write the steps once after the End: every star.
4. Back on the rail, Shift 05's routine and stars are as you left them, and the Memories window shows the memory's own stars.

## Repair bay

1. Before Shift 05 is served, the campaign page has no **Repair bay** button. With it served, the bay opens on Query's ears, on the bench and new, and says two more robots are to come.
2. Open the panel: the wiring is the scrapyard's, two of six cases are right, and **Close the panel** waits. Change a wire: the cases, their ticks and the count follow at once. **Start over** puts the scrapyard's wiring back.
3. Mend it (coffee when it doesn't hear tea, tea when it does, sugar when it hears sugar and no "no"): **Close the panel** plays Query's scene, and **Back to the rail** returns focus to the bay's button. The card now says Mended with the brass clip, and offers **Rewire again**.
4. With Shift 11, then Shift 15, served, Brew's hands and Porter's eyes come to the bench the same way.

## Photo mode

1. On a shift, open **Photo** from the heading: the routines, the heading and the playback strip go, and the café fills the desk with no bubbles or floor labels. Focus is on **Save photo**, and the framing is the view you were on.
2. Try each framing, then **Save photo**: a PNG named with today's date and time downloads, printed on paper with the shift and the moment of service written under it. In a memory, the print keeps the old-photo colours.
3. Run a service and open **Photo** while it plays: it holds still. Press Esc: the service plays on, from the same camera view, and focus is back on **Photo**. Pause first, and it stays paused after.
4. **Photo** waits while the shift's scene or a window is open, and while a service heading for a slip plays out.

## Cafés in one browser

1. With a café under way, open **Settings → Cafés in this browser** and add a café. The page reloads on the new café at the very start, with the same audio and display settings, and the front page names it.
2. Open the notebook on a shift: it's the same notebook. Back in Settings, open the first café: its shifts, stars, routines and benches are as they were.
3. Import an export and choose **Add as a new café**: the café you're in is untouched, and the import is listed beside it. Remove a café you're not in: it asks first, and offers its export.
4. With two tabs on different cafés, play in both: neither writes over the other. Remove one tab's café from the other tab: the first tab reloads on a café still kept.

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

| Check                                                                                                                           | Chrome | Firefox | Safari | iPad | Notes |
| ------------------------------------------------------------------------------------------------------------------------------- | ------ | ------- | ------ | ---- | ----- |
| Default checks and `npm run test:e2e` pass                                                                                      |        |         |        |      |       |
| A new café, from the opening day to Shift 3's receipt                                                                           |        |         |        |      |       |
| One Brew shift and one Porter shift, to three stars                                                                             |        |         |        |      |       |
| An Act IV shift with all three robots                                                                                           |        |         |        |      |       |
| A failed run: the crew's reaction, the timeline, the fix                                                                        |        |         |        |      |       |
| Robot motion at 1× and the fastest speed: reaches, waits, a failure                                                             |        |         |        |      |       |
| Every viewport above fits without scrolling                                                                                     |        |         |        |      |       |
| Keyboard only, through one shift                                                                                                |        |         |        |      |       |
| Touch only, through one shift                                                                                                   | n/a    | n/a     | n/a    |      |       |
| Offline reload and update                                                                                                       |        |         |        |      |       |
| Each accessibility path                                                                                                         |        |         |        |      |       |
| Music: default volume, muted, in the repair bay and in a memory                                                                 |        |         |        |      |       |
| The shelf's looks: pick a print and cushions, see them in the café                                                              |        |         |        |      |       |
| In French: home, rail and its windows, a shift and its windows, a scene, a special, a wave, Settings, handbook, nothing cut off |        |         |        |      |       |
| Readiness, frame time and memory, as [Performance](PERFORMANCE.md) asks                                                         |        |         |        |      |       |
| Export a save, reset progress, import it back                                                                                   |        |         |        |      |       |
| The routine notebook, as above                                                                                                  |        |         |        |      |       |
