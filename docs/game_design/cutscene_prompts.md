# Cutscene prompts

Prompts for the 28 stills of the 7 story cutscenes. Each still fills the
screen while its lines play in the dialogue box, and it crossfades to the next
still when the story moves on. The scenes and their lines live in
`src/data/campaign/cutscenes.ts`; the story is in `story.md`.

Save each image as `assets/cutscenes/<scene>/<nn>.png` (a `.jpg` works too),
numbered from `01` in the order it plays, for example
`assets/cutscenes/the-keys/03.png`. Then run `python3 tools/cutscenes.py` to
make the WebPs the game loads. Until a still exists, the game shows a prune
placeholder card with the panel's description, so the scenes can be played
before the art is done.

## Workflow for a consistent set

1. **Anchor the places first.** Generate these four stills before anything
   else, and regenerate them until they are exactly right. Every other still
   reuses one of them as a reference.
   - **Café interior:** `the-keys/02` (dark, chairs up) sets the room. Then make
     a bright daytime version from it for `the-scrapyard/01`, and reuse that one
     for every daytime interior.
   - **Café exterior:** `the-keys/01` (rainy evening) sets the shopfront. Make
     `the-keys/05` (sunny morning) from it.
   - **Back room:** `the-scrapyard/03` sets the workbench and the three
     charging docks.
   - **Scrapyard:** `the-scrapyard/02` sets the junk piles and the sunset.
2. **Attach the characters.** For every still with a character in it, attach
   that character's `assets/portraits/<id>/neutral.png` as a reference and add:
   _“The characters must match the attached reference portraits exactly: face,
   hair, clothes, colours and outline style.”_ Robots share one body, so attach
   `query/neutral.png` as well whenever Brew or Porter appear.
3. **Attach the place.** Attach the anchor still for the location (for the
   interior anchors themselves, the two 3D captures below) and add:
   _“Same room, same furniture and colours as the attached scene reference.
   New camera angle and lighting as described.”_
4. **Check a scene in a row.** Put a scene's stills side by side. The light, the
   palette and the outline weight should read as one sequence. Redo any still
   that stands out.

## 3D café references

Two captures of the café as the game draws it, in
[`cutscene_references/`](cutscene_references/). They show the real furniture,
layout and colours. Attach them when you generate the interior anchors
(`the-keys/02`, `the-scrapyard/01`) and the shopfront (`the-keys/01`), and add:
_“Match the furniture, layout and colours of the attached top-down game
capture, drawn at eye level in the style described.”_ They are seen from above,
so borrow what's in the room, not the camera angle.

**`cafe-overview.png`**: the whole café and its street. The street runs along
the left, with an asphalt road, a zebra crossing, cars, a pale pavement,
walnut street lamps and a clay bench against the windows. Inside are rows of
square tables with clay chairs, the round mural on the back wall, a plant in the
corner, and the long counter along the front.

![The whole café from above](cutscene_references/cafe-overview.png)

**`cafe-counter.png`**: the counter up close, from the door to the sink. In
order: the cash register, a stack of tickets, the order screen, the glass
fridge, the teal shelf of jars, the espresso machine with two cups on top, the
sugar canister, a terracotta chopping board and the teal sink. Query stands at
the register, Brew at the machine and Porter by the sink.

![The counter from above](cutscene_references/cafe-counter.png)

To make new captures, run the game with reduced motion and pixel art turned
off, open the home page and hide the menu ticket. The café behind it keeps the
cleanest view, with no grid or floor labels.

## Technical spec (for every image)

- **16:9 landscape, 2560 × 1440 px** (at least 1920 × 1080). The game crops a
  sliver off the long side on screens that aren't 16:9, so keep a few percent
  of margin on every edge.
- **Safe zones.** The dialogue box covers the **bottom 30%** of the screen, and
  the speaker's portrait stands over the **lower-left quarter**. Put faces and
  the key action in the **upper 60%**, centre or right. The bottom can be floor,
  counter-front or tabletop.
- The game slowly zooms each still from 106% to 100%, so don't put anything
  important right against the edges.
- No text anywhere in the picture unless the prompt asks for it (a name plate,
  a calendar word, a note). Keep any text short and simple.
- Save as PNG, with no transparency and no border.

## Style block (paste at the start of every prompt)

> Cozy visual-novel background scene, a wide 16:9 cinematic still in clean
> cel-shaded 2D illustration. Bold, even, dark espresso-brown outlines
> (#392b24) around characters and furniture, slightly thinner lines for
> background details. Flat colour fills with one soft cel shadow tone and one
> small highlight per material; no gradients except in the sky and light glows,
> no textures, no painterly brushwork, no photorealism, no 3D-render look, no
> pixel art. Friendly, rounded, slightly chunky shapes and proportions, with
> heads about 15% larger than realistic and simple, expressive eyes. Warm,
> muted palette built around cream #fffcf4, espresso ink #392b24 and coffee
> brown #71452f. Mood: cozy modern neighbourhood café, gentle humour, a warm
> animated-film storyboard. Keep the bottom 30% of the frame calm and simple,
> and keep the lower-left quarter free of faces. No text, no logo, no
> watermark, no border, no letterbox bars.

## The places

Paste the matching block after the style block, before the still's own prompt.

### Café interior

> The café is small, modern and cozy (not retro, not industrial). Sage-grey
> walls (#78968c), a light oak parquet floor, and big street windows with
> walnut frames and clay-coloured sills. A wide sliding glass door onto the
> street. On the wall, a simple round mural: a sand-coloured circle with a
> walnut coffee cup and clay-red steam. Walnut (#70503d) counters with sand
> (#e6d8bf) tops and a charcoal (#393b36) plinth, in one long run along the
> front of the room. Square sand tables with softly rounded corners, each on a
> single round walnut pedestal, with clay (#aa7965) upholstered chairs on two
> sides. On the counter: a
> modern two-group espresso machine with a charcoal body, a brushed-steel front
> and drip tray, steel group heads with walnut portafilter handles, a round
> cream pressure gauge, small mint status lights and a row of cups on top (not
> brass, not copper, not vintage); a charcoal-and-cream cash register with a
> small green display and a stack of order tickets beside it; a sage sugar
> canister with a walnut lid; a small ticket tray at the handoff; a terracotta
> chopping board and a teal sink at the far end. A glass-front drinks fridge, a
> tall teal shelf with oak shelves and glass jars of beans, and a terracotta pot
> with a leafy green plant in the corner.

### Café exterior and street

> A small neighbourhood café shopfront: big windows with walnut frames and
> clay-coloured sills, a wide sliding glass door, sage-grey walls. A pale sand
> pavement with a cream kerb, walnut street lamps with warm bulbs, and a
> clay-red bench against the shopfront. A quiet asphalt street with a zebra
> crossing and a small rounded car or two parked along it. A second storey above the café with a small lit window (a
> flat upstairs). Across the street, a narrow house with a little porch.

### Back room

> The café's small back room: a sturdy walnut workbench under a single hanging
> lamp, scattered screwdrivers, wires and a thick, battered repair manual,
> three coffee cups. Against the sage-grey wall, three matching charging docks
> for robots: low cream platforms with a small mint light each, empty and a
> little dusty. A pegboard of tools, a cardboard box of spare parts.

### Scrapyard

> A friendly, colourful scrapyard at the edge of town: soft hills of old
> toasters, kettles, vending machines, a faded jukebox, bicycle wheels and
> broken café parasols. Not grim or rusty-dark; the junk is sun-faded pastel.
> A chain-link fence and a small hand-painted gate.

### Robots (for any still with a robot)

> All the café robots are the same model: a wide, boxy, rounded-corner cream
> (#f1dfb5) head, wider than the body, with a dark-green (#263f37) visor
> screen showing two small glowing mint (#b6e4bc) rectangular eyes; a thin
> antenna with a round amber (#e1a251) bulb; a coloured, boxy torso with a
> pale-yellow chest plate; simple blocky arms and short dark-olive legs
> (#4b5543). Query's torso is sage green (#80a889), Brew's is steel blue
> (#7d9eae) with a frother wand on one forearm, and Porter's is honey gold
> (#d4ac6b) with a bow tie and a silver tray.

## 1 · The Keys (`the-keys`, before shift 1)

Aunt Lou leaves Niko her café, and an old friend comes with it.

### `the-keys/01` · Exterior, rainy evening

> Place: café exterior. A rainy evening, deep blue light, the street lamps
> glowing warm on the wet pavement. The café is closed and dark, with its blinds
> half down. Niko stands on the pavement in front of it in a rain jacket over
> his usual clothes (no apron), a suitcase at his feet, looking up at the
> shopfront. In one hand he holds a ring of old keys and in the other a small
> folded handwritten note. Medium-wide shot from across the street, with Niko
> right of centre and the shopfront filling the upper frame. Quiet, a little
> lonely, hopeful.

### `the-keys/02` · Inside, in the dark (interior anchor)

> Place: café interior. Night, the lights off. Blue streetlight falls through
> the big windows in long stripes across the floor. The clay chairs are upside
> down on the round tables. Niko, still in his rain jacket, is pulling a large
> pale dust sheet off the espresso machine on the counter, and dust floats in
> the light. The steel front of the machine and its round cream gauge catch the
> streetlight. Wide shot from the dining room toward the counter, with the
> machine centre-right in the upper half. Expression: surprised and a bit
> moved.

### `the-keys/03` · A shape in the doorway

> Place: café interior, same dark room as the reference. Night, heavy rain.
> The wide sliding door behind Niko has just opened. In the doorway stands a
> dark, stout silhouette under an umbrella, backlit by the orange street lamp,
> rain streaking around it; no face visible, only the outline and a bun of hair.
> In the foreground on the right, Niko has spun round in panic and holds a
> portafilter up like a weapon, eyes wide. Low angle from behind the counter,
> with the silhouette centred in the upper frame and Niko on the right. A
> spooky-but-funny moment, not horror.

### `the-keys/04` · Moka steps in

> Place: café interior, one warm lamp now switched on over the counter.
> Moka (see her portrait) has stepped inside and is shaking out her dripping
> umbrella, wearing a long raincoat over her coffee-brown apron, deeply
> unimpressed, one eyebrow raised. Niko stands at the right, sheepishly
> lowering the portafilter. Rain still streaks the windows behind them.
> Medium shot, with Moka centre and Niko right, both faces in the upper half.

### `the-keys/05` · Pip at the window

> Place: café exterior, the next morning, bright sun, the pavement drying.
> Seen from inside the café looking out through the big window: Pip (see his
> portrait) has his nose and both hands pressed against the glass, grinning,
> cap on backwards. Inside, in the foreground right, Moka stands with her arms
> crossed and a coffee cup, and Niko, now in his terracotta apron, leans in
> curiously. The upstairs flat's door is visible beside the café entrance.
> Cheerful and bright.

## 2 · The Scrapyard (`the-scrapyard`, before shift 3)

Too many tickets for one pair of hands. Somewhere in the scrapyard, help is
waiting.

### `the-scrapyard/01` · After the rush

> Place: café interior, late afternoon, warm light (the daytime interior
> anchor). After the rush: Niko slumps forward on the counter, cheek on his
> arms, under a comically tall pile of handwritten order tickets that spills
> over the cash register. Behind him, Moka sweeps the floor with a broom, not
> looking at him. Medium shot of the counter, with Niko centre and the ticket
> mountain in the upper frame. Tired and funny.

### `the-scrapyard/02` · The scrapyard (scrapyard anchor)

> Place: scrapyard, at sunset, a peach and lilac sky. Niko pushes a wooden
> wheelbarrow along a path between the junk hills. On the right, a cream,
> boxy robot head pokes out of a pile of old toasters and kettles, its visor
> dark, and a small pale-yellow name plate is visible beside it. Niko has
> stopped and is leaning forward, surprised. Wide shot, with the robot head
> upper right and the sky filling the top.

### `the-scrapyard/03` · Two in the morning (back room anchor)

> Place: back room, two in the morning, the single hanging lamp is the only
> light. Query lies open on the workbench: its sage-green torso panel is off
> and its wires are showing, its cream head resting to one side with the visor
> dark. The battered manual is open, with three empty coffee cups. Against the
> wall, the three empty charging docks. Niko is bent over the robot with a
> screwdriver, sleeves rolled up, a smear of grease on his cheek. Medium-wide
> shot, with the bench centre and the docks upper left. Quiet and focused.

### `the-scrapyard/04` · Query wakes

> Place: back room, close-up. Query's visor lights up, two glowing mint
> rectangular eyes, and the mint glow spills onto Niko's face beside it. Niko
> smiles, tired and delighted. Everything else is in soft shadow. Close
> two-shot, with Query's head left of centre in the upper half and Niko's face
> right. A tender, magical moment.

## 3 · A Second Pair of Hands (`a-second-pair-of-hands`, before shift 15)

Query earns its badge, and the kitchen drowns in tickets.

### `a-second-pair-of-hands/01` · Employee of the Month

> Place: café interior, daytime. A framed photo hangs on the sage wall next to
> the mural: Query proudly wearing a round gold "Employee of the Month" badge
> (just a star on it, no readable text). In front of the wall, the real Query
> stands polishing the same badge on its chest while Mr. Albert (see his
> portrait) sits at a round table and applauds warmly. Niko grins behind the
> counter. Medium shot, with the photo and Query centre-top.

### `a-second-pair-of-hands/02` · Snowing tickets

> Place: café interior, the counter and the kitchen handoff. The ticket tray at
> the handoff is overflowing and paper tickets spill over the counter and
> flutter to the floor like snow. Behind the espresso machine, Moka is half
> buried in tickets, glaring, one hand still pulling a shot. Query stands at
> the register on the left, still printing tickets happily. Medium-wide shot,
> with Moka centre-right. Chaotic and funny.

### `a-second-pair-of-hands/03` · A sibling under the tarp

> Place: scrapyard, at midday under a pale blue sky. Query rides in the wooden
> wheelbarrow that Niko pushes. In front of them, a tarp has been pulled back
> to reveal a steel-blue robot (Brew) curled up, hugging an old broken espresso
> machine with both arms, its visor dark. Query leans out of the wheelbarrow,
> eyes lit. Wide shot, with Brew and the tarp centre-right in the upper half.

### `a-second-pair-of-hands/04` · Brew wakes up

> Place: back room, morning. Brew sits up on the workbench, visor bright with
> two tall mint eyes, arms raised in excitement. Niko stands beside it with a
> screwdriver, pleased. In the doorway on the right, Moka leans on the frame
> with her arms crossed, suspicious. Two of the three charging docks now glow
> mint. Medium-wide shot.

## 4 · Ninety-Two Degrees (`ninety-two-degrees`, before shift 22)

Moka's last morning in the kitchen.

### `ninety-two-degrees/01` · The last polish

> Place: café interior at dawn, before opening, soft pink-gold light through
> the big windows, the chairs still up on the tables. Moka stands alone at the
> espresso machine, polishing its brushed-steel front with a cream cloth, her
> face gentle for once. Nobody else in the room. Medium shot from the side,
> with Moka and the machine in the upper centre. Quiet and bittersweet.

### `ninety-two-degrees/02` · The tamper

> Place: café interior, early morning, by the espresso machine. Moka holds out
> her old brass tamper to Brew, who takes it carefully in both hands, eyes
> softened. Niko and Query stand close behind, watching; Niko looks worried
> and touched. Medium shot, with the hand-over centre-top.

### `ninety-two-degrees/03` · The apron on the hook

> Place: café interior, the kitchen door. Close-up of Moka's worn coffee-brown
> leather apron hanging on a wooden hook by the kitchen door. A small paper
> note is pinned to it with "92°" handwritten on it. Morning light, a little
> steam drifting past from the machine out of frame. Still life, no people.
> Keep the apron in the upper centre.

### `ninety-two-degrees/04` · The porch across the street

> Place: street, late morning. Seen from the pavement, Moka sits in a wooden
> chair on the little porch of the narrow house across from the café, with a
> cup and saucer in hand and a blanket over her knees. She watches the café
> window across the street, where the espresso machine and Brew are visible
> inside. Wide shot, with Moka left of centre in the upper half and the café
> window on the right. Warm, content, a little funny.

## 5 · The Floor Robot (`the-floor-robot`, before shift 23)

Pip can't be everywhere, and school starts soon.

### `the-floor-robot/01` · Table four!

> Place: café interior, a packed lunchtime. Pip runs between the tables with
> three trays balanced on his arms and head, cap flying. At a big table on the
> right, Rosa (see their portrait) and a group of friends wave him over. Query
> and Brew are busy at the counter behind. Wide shot, with Pip centre in the
> upper half, mid-stride. Busy and funny.

### `the-floor-robot/02` · The calendar

> Place: café interior, close-up on the wall by the kitchen door. A paper wall
> calendar with the last days of August crossed off and one day circled in red
> with the single word "SCHOOL". Pip's hand is at the edge of the frame,
> touching the circled day. Still life. Keep the calendar centre-top.

### `the-floor-robot/03` · Under the parasol

> Place: scrapyard, in the late afternoon under a golden sky. Under a broken,
> faded café parasol sits a honey-gold robot (Porter), visor dark, still
> holding a silver tray perfectly level at shoulder height. Pip kneels in front
> of it with pleading eyes and clasped hands, and Niko stands behind with the
> wheelbarrow, smiling. Wide shot, with Porter and the parasol centre-right.

### `the-floor-robot/04` · Three docks, three robots

> Place: back room, evening. All three charging docks glow mint. Porter has
> just woken up on the middle one, raising its tray high, bright tilted eyes.
> Query and Brew stand on the other docks and lean in to greet it. Niko and
> Pip watch from the workbench, delighted. Wide shot, with the three robots in
> a row in the upper two thirds. Warm and triumphant.

## 6 · Back to School (`back-to-school`, before shift 31)

Pip's first day of school, and Niko's first day as just the owner.

### `back-to-school/01` · Goodbye at the door

> Place: café interior by the sliding door, early morning. Pip stands in the
> doorway with a big school backpack, no apron, cap on the right way round
> for once. The three robots are lined up in front of him to say goodbye:
> Porter in front with its tray lowered sadly, Query and Brew beside it. Medium
> shot, with Pip centre-right and the robots across the upper middle.
> Bittersweet and cute.

### `back-to-school/02` · Off to school

> Place: street, a sunny morning. Pip runs off down the pavement, looking back
> and waving, backpack bouncing. In the café's open doorway on the left,
> Porter waves back with its tray raised. Wide shot, with Pip in the upper
> right and the street receding. Cheerful.

### `back-to-school/03` · Two aprons

> Place: café interior, by the kitchen door. Niko hangs his terracotta apron
> on the hook right next to Moka's old coffee-brown one (still with its 92°
> note). He is in a plain cream shirt now, smiling, a little proud. Medium
> close shot, with the two aprons and Niko's face in the upper half.

## 7 · Closing Time (`closing-time`, after the last shift)

The café runs itself. Everyone comes by at the end of the day. This scene
plays before the final receipt.

### `closing-time/01` · A full café at sunset

> Place: café interior at sunset, golden light pouring through the big
> windows. Every table is full: Mr. Albert with his newspaper, Juno on a
> laptop with tea, Dot with her sugar cubes, and Rosa's group laughing (see
> their portraits). Query takes an order at the register, Brew works the
> espresso machine, and Porter carries a tray between the tables. Wide
> establishing shot, busy but calm, with everyone in the upper two thirds.

### `closing-time/02` · Old habits

> Place: café interior, the counter, dusk. Niko sits on the customer side of
> the counter with a cup of coffee he made himself, smiling. Query leans over
> from behind the register, visor eyes tilted in curiosity, looking at the cup.
> Medium two-shot, with both faces in the upper half.

### `closing-time/03` · Everyone comes by

> Place: café interior at dusk, the doorway and the counter. Moka has come
> over from across the street and stands at the espresso machine, tasting a
> shot from a small cup, approving. Pip, just back from school with his
> backpack still on, wipes a table with his cloth, grinning. Niko laughs at the
> counter. Medium-wide shot, with Moka centre-left and Pip right.

### `closing-time/04` · The photo and the postcard

> Place: café interior, close-up on the sage wall by the counter at night,
> warm lamp light. A framed group photo: Niko, Moka, Pip and the three robots
> posing in front of the espresso machine, with Pip on Porter's shoulders.
> Pinned beside it, a postcard of a sunny seaside with a lighthouse, with
> short handwriting on it. Still life, no people. Keep the frame and the
> postcard centre-top.

## File checklist

| Scene                    | Files                    |
| ------------------------ | ------------------------ |
| `the-keys`               | `01` `02` `03` `04` `05` |
| `the-scrapyard`          | `01` `02` `03` `04`      |
| `a-second-pair-of-hands` | `01` `02` `03` `04`      |
| `ninety-two-degrees`     | `01` `02` `03` `04`      |
| `the-floor-robot`        | `01` `02` `03` `04`      |
| `back-to-school`         | `01` `02` `03`           |
| `closing-time`           | `01` `02` `03` `04`      |
