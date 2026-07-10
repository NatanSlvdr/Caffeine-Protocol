from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from build_cafe_assets_48 import make_sprite


TILE_SIZE = 48
PREVIEW_SCALE = 6
CHECKER_LIGHT = (214, 218, 216, 255)
CHECKER_DARK = (151, 157, 155, 255)
SHEET_BACKGROUND = (27, 30, 31, 255)
SHEET_PANEL = (39, 43, 44, 255)
SHEET_TEXT = (238, 234, 224, 255)
SHEET_MUTED = (169, 177, 176, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build preview-only 48px approval artifacts without touching production assets."
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args()


def resolve_path(value: str, manifest_path: Path) -> Path:
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return manifest_path.parent / path


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    image = Image.new("RGBA", size, CHECKER_LIGHT)
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    (x, y, min(x + cell - 1, size[0] - 1), min(y + cell - 1, size[1] - 1)),
                    fill=CHECKER_DARK,
                )
    return image


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    output = Image.new("RGBA", size, (0, 0, 0, 0))
    output.alpha_composite(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return output


def contain_nearest(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.NEAREST)
    output = Image.new("RGBA", size, SHEET_BACKGROUND)
    output.alpha_composite(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return output


def nearest_preview(sprite: Image.Image) -> Image.Image:
    return sprite.resize(
        (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE),
        Image.Resampling.NEAREST,
    )


def checker_preview(sprite: Image.Image) -> Image.Image:
    preview = checkerboard((TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE), 24)
    preview.alpha_composite(nearest_preview(sprite))
    return preview


def repeat_sprite(sprite: Image.Image, columns: int, rows: int) -> Image.Image:
    output = Image.new("RGBA", (sprite.width * columns, sprite.height * rows))
    for row in range(rows):
        for column in range(columns):
            output.alpha_composite(sprite, (column * sprite.width, row * sprite.height))
    return output


def floor_context(sprite: Image.Image) -> Image.Image:
    repeated = repeat_sprite(sprite, 6, 6)
    return repeated.resize(
        (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE),
        Image.Resampling.NEAREST,
    )


def horizontal_context(sprite: Image.Image) -> Image.Image:
    background = Image.new(
        "RGBA",
        (TILE_SIZE * 6, TILE_SIZE * 3),
        (70, 73, 72, 255),
    )


def vertical_context(sprite: Image.Image) -> Image.Image:
    background = Image.new(
        "RGBA",
        (TILE_SIZE * 3, TILE_SIZE * 6),
        (70, 73, 72, 255),
    )
    run = repeat_sprite(sprite, 1, 6)
    background.alpha_composite(run, (TILE_SIZE, 0))
    return background.resize(
        (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE),
        Image.Resampling.NEAREST,
    )
    run = repeat_sprite(sprite, 6, 1)
    background.alpha_composite(run, (0, TILE_SIZE))
    return background.resize(
        (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE),
        Image.Resampling.NEAREST,
    )


def alpha_is_binary(image: Image.Image) -> bool:
    values = image.getchannel("A").getextrema()
    if values in ((0, 0), (255, 255)):
        return True
    histogram = image.getchannel("A").histogram()
    return not any(histogram[value] for value in range(1, 255))


def validate_sprite(spec: dict, sprite: Image.Image) -> None:
    expected_size = tuple(spec.get("target_size", [TILE_SIZE, TILE_SIZE]))
    if expected_size != (TILE_SIZE, TILE_SIZE):
        raise ValueError(f"{spec['id']} approval target must be 48x48, got {expected_size}")
    if sprite.size != (TILE_SIZE, TILE_SIZE):
        raise ValueError(f"{spec['id']} converted to {sprite.size}, expected 48x48")
    if spec.get("transparent") and not alpha_is_binary(sprite):
        raise ValueError(f"{spec['id']} contains soft alpha after conversion")
    if spec.get("transparent") and sprite.getbbox() is None:
        raise ValueError(f"{spec['id']} converted to an empty transparent sprite")


def make_counter_run(sprites: dict[str, Image.Image]) -> Image.Image | None:
    required = [
        "service_counter_left_end",
        "service_counter_straight",
        "service_counter_right_end",
        "service_counter_corner",
    ]
    if any(asset_id not in sprites for asset_id in required):
        return None

    floor = sprites.get("kitchen_floor_utility_checker")
    if floor is None:
        floor = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), (94, 91, 84, 255))
    context = repeat_sprite(floor, 6, 3)
    run = [
        sprites["service_counter_left_end"],
        sprites["service_counter_straight"],
        sprites["service_counter_straight"],
        sprites["service_counter_right_end"],
    ]
    for index, sprite in enumerate(run):
        context.alpha_composite(sprite, ((index + 1) * TILE_SIZE, TILE_SIZE))
    context.alpha_composite(sprites["service_counter_corner"], (4 * TILE_SIZE, 2 * TILE_SIZE))
    return context.resize((context.width * 3, context.height * 3), Image.Resampling.NEAREST)


def make_counter_family_context(
    sprites: dict[str, Image.Image],
    manifest: dict,
    manifest_path: Path,
) -> Image.Image | None:
    required = [
        "service_counter_vertical",
        "service_counter_corner_left",
        "service_counter_corner_right",
    ]
    if any(asset_id not in sprites for asset_id in required):
        return None

    context_assets = manifest.get("context_assets", {})
    horizontal_value = context_assets.get("service_counter_straight")
    floor_value = context_assets.get("floor")
    if horizontal_value is None or floor_value is None:
        return None
    horizontal = Image.open(resolve_path(horizontal_value, manifest_path)).convert("RGBA")
    floor = Image.open(resolve_path(floor_value, manifest_path)).convert("RGBA")
    if horizontal.size != (TILE_SIZE, TILE_SIZE) or floor.size != (TILE_SIZE, TILE_SIZE):
        raise ValueError("Counter-family context assets must be 48x48")

    context = repeat_sprite(floor, 7, 6)
    vertical = sprites["service_counter_vertical"]
    for row in range(3):
        context.alpha_composite(vertical, (TILE_SIZE, row * TILE_SIZE))
        context.alpha_composite(vertical, (5 * TILE_SIZE, row * TILE_SIZE))
    context.alpha_composite(sprites["service_counter_corner_left"], (TILE_SIZE, 3 * TILE_SIZE))
    for column in range(2, 5):
        context.alpha_composite(horizontal, (column * TILE_SIZE, 3 * TILE_SIZE))
    context.alpha_composite(sprites["service_counter_corner_right"], (5 * TILE_SIZE, 3 * TILE_SIZE))

    return contain_nearest(context, (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE))


def make_counter_ends_context(
    sprites: dict[str, Image.Image],
    manifest: dict,
    manifest_path: Path,
) -> Image.Image | None:
    required = ["service_counter_end_left", "service_counter_end_right"]
    if any(asset_id not in sprites for asset_id in required):
        return None

    context_assets = manifest.get("context_assets", {})
    horizontal_value = context_assets.get("service_counter_straight")
    floor_value = context_assets.get("floor")
    if horizontal_value is None or floor_value is None:
        return None
    horizontal = Image.open(resolve_path(horizontal_value, manifest_path)).convert("RGBA")
    floor = Image.open(resolve_path(floor_value, manifest_path)).convert("RGBA")
    if horizontal.size != (TILE_SIZE, TILE_SIZE) or floor.size != (TILE_SIZE, TILE_SIZE):
        raise ValueError("Counter-end context assets must be 48x48")

    context = repeat_sprite(floor, 7, 3)
    row_y = TILE_SIZE
    context.alpha_composite(sprites["service_counter_end_left"], (TILE_SIZE, row_y))
    for column in range(2, 5):
        context.alpha_composite(horizontal, (column * TILE_SIZE, row_y))
    context.alpha_composite(sprites["service_counter_end_right"], (5 * TILE_SIZE, row_y))
    return contain_nearest(context, (TILE_SIZE * PREVIEW_SCALE, TILE_SIZE * PREVIEW_SCALE))


def build_sheet(
    specs: list[dict],
    raw_sources: dict[str, Image.Image],
    sprites: dict[str, Image.Image],
    contexts: dict[str, Image.Image],
) -> Image.Image:
    margin = 24
    label_width = 260
    panel_size = TILE_SIZE * PREVIEW_SCALE
    gap = 16
    header_height = 78
    row_height = panel_size + 42
    width = margin * 2 + label_width + panel_size * 3 + gap * 3
    height = margin * 2 + header_height + row_height * len(specs)
    sheet = Image.new("RGBA", (width, height), SHEET_BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    draw.text((margin, margin), "CAFFEINE PROTOCOL — 48PX ASSET APPROVAL", fill=SHEET_TEXT, font=font)
    draw.text(
        (margin, margin + 22),
        "SOURCE CANDIDATE  |  EXACT 48PX (nearest enlarged)  |  CHECKER  |  CONTEXT",
        fill=SHEET_MUTED,
        font=font,
    )

    top = margin + header_height
    for row, spec in enumerate(specs):
        asset_id = spec["id"]
        y = top + row * row_height
        draw.rounded_rectangle(
            (margin, y, width - margin, y + row_height - 12),
            radius=8,
            fill=SHEET_PANEL,
        )
        draw.text((margin + 14, y + 18), f"{row + 1}. {asset_id}", fill=SHEET_TEXT, font=font)
        category = "opaque repeatable tile" if not spec.get("transparent") else "transparent prop/tile"
        draw.text((margin + 14, y + 42), category, fill=SHEET_MUTED, font=font)

        x = margin + label_width
        source_panel = contain(raw_sources[asset_id], (panel_size, panel_size))
        sheet.alpha_composite(source_panel, (x, y + 10))
        x += panel_size + gap
        sheet.alpha_composite(nearest_preview(sprites[asset_id]), (x, y + 10))
        x += panel_size + gap
        sheet.alpha_composite(checker_preview(sprites[asset_id]), (x, y + 10))
        x += panel_size + gap
        sheet.alpha_composite(contexts[asset_id], (x, y + 10))

    return sheet


def main() -> None:
    args = parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    output_dir = args.output_dir.expanduser().resolve()
    sprite_dir = output_dir / "sprites"
    preview_dir = output_dir / "previews"
    sprite_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    manifest = json.loads(manifest_path.read_text())
    specs = manifest.get("assets", [])
    if not specs:
        raise ValueError("Candidate manifest has no assets")
    asset_ids = [spec["id"] for spec in specs]
    if len(asset_ids) != len(set(asset_ids)):
        raise ValueError("Candidate manifest contains duplicate asset ids")

    raw_sources: dict[str, Image.Image] = {}
    sprites: dict[str, Image.Image] = {}
    contexts: dict[str, Image.Image] = {}
    for spec in specs:
        asset_id = spec["id"]
        source = resolve_path(spec["source"], manifest_path)
        raw_source = resolve_path(spec.get("raw_source", spec["source"]), manifest_path)
        if not source.exists():
            raise FileNotFoundError(f"Missing processed source for {asset_id}: {source}")
        if not raw_source.exists():
            raise FileNotFoundError(f"Missing raw source for {asset_id}: {raw_source}")

        sprite = make_sprite(source, spec)
        validate_sprite(spec, sprite)
        sprite.save(sprite_dir / f"{asset_id}.png")
        raw_sources[asset_id] = Image.open(raw_source).convert("RGBA")
        sprites[asset_id] = sprite
        if spec.get("preview_mode") == "horizontal_repeat":
            contexts[asset_id] = horizontal_context(sprite)
        elif spec.get("preview_mode") == "vertical_repeat":
            contexts[asset_id] = vertical_context(sprite)
        elif spec.get("transparent"):
            contexts[asset_id] = checker_preview(sprite)
        else:
            contexts[asset_id] = floor_context(sprite)
        contexts[asset_id].save(preview_dir / f"{asset_id}_context.png")

    counter_family = make_counter_family_context(sprites, manifest, manifest_path)
    if counter_family is not None:
        counter_family.save(output_dir / "counter_family_context.png")
        for spec in specs:
            if spec.get("preview_mode") == "counter_family":
                contexts[spec["id"]] = counter_family
                counter_family.save(preview_dir / f"{spec['id']}_context.png")

    counter_ends = make_counter_ends_context(sprites, manifest, manifest_path)
    if counter_ends is not None:
        counter_ends.save(output_dir / "counter_ends_context.png")
        for spec in specs:
            if spec.get("preview_mode") == "counter_ends":
                contexts[spec["id"]] = counter_ends
                counter_ends.save(preview_dir / f"{spec['id']}_context.png")

    floor = sprites.get("kitchen_floor_utility_checker")
    if floor is not None:
        repetition = repeat_sprite(floor, 8, 6)
        repetition.save(output_dir / "kitchen_floor_8x6.png")

    counter_run = make_counter_run(sprites)
    if counter_run is not None:
        counter_run.save(output_dir / "counter_run.png")

    sheet = build_sheet(specs, raw_sources, sprites, contexts)
    sheet.save(output_dir / "approval_sheet.png")
    print(f"Wrote preview-only approval artifacts to {output_dir}")


if __name__ == "__main__":
    main()
