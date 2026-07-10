extends SceneTree

const TILE_SIZE := Vector2i(48, 48)
const ATLAS_PATH := "res://assets/tilesets/cafe_tiles_atlas_48.png"
const TILESET_PATH := "res://assets/tilesets/cafe_assets_48.tres"
const MANIFEST_PATH := "res://assets/tilesets/cafe_assets_48_manifest.json"

func _init() -> void:
	var manifest_file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if manifest_file == null:
		push_error("Could not read manifest at %s" % MANIFEST_PATH)
		quit(1)
		return

	var manifest = JSON.parse_string(manifest_file.get_as_text())
	if typeof(manifest) != TYPE_DICTIONARY:
		push_error("Invalid manifest JSON at %s" % MANIFEST_PATH)
		quit(1)
		return

	var expected_columns: int = len(manifest.get("tiles", []))
	var texture := ResourceLoader.load(
		ATLAS_PATH,
		"Texture2D",
		ResourceLoader.CACHE_MODE_REPLACE,
	) as Texture2D
	if texture == null:
		push_error("Could not load tile atlas texture at %s" % ATLAS_PATH)
		quit(1)
		return
	if texture.get_width() < expected_columns * TILE_SIZE.x:
		push_error(
			"Tile atlas texture is stale: expected at least %d px wide, got %d"
			% [expected_columns * TILE_SIZE.x, texture.get_width()]
		)
		quit(1)
		return

	var source := TileSetAtlasSource.new()
	source.texture = texture
	source.texture_region_size = TILE_SIZE

	for tile: Dictionary in manifest.get("tiles", []):
		var coord: Array = tile.get("atlas_coord", [0, 0])
		source.create_tile(Vector2i(int(coord[0]), int(coord[1])))

	var tile_set := TileSet.new()
	tile_set.tile_size = TILE_SIZE
	tile_set.add_source(source, 0)

	var error := ResourceSaver.save(tile_set, TILESET_PATH)
	if error != OK:
		push_error("Could not save TileSet at %s: %s" % [TILESET_PATH, error])
		quit(1)
		return

	print("Wrote %s" % TILESET_PATH)
	quit(0)
