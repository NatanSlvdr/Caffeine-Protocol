# Art Direction

> September 2026: the user explicitly requested the supplied assets only.
> The shipped implementation uses the existing seven tile sheets and character
> sprites; no new world art was generated. This overrides the older custom-art
> production and reset instructions below. See [implementation.md](implementation.md).

## Style Goal

Caffeine Protocol uses custom pixel art only. Do not use premade asset packs for
in-game visuals. Source art is allowed during production, but final shipped
assets should be project-owned pixel-art sprites that follow this document.

The visual target is a cozy modern coffee shop in 2026 that happens to be run
by robots. Robots and programming surfaces can use crisp automation colors and
machine-status details, but the cafe environment should still feel like a normal
contemporary place people would want to sit in: clean, comfortable, softly lit,
and welcoming.

The intended contrast is important: robots should look like capable automation
hardware, while counters, tables, floors, customers, and decor should read as a
modern cafe first. Avoid pushing the whole cafe into a sci-fi lab or factory.

## Pixel-Art Rules

- Camera style: 2D top-down with slight object-facing fronts where needed for
  readability.
- Base tile size: 48x48 pixels.
- Every final tile, prop frame, character frame, icon, and animation frame must
  be exactly 48x48 pixels.
- Characters normally fit inside one 48x48 frame. Do not make multi-cell
  characters unless a later design document explicitly approves that exception.
- Large props are built from adjacent 48x48 cells. Split counters, appliances,
  booths, signs, and other oversized objects into named tile pieces instead of
  shipping oversized sprite PNGs.
- Detail density: readable at gameplay zoom before decorative detail.
- Outlines: one-pixel dark outline on important characters and interactable
  objects; softer interior lines for non-interactive furniture.
- Lighting: consistent upper-left clean neutral light. Avoid rendered gradients
  in final sprites.
- Animation: small, readable loops. Prefer 2 to 6 strong frames over many subtle
  frames.
- Text in world art: avoid except for large signs or UI-like props that remain
  legible after pixel conversion.

## Palette Direction

Use two connected palette lanes:

- Robot and programming lane: graphite, near-black, cool white, electric cyan,
  saturated blue, safety yellow, status green, and red/magenta error accents.
- Cafe environment lane: warm off-white, soft gray, charcoal, muted sage,
  muted clay, pale oak, coffee brown, and small brushed-metal details.
- Use cyan and safety yellow sparingly in the environment, only where automation
  touches the cafe workflow: order pickup lights, ticket slots, robot docks,
  route markers, and machine status indicators.
- Avoid cream/tan dominance, rustic wood-heavy interiors, all-graphite sci-fi
  surfaces, and overly saturated neon environments.

Final sprites should be quantized to a controlled palette. Do not keep
high-resolution painterly color variation in pixel assets.

## Asset Pipeline

Assets use a two-stage process:

1. Create source art to establish the intended shape, material, palette, and
   personality.
2. Convert that source into low-resolution pixel art inside the project, then
   clean or revise until the result is readable at target sprite size.

Downscaling alone is not treated as final art if it produces muddy clusters,
blurred silhouettes, or unreadable details. Automated conversion is allowed for
first-pass assets, but final production assets should receive pixel-level cleanup
when they become part of a playable scene.

Environment tiles and object tiles should come from approved source art or
hand-authored pixel art, not from procedural programmer-art generators. Local
scripts may crop, remove chroma-key backgrounds, quantize, assemble atlases,
validate frame size, and create Godot resources, but they should not be the
source of the visual design.

Project asset locations:

- `assets/prompts/` stores locked prompt manifests and asset specs.
- `assets/source/` stores source PNGs used to derive game assets.
- `assets/tiles/` stores tile sprites.
- `assets/tilesets/` stores Godot TileSet resources and atlases.
- `assets/previews/` stores enlarged preview images for inspection.

Source art should remain in the repository when it is used to derive a game
asset, so future edits can trace the visual intent.

For first-pass evaluation, export strict 48x48 assets and a separate enlarged
preview image from the same high-resolution source. Preview images are only for
inspection and must not be used as gameplay assets.

## Godot Import Rules

Pixel-art assets should use:

- nearest-neighbor filtering;
- no mipmaps unless a specific zoomed-out scene proves it needs them;
- integer scale where possible;
- pixel snapping for the camera and moving sprites;
- transparent PNGs for characters and props;
- tile dimensions aligned to the 48x48 base grid.

## Initial Asset Targets

The current custom art pass covers:

- cafe wooden plank floor tile;
- gray stone wall segment;
- counter segment;
- coffee machine;
- electric kettle;
- two-door display fridge.

Character, furniture, and icon sprites are intentionally empty while the next
sprite pass is planned from scratch.

## Cafe Tile Atlas

The cafe environment should be assembled from 48x48 pixel tiles in Godot rather
than painted as a single background. Use a TileSet/TileMapLayer workflow so
rooms, counters, and kitchen areas can be rearranged as level needs change.

Required tile groups:

- customer-area floor: normal modern coffee shop floor tiles, with subtle
  variation for repetition;
- kitchen floor: checkered utility tiles that clearly distinguish the prep area;
- walls: corners, straight walls, side edges, base trim, windows, and door
  pieces;
- customer furniture: small tables, chairs, stools, booths, planters, trash and
  recycling bins;
- counter/service furniture: counter runs, counter ends, pickup lights, cashier
  or ticket slots, and under-counter storage;
- kitchen appliances: espresso machines, grinders, brewers, fridge, sink, oven,
  dishwasher, storage shelves, prep counters, and small appliance tiles;
- automation accents: robot docks, charging pads, route markers, queue boards,
  and machine-status indicators.

Large objects should still be composed from adjacent 48x48 tiles. For example,
a fridge can be two tiles wide by three tiles tall, and a counter can be
repeated from middle segments with separate end pieces.

## Tile Reset

The previous room layouts have been removed. The next scene art pass should
start from a fresh layout using only:

- one main-room floor tile: approved wooden planks from `sprite_06.png`;
- one kitchen floor tile: repeatable utility tile;
- one wall tile: approved gray stone segment from `sprite_07.png`;
- one counter tile: repeatable service counter segment.

Create these tiles one by one so perspective, scale, and material style can be
approved before expanding the set.
