from __future__ import annotations

from pathlib import Path
import json

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
PROMPT_MANIFEST_PATH = ROOT / "assets/prompts/cafe_assets_48.json"
TILE_DIR = ROOT / "assets/tiles"
TILESET_DIR = ROOT / "assets/tilesets"
PREVIEW_DIR = ROOT / "assets/previews"
ATLAS_PATH = TILESET_DIR / "cafe_tiles_atlas_48.png"
PREVIEW_PATH = PREVIEW_DIR / "cafe_assets_48_preview.png"
MANIFEST_PATH = TILESET_DIR / "cafe_assets_48_manifest.json"

TILE_SIZE = 48
PREVIEW_SCALE = 6


def source_path(spec: dict) -> Path:
    return ROOT / spec["source"]


def asset_output_path(name: str) -> Path:
    return TILE_DIR / f"{name}.png"


def premultiplied_resize(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    red, green, blue, alpha = source.split()
    premultiplied = Image.merge(
        "RGBA",
        [
            ImageChops.multiply(red, alpha),
            ImageChops.multiply(green, alpha),
            ImageChops.multiply(blue, alpha),
            alpha,
        ],
    )

    resized = premultiplied.resize(
        size,
        Image.Resampling.LANCZOS,
    )
    pixels = resized.load()
    for y in range(resized.height):
        for x in range(resized.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            pixels[x, y] = (
                min(255, round(red * 255 / alpha)),
                min(255, round(green * 255 / alpha)),
                min(255, round(blue * 255 / alpha)),
                alpha,
            )
    return resized


def hard_alpha(image: Image.Image, threshold: int = 96) -> Image.Image:
    red, green, blue, alpha = image.split()
    alpha = alpha.point(lambda value: 255 if value >= threshold else 0)
    output = Image.merge("RGBA", (red, green, blue, alpha))
    pixels = output.load()
    for y in range(output.height):
        for x in range(output.width):
            if pixels[x, y][3] == 0:
                pixels[x, y] = (0, 0, 0, 0)
    return output


def sharpen(image: Image.Image) -> Image.Image:
    red, green, blue, alpha = image.split()
    rgb = Image.merge("RGB", (red, green, blue)).filter(
        ImageFilter.UnsharpMask(radius=0.6, percent=130, threshold=2),
    )
    return Image.merge("RGBA", (*rgb.split(), alpha))


def apply_sprite_postprocess(image: Image.Image, spec: dict) -> Image.Image:
    output = image.copy()
    draw = ImageDraw.Draw(output)
    outline_lines = {
        "top_outline_color": (0, 0, output.width - 1, 0),
        "right_outline_color": (output.width - 1, 0, output.width - 1, output.height - 1),
        "bottom_outline_color": (0, output.height - 1, output.width - 1, output.height - 1),
        "left_outline_color": (0, 0, 0, output.height - 1),
    }
    for field, line in outline_lines.items():
        outline_color = spec.get(field)
        if outline_color is None:
            continue
        if not isinstance(outline_color, list) or len(outline_color) not in (3, 4):
            raise ValueError(f"{spec['id']} {field} must contain 3 or 4 channels")
        color = tuple(int(channel) for channel in outline_color)
        if len(color) == 3:
            color = (*color, 255)
        draw.line(line, fill=color, width=1)
    return output


def make_sprite(source: Path, spec: dict) -> Image.Image:
    resize_mode = spec.get("resize_mode", "direct")
    target_size = tuple(spec.get("target_size", [TILE_SIZE, TILE_SIZE]))
    image = Image.open(source).convert("RGBA")
    source_crop_mode = spec.get("source_crop_mode", "none")
    if source_crop_mode == "alpha_vertical":
        alpha_bounds = image.getchannel("A").getbbox()
        if alpha_bounds is None:
            raise ValueError(f"{spec['id']} source produced an empty sprite")
        image = image.crop((0, alpha_bounds[1], image.width, alpha_bounds[3]))
    elif source_crop_mode != "none":
        raise ValueError(f"Unknown source_crop_mode: {source_crop_mode}")
    if resize_mode == "premultiplied_hard_alpha_sharp":
        image = premultiplied_resize(image, target_size)
        image = hard_alpha(image)
        return apply_sprite_postprocess(sharpen(image), spec)
    if resize_mode == "premultiplied_hard_alpha_sharp_fit_bounds":
        image = premultiplied_resize(image, target_size)
        image = hard_alpha(image)
        image = sharpen(image)
        fit_bounds = spec["fit_bounds"]
        content_bounds = image.getbbox()
        if content_bounds is None:
            raise ValueError(f"{spec['id']} source produced an empty sprite")
        content = image.crop(content_bounds)
        fit_width = int(fit_bounds[2]) - int(fit_bounds[0])
        fit_height = int(fit_bounds[3]) - int(fit_bounds[1])
        fitted = content.resize((fit_width, fit_height), Image.Resampling.LANCZOS)
        fitted = hard_alpha(fitted)
        output = Image.new("RGBA", target_size, (0, 0, 0, 0))
        output.alpha_composite(fitted, (int(fit_bounds[0]), int(fit_bounds[1])))
        return apply_sprite_postprocess(output, spec)
    if resize_mode != "direct":
        raise ValueError(f"Unknown resize_mode: {resize_mode}")

    return apply_sprite_postprocess(
        image.resize(
            target_size,
            Image.Resampling.LANCZOS,
        ),
        spec,
    )


def split_sprite(sprite: Image.Image, spec: dict) -> list[tuple[str, Image.Image, list[int]]]:
    columns, rows = spec.get("split", [1, 1])
    if sprite.size != (columns * TILE_SIZE, rows * TILE_SIZE):
        raise ValueError(
            f"{spec['id']} sprite is {sprite.size}, expected "
            f"{columns * TILE_SIZE}x{rows * TILE_SIZE}"
        )

    if columns == 1 and rows == 1:
        return [(spec["id"], sprite, [0, 0])]

    pieces: list[tuple[str, Image.Image, list[int]]] = []
    for row in range(rows):
        for column in range(columns):
            suffix = ["top", "bottom"][row] + "_" + ["left", "right"][column]
            name = f"{spec['id']}_{suffix}"
            bounds = (
                column * TILE_SIZE,
                row * TILE_SIZE,
                (column + 1) * TILE_SIZE,
                (row + 1) * TILE_SIZE,
            )
            pieces.append((name, sprite.crop(bounds), [column, row]))
    return pieces


def make_preview(atlas: Image.Image) -> Image.Image:
    return atlas.resize(
        (atlas.width * PREVIEW_SCALE, atlas.height * PREVIEW_SCALE),
        Image.Resampling.NEAREST,
    )


def main() -> None:
    prompt_manifest = json.loads(PROMPT_MANIFEST_PATH.read_text())
    assets = prompt_manifest["assets"]
    TILE_DIR.mkdir(parents=True, exist_ok=True)
    TILESET_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    output_tiles: list[dict] = []
    for spec in assets:
        sprite = make_sprite(source_path(spec), spec)
        for piece_name, image, piece_coord in split_sprite(sprite, spec):
            output_tiles.append({
                "spec": spec,
                "name": piece_name,
                "image": image,
                "piece_coord": piece_coord,
            })

        preview_path = spec.get("preview")
        if preview_path:
            (ROOT / preview_path).parent.mkdir(parents=True, exist_ok=True)
            sprite.save(ROOT / preview_path)

    atlas = Image.new("RGBA", (TILE_SIZE * len(output_tiles), TILE_SIZE), (0, 0, 0, 0))
    manifest = {
        "version": 1,
        "tile_size": TILE_SIZE,
        "columns": len(output_tiles),
        "rows": 1,
        "source_prompt_manifest": str(PROMPT_MANIFEST_PATH.relative_to(ROOT)),
        "style": "accepted source art converted into 48x48 atlas tiles",
        "tiles": [],
    }

    for index, output_tile in enumerate(output_tiles):
        spec = output_tile["spec"]
        source = source_path(spec)
        image = output_tile["image"]
        output_path = asset_output_path(output_tile["name"])
        image.save(output_path)
        atlas.alpha_composite(image, (index * TILE_SIZE, 0))
        manifest["tiles"].append({
            "name": output_tile["name"],
            "category": spec["category"],
            "file": str(output_path.relative_to(ROOT)),
            "source": str(source.relative_to(ROOT)),
            "size": [TILE_SIZE, TILE_SIZE],
            "transparent": bool(spec["transparent"]),
            "tags": [spec["tile_role"], spec["palette_lane"]],
            "atlas_coord": [index, 0],
            "expected_bounds": spec["expected_bounds"],
            "resize_mode": spec.get("resize_mode", "direct"),
            "asset_id": spec["id"],
            "piece_coord": output_tile["piece_coord"],
            "footprint": spec.get("split", [1, 1]),
        })

    atlas.save(ATLAS_PATH)
    make_preview(atlas).save(PREVIEW_PATH)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print("Wrote %s" % ATLAS_PATH.relative_to(ROOT))
    print("Wrote %s" % PREVIEW_PATH.relative_to(ROOT))
    print("Wrote %s" % MANIFEST_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
