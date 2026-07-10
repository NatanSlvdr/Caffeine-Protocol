# 48px Asset Pipeline

## Locked Output

All production game assets are 48x48 PNG frames. This applies to tiles, prop
sprites, character sprites, icons, and animation frames. Source art may be
larger, but the local build step must convert it into exact 48x48 pixel art
before it can be used in Godot.

Multi-tile props are represented as multiple named 48x48 pieces. Do not ship a
single oversized prop image for gameplay unless a later design document creates
an explicit exception.

## Locked Style

- Perspective: 2D top-down cafe layout with slight readable front faces for
  counters, robots, machines, chairs, and furniture.
- Lighting: clean neutral light from the upper left.
- Environment mood: cozy modern 2026 coffee shop, not rustic, not a sci-fi lab.
- Robots and automation: crisp graphite and cool-white hardware with restrained
  cyan, blue, safety yellow, green, and red status accents.
- Cafe materials: warm off-white, soft gray, charcoal, muted sage, muted clay,
  pale oak, coffee brown, and brushed metal.
- Pixel finish: controlled palette, one-pixel dark outlines for important
  interactables, softer interior lines, readable silhouettes at gameplay zoom.

## Source Rules

Every source image should follow the asset spec in
`assets/prompts/cafe_assets_48.json`. Use the exact asset prompt plus the
shared locked style prompt.

Negative prompt rules:

- no isometric camera angle;
- no 3D render, painterly gradients, soft blur, or photorealistic detail;
- no tiny object centered in a large empty canvas;
- no oversized object cropped by the frame;
- no text unless the asset spec explicitly asks for readable signage;
- no rustic cabin, factory, spaceship, or cyberpunk-lab environment.

## Two-Step Workflow

The user-facing workflow is intentionally only two steps:

1. **Generate.** Create or update the source PNGs using the locked prompt
   manifest and style direction. Put the source files in `assets/source/` and
   update `assets/prompts/cafe_assets_48.json` when the asset specification
   changes. For transparent props, remove the flat chroma-key background before
   compiling.
2. **Compile.** Run one command from the repository root:

   ```bash
   python3 scripts/assets/compile_assets.py
   ```

   Compilation converts sources, applies the correct alpha and resize rules,
   splits multi-tile props, writes final sprites, rebuilds the atlas and
   previews, regenerates the Godot TileSet, and validates the asset manifest,
   atlas, TileSet, and cafe room.

The compile command is the production gate. If an asset is the wrong size,
uses soft alpha, has invalid bounds, or leaves the generated resources out of
sync, compilation fails and no validation pass is reported. The existing
`build_asset_approval_sheet.py` helper remains available for optional visual
review of a candidate batch, but it is no longer required for the normal
workflow and never needs to be a separate production step.

Transparent prop sprites should be generated on a flat chroma-key background,
have the background removed locally, then be resized with premultiplied alpha,
hard alpha thresholding, and restrained sharpening. This keeps outlines opaque
and crisp after conversion.

When an approved design needs an exact edge after downscaling, its asset spec
may define `top_outline_color`, `right_outline_color`,
`bottom_outline_color`, or `left_outline_color` as an RGB or RGBA array. The
build step applies that color to exactly one output row or column after
resizing. Use these only for deliberate one-pixel gameplay boundaries, such as
the back edges of counter tiles, not as a substitute for correcting the source
composition.

All candidates should be judged for distant gameplay readability. Prefer chunky,
clear silhouettes and large details that survive downscaling; do not optimize
for the large generated source image.

## Godot Import and Runtime Checks

`compile_assets.py` performs the deterministic asset and resource checks in one
command. After a successful compile, run the broader Godot validation and
short player smoke tests from `AGENTS.md` when a change also affects gameplay
or scene integration.

The build script should stay simple for the first art pass: resize each accepted
source image to 48x48, save the PNG, assemble the atlas, write the preview, and
write the manifest. It must not invent the visual design.

Opaque floor and wall tiles should use direct resizing unless a specific visual
problem is approved for cleanup. Transparent props should use premultiplied
resizing with hard alpha so their final 48x48 edges stay crisp instead of
becoming partially transparent.

Approved multi-tile props may be previewed as a larger assembled sprite, but the
gameplay output must be split into adjacent 48x48 PNG pieces and atlas cells.
Keep the assembled preview under `assets/previews/` for inspection only.
