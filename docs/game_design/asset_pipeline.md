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

## Approval Workflow

Sprite generation must be approved step by step before project assets are
changed.

1. Generate a strong source candidate from the locked prompt direction.
2. Convert it into the exact final gameplay size for preview before importing:
   48x48 for single-tile assets, or the approved assembled size for multi-tile
   props.
3. Show the exact final-size sprite plus enlarged checker and floor-context
   previews for user approval.
4. Do not update `assets/source/`, `assets/tiles/`, atlases, TileSets, or Godot
   scenes until the user approves the final-size preview.
5. After approval, save the source, rebuild the final 48x48 tile outputs, update
   the atlas and TileSet, and run validation.

Transparent prop sprites should be generated on a flat chroma-key background,
have the background removed locally, then be resized with premultiplied alpha,
hard alpha thresholding, and restrained sharpening. This keeps outlines opaque
and crisp after conversion.

All candidates should be judged for distant gameplay readability. Prefer chunky,
clear silhouettes and large details that survive downscaling; do not optimize
for the large generated source image.

## Import Workflow

1. Create source PNGs using the locked prompt manifest.
2. Save accepted source images under `assets/source/`.
3. Run `python3 scripts/assets/build_cafe_assets_48.py`.
4. Run Godot resource generation with
   `res://scripts/assets/create_cafe_tileset_48_resource.gd`.
5. Run `python3 scripts/assets/validate_48px_assets.py`.
6. Run the Godot validation and short player smoke tests from `AGENTS.md`.

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
