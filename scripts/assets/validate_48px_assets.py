from __future__ import annotations

from pathlib import Path
import json
import sys

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
TILE_SIZE = 48
MANIFEST_PATH = ROOT / "assets/tilesets/cafe_assets_48_manifest.json"
ATLAS_PATH = ROOT / "assets/tilesets/cafe_tiles_atlas_48.png"
TILESET_PATH = ROOT / "assets/tilesets/cafe_assets_48.tres"
CAFE_ROOM_PATH = ROOT / "scenes/cafe/CafeRoom.tscn"


def alpha_bounds(image: Image.Image) -> tuple[int, int]:
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    bbox = image.getbbox()
    if bbox is None:
        return (0, 0)
    left, top, right, bottom = bbox
    return (right - left, bottom - top)


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_manifest(errors: list[str]) -> dict:
    if not MANIFEST_PATH.exists():
        fail(errors, f"Missing manifest: {MANIFEST_PATH.relative_to(ROOT)}")
        return {"tiles": []}

    manifest = json.loads(MANIFEST_PATH.read_text())
    if manifest.get("tile_size") != TILE_SIZE:
        fail(errors, "Manifest tile_size must be 48")

    for tile in manifest.get("tiles", []):
        required = ["name", "category", "file", "source", "size", "transparent", "tags"]
        for key in required:
            if key not in tile:
                fail(errors, f"{tile.get('name', '<unnamed>')} missing manifest key: {key}")

        if tile.get("size") != [TILE_SIZE, TILE_SIZE]:
            fail(errors, f"{tile.get('name')} manifest size must be [48, 48]")

        file_path = ROOT / tile.get("file", "")
        source_path = ROOT / tile.get("source", "")
        if not file_path.exists():
            fail(errors, f"Missing final asset: {tile.get('file')}")
            continue
        if not source_path.exists():
            fail(errors, f"Missing source asset: {tile.get('source')}")

        with Image.open(file_path) as image:
            if image.size != (TILE_SIZE, TILE_SIZE):
                fail(errors, f"{tile.get('file')} is {image.size}, expected 48x48")
            if tile.get("transparent"):
                width, height = alpha_bounds(image)
                expected = tile.get("expected_bounds", [0, TILE_SIZE])
                min_bound = int(expected[0])
                max_bound = int(expected[1])
                largest_bound = max(width, height)
                if largest_bound < min_bound:
                    fail(errors, f"{tile.get('name')} is too small in frame: {width}x{height}")
                if largest_bound > max_bound:
                    fail(errors, f"{tile.get('name')} is too large in frame: {width}x{height}")
                alpha_histogram = image.getchannel("A").histogram()
                has_soft_alpha = any(alpha_histogram[value] for value in range(1, 255))
                if has_soft_alpha:
                    fail(errors, f"{tile.get('name')} must use hard alpha after 48px resize")

    return manifest


def validate_atlas(errors: list[str], manifest: dict) -> None:
    if not ATLAS_PATH.exists():
        fail(errors, f"Missing atlas: {ATLAS_PATH.relative_to(ROOT)}")
        return
    with Image.open(ATLAS_PATH) as atlas:
        if atlas.width % TILE_SIZE != 0 or atlas.height % TILE_SIZE != 0:
            fail(errors, f"Atlas dimensions must be multiples of 48, got {atlas.size}")
        expected_width = len(manifest.get("tiles", [])) * TILE_SIZE
        if atlas.size != (expected_width, TILE_SIZE):
            fail(errors, f"Atlas size {atlas.size} does not match manifest layout {(expected_width, TILE_SIZE)}")


def validate_tileset(errors: list[str]) -> None:
    if not TILESET_PATH.exists():
        fail(errors, f"Missing TileSet: {TILESET_PATH.relative_to(ROOT)}")
        return

    text = TILESET_PATH.read_text()
    if "texture_region_size = Vector2i(48, 48)" not in text:
        fail(errors, "TileSet texture_region_size must be Vector2i(48, 48)")
    if "tile_size = Vector2i(48, 48)" not in text:
        fail(errors, "TileSet tile_size must be Vector2i(48, 48)")
    for x, tile in enumerate(json.loads(MANIFEST_PATH.read_text()).get("tiles", [])):
        atlas_coord = tile.get("atlas_coord", [x, 0])
        serialized_tile = f"{int(atlas_coord[0])}:{int(atlas_coord[1])}/0 = 0"
        if serialized_tile not in text:
            fail(errors, f"TileSet is missing atlas tile entry for {tile.get('name')}: {serialized_tile}")


def validate_cafe_room(errors: list[str]) -> None:
    if not CAFE_ROOM_PATH.exists():
        fail(errors, f"Missing cafe room scene: {CAFE_ROOM_PATH.relative_to(ROOT)}")
        return

    text = CAFE_ROOM_PATH.read_text()
    expected_layers = ["Floor", "Walls", "Furniture", "Objects"]
    if text.count('type="TileMapLayer"') < len(expected_layers):
        fail(errors, "CafeRoom must use TileMapLayer nodes for Floor, Walls, Furniture, and Objects")
    for layer_name in expected_layers:
        marker = f'node name="{layer_name}" type="TileMapLayer"'
        if marker not in text:
            fail(errors, f"CafeRoom must include a {layer_name} TileMapLayer")
    layer_positions = [text.find(f'node name="{layer_name}" type="TileMapLayer"') for layer_name in expected_layers]
    if all(position >= 0 for position in layer_positions) and layer_positions != sorted(layer_positions):
        fail(errors, "CafeRoom TileMapLayer order must be Floor, Walls, Furniture, Objects")
    if "tile_set = ExtResource" not in text:
        fail(errors, "CafeRoom TileMapLayer must reference the shared TileSet resource")
    if "tile_map_data = PackedByteArray" not in text:
        fail(errors, "CafeRoom TileMapLayer must contain painted tile cell data")
    if 'type="TextureRect"' in text:
        fail(errors, "CafeRoom floor must not use TextureRect tiling")


def main() -> int:
    errors: list[str] = []
    manifest = validate_manifest(errors)
    validate_atlas(errors, manifest)
    validate_tileset(errors)
    validate_cafe_room(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("48px asset validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
