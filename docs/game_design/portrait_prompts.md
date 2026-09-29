# Portrait prompts

Prompts for the 21 dialogue portraits: a `neutral` for each of the 11
characters, plus the 10 other moods the scripts actually use. Save each image
as `assets/portraits/<id>/<mood>.png`, for example `assets/portraits/niko/happy.png`,
then run `python3 tools/portraits.py` to make the WebPs the game loads.

## Workflow for a consistent set

1. **Style anchor.** Generate `niko/neutral` first from the full prompt below.
   Regenerate until the line weight, shading and framing are exactly right.
   Every other image depends on this one.
2. **Other neutrals.** Generate each remaining `neutral` with the **Style block**
   plus that character's description, and attach `niko/neutral.png` as the
   reference image. Add: _“Match the reference image's art style, outline
   weight, shading, colour treatment, framing, head size and head height
   exactly. Different character.”_ For the robots, generate `query/neutral`
   first and attach it as a second reference when you make `brew` and `porter`.
3. **Moods.** For every other mood, **edit** that character's own
   `neutral.png` with the short mood prompt. The framing, clothes, colours and
   outline stay identical, and only the face and a small gesture change.
4. **Check the lineup.** Put all 11 neutrals side by side. The heads should sit
   at the same height, and the outlines and shading should look like one artist
   drew them. Redo any image that stands out.

## Technical spec (for every image)

- Canvas **1536 × 2048 px (3:4 portrait)**. The game scales it down, so don't
  go smaller than 768 × 1024.
- **Transparent background.** If your tool can't do transparency, use a
  perfectly flat **#FF00FF magenta** background with no shadow or gradient, and
  remove it afterwards.
- **Framing (the same for all 21):** a bust cut flat at mid-chest along the
  bottom edge of the canvas. The top of the head (or a robot's antenna tip)
  sits about 6% below the top edge. The eyes sit at about 33% of the height.
  The shoulders span about 70% of the width, and the character is centred.
  Nothing touches the left or right edge.
- **Facing:** the body is turned three-quarters toward the viewer's **right**,
  and the gaze goes right. In the game the portrait stands on the left of the
  speech box, so the character looks toward the text.
- Save as PNG with alpha. Keep one character per image.

## Style block (paste at the start of every prompt)

> Cozy visual-novel character portrait, clean cel-shaded 2D illustration. Bold,
> even, dark espresso-brown outlines (#392b24) of a consistent thick weight
> around the silhouette and slightly thinner inner lines. Flat colour fills with
> exactly one soft cel shadow tone and one small highlight per material; no
> gradients, no textures, no painterly brushwork, no photorealism, no 3D-render
> look, no pixel art. Warm, soft key light from the upper left. Friendly,
> rounded, slightly chunky proportions with a head about 15% larger than
> realistic and simple, expressive eyes. Warm, muted palette built around cream
> #fffcf4, espresso ink #392b24 and coffee brown #71452f, plus the character's
> signature colour. Mood: cozy modern neighbourhood café, gentle humour.
> Bust portrait cut flat at mid-chest, body turned three-quarters to the
> viewer's right, looking right. Transparent background. Single character. No
> text, no logo, no watermark, no border, no frame, no scenery, no floor shadow.

## Characters (neutral prompts)

Each prompt below is **Style block + this text**.

### `niko` — Niko, the owner · signature #b96847 terracotta

> Niko, a young man in his late twenties who has just taken over a small café.
> Warm light-brown skin, a friendly face with a soft jaw and light stubble,
> short tousled dark-brown hair with a few strands falling over the forehead,
> faint tired shading under the eyes. Cream
> henley shirt with the sleeves pushed to the elbows, under a terracotta
> (#b96847) canvas bib apron with a coffee-brown neck strap. A pencil and a
> small screwdriver stick out of the apron's chest pocket. A little smudge of
> machine grease on one cheek, a small silver hoop earring. Expression: calm,
> warm, a relaxed closed-mouth half smile.

### `query` — Query, counter robot · signature #80a889 sage

> Query, a friendly café robot. A wide, boxy, rounded-corner head in pale cream
> (#f1dfb5), wider than the body. Across the front of the head is a
> dark-green glass visor screen (#263f37) showing two small glowing mint
> (#b6e4bc) rectangular pixel eyes. A thin sage-grey antenna on top ends in a
> round amber (#e1a251) bulb. The torso is a rounded box in sage green
> (#80a889) with a small pale-yellow (#f1db9f) name plate on the chest.
> Simple sage-green blocky arms. Small round speaker grilles on each side of
> the head, like ears. A tiny order pad and pencil clipped to the chest.
> Clean, a little scuffed, lovingly repaired. Expression: attentive and
> literal, with the eyes as two level rectangles.

### `brew` — Brew, kitchen robot · signature #7d9eae steel blue

> Brew, a café kitchen robot, the same model and proportions as Query: a wide,
> boxy, rounded-corner cream (#f1dfb5) head with a dark-green (#263f37) visor
> screen and two glowing mint (#b6e4bc) pixel eyes, and a thin antenna with an
> amber (#e1a251) bulb. The torso and arms are steel blue-grey (#7d9eae) with a
> pale-yellow (#f1db9f) chest plate. A coffee-bean emblem on the chest, a small
> milk-frother wand fitted to one forearm, a folded cream tea towel over one
> shoulder, and a faint coffee splash stain on the torso. Eager
> perfectionist. Expression: focused and keen, with the eyes as two slightly
> taller rectangles.

### `porter` — Porter, floor robot · signature #d4ac6b honey gold

> Porter, a café floor robot, the same model and proportions as Query: a wide,
> boxy, rounded-corner cream (#f1dfb5) head with a dark-green (#263f37) visor
> screen and two glowing mint (#b6e4bc) pixel eyes, and a thin antenna with an
> amber (#e1a251) bulb. The torso and arms are honey gold (#d4ac6b) with a
> pale-yellow (#f1db9f) chest plate. A small coffee-brown bow tie at the neck
> joint, and a round silver serving tray held flat at shoulder height in one
> hand. A small dent on the head that has been patched. Cheerful and chatty.
> Expression: bright and friendly, with the eyes as two rectangles tilted
> slightly as if smiling.

### `moka` — Moka, the old kitchen stand-in · signature #71452f coffee brown

> Moka, an elderly woman around seventy who has run the café's espresso
> machine for forty years. Stout and sturdy, with warm tan skin, deep
> laugh-and-frown lines, strong dark eyebrows, and a heavy-lidded, knowing
> look. Grey hair pulled up in a tight practical bun and held by a wooden
> pencil. Rolled sleeves on a cream shirt under a well-worn coffee-brown
> (#71452f) leather barista apron with a brass tamper in the pocket. A small
> burn scar on one forearm and a steaming espresso cup and saucer held
> steady in one hand. Dry, grumpy and secretly fond. Expression: unimpressed,
> with half-lidded eyes, one eyebrow slightly raised and a flat mouth.

### `pip` — Pip, the little delivery stand-in · signature #d98f8f dusty rose

> Pip, a very young café helper of about fourteen, the fastest thing on the
> café floor, bursting with energy. Light skin with a sprinkle of freckles,
> big bright eyes, a gap-toothed grin, and short, messy strawberry-blonde hair
> sticking up at the crown. A dusty-rose (#d98f8f) short-sleeved polo under a
> small cream waist apron, a slightly-too-big café cap worn backwards, a
> plaster on one cheek and a cream serving cloth flung over one shoulder.
> Leaning forward as if about to dash off. Expression: bright-eyed and eager,
> with a wide grin.

### `albert` — Mr. Albert, elderly regular · signature #8a7f6f warm grey

> Mr. Albert, a kind elderly man around eighty, a regular who always orders
> "the usual". Pale, lightly wrinkled skin with rosy cheeks, a neat white
> moustache, bushy white eyebrows and round tortoiseshell glasses. A flat
> tweed cap and a buttoned cardigan in warm grey-brown (#8a7f6f) over a cream
> collared shirt with a small knitted coffee-brown tie. A folded newspaper
> tucked under one arm. Expression: patient and gently amused.

### `juno` — Juno, student regular · signature #6f86b5 dusty blue

> Juno, a university student in their early twenties who works in the café on
> a laptop. Deep-brown skin with light freckles across the nose, dark curly
> hair in a messy top bun with a pencil pushed through it, and large over-ear
> headphones resting around the neck. An oversized dusty-blue (#6f86b5) hoodie
> with a small tea-leaf pin. Holding a mug of tea with the paper teabag tag
> hanging over the rim. Expression: mildly tired and dryly patient.

### `dot` — Dot, sweet-toothed regular · signature #c77aa0 mauve

> Dot, a cheerful, plump woman in her fifties with a sweet tooth, who counts
> her sugars exactly. Light olive skin, round rosy cheeks, short curly hair
> with silver streaks held back by a mauve (#c77aa0) headband. A mauve
> cardigan with small cream polka dots over a cream blouse, and tiny
> sugar-cube stud earrings. Holding up a single sugar cube between two
> fingers. Expression: warm and precise, with a small satisfied smile.

### `rosa` — Rosa, the group orderer · signature #d0894f burnt orange

> Rosa, an energetic, sociable adult in their thirties who always orders for a
> whole group of friends. Medium tan skin, big wavy auburn hair, sunglasses
> pushed up on the head, and small gold hoop earrings. A burnt-orange
> (#d0894f) cropped jacket over a cream striped top. Holding up a phone that
> shows a long list (no readable text). Expression: upbeat and confident, mid
> "okay, everyone listen".

### `guest` — generic customer · signature #9b8bb4 lavender grey

> A generic, friendly café customer who stands in for anyone at the counter.
> Deliberately plain and unspecific: an adult of indeterminate age with short
> neat dark hair, a simple face and light-medium skin, wearing a lavender-grey
> (#9b8bb4) coat with a soft cream scarf. No props and no distinctive
> accessories, so that the character reads as "any customer". Expression:
> polite and expectant.

## Mood edit prompts

Use these as **edits of that character's own `neutral.png`**. Begin every mood
prompt with:

> Edit this image. Keep the same character, outfit, colours, art style,
> outline weight, framing, crop, head position and transparent background
> exactly. Change only the facial expression and the small gesture described:

### People (`niko`, `albert`, `juno`, `dot`, `rosa`, `guest`)

The robots (Query, Brew, Porter), Moka and Pip only have a neutral portrait.

- **happy:** a broad, open, genuine smile showing a little of the upper teeth,
  eyes curved into happy crescents, cheeks lifted with a light blush, head
  tilted slightly.
- **worried:** eyebrows raised and pinched together in the middle, eyes a
  little wider and glancing to the side, a small wavy frown, one hand lifted
  near the chin or collar.
- **surprised:** eyebrows high, eyes wide open with small pupils, mouth in a
  small round "o", shoulders slightly raised, body leaning back a touch.

Character-specific touches (only the moods in the checklist):

- `niko` · happy: a thumbs-up at chest height. · worried: rubbing the back of
  the neck. · surprised: the pencil half-falling from the apron pocket.
- `albert` · happy: a warm chuckle with the eyes crinkled shut and one finger
  touching the cap brim.
- `juno` · happy: a small, reluctant but real grin and a raised mug. ·
  worried: a flat, exasperated look with one eyebrow raised and the mug held
  close.
- `dot` · happy: beaming, holding up two sugar cubes. · worried: counting on
  her fingers with a small frown.
- `rosa` · happy: laughing, with the phone held high like a trophy.
- `guest` · worried: the base line only, with no extra gesture. This one is
  shown on most failed runs.

## File checklist

```
assets/portraits/
  niko/    neutral.png happy.png worried.png surprised.png
  query/   neutral.png
  brew/    neutral.png
  porter/  neutral.png
  moka/    neutral.png
  pip/     neutral.png
  albert/  neutral.png happy.png
  juno/    neutral.png happy.png worried.png
  dot/     neutral.png happy.png worried.png
  rosa/    neutral.png happy.png
  guest/   neutral.png worried.png
```

Only the 11 neutrals are required. A missing mood falls back to the neutral,
so you can ship the neutrals first and add expressions later.
