extends SceneTree

const TILESET_PATH := "res://assets/tilesets/cafe_assets_48.tres"
const CAFE_ROOM_PATH := "res://scenes/cafe/CafeRoom.tscn"
const ROOM_TILES := Vector2i(16, 10)
const TILE_SIZE := Vector2i(48, 48)
const FLOOR_SOURCE_ID := 0
const FLOOR_ATLAS_COORDS := Vector2i(0, 0)
const WALL_SOURCE_ID := 0
const WALL_ATLAS_COORDS := Vector2i(1, 0)

func _init() -> void:
	var tile_set := load(TILESET_PATH) as TileSet
	if tile_set == null:
		push_error("Could not load TileSet at %s" % TILESET_PATH)
		quit(1)
		return

	var room := Control.new()
	room.name = "CafeRoom"
	room.custom_minimum_size = Vector2(ROOM_TILES * TILE_SIZE)
	room.size = room.custom_minimum_size

	var floor := TileMapLayer.new()
	floor.name = "Floor"
	floor.tile_set = tile_set
	room.add_child(floor)
	floor.owner = room

	for y in ROOM_TILES.y:
		for x in ROOM_TILES.x:
			floor.set_cell(Vector2i(x, y), FLOOR_SOURCE_ID, FLOOR_ATLAS_COORDS)

	var walls := TileMapLayer.new()
	walls.name = "Walls"
	walls.tile_set = tile_set
	room.add_child(walls)
	walls.owner = room

	for x in ROOM_TILES.x:
		walls.set_cell(Vector2i(x, 0), WALL_SOURCE_ID, WALL_ATLAS_COORDS)
		walls.set_cell(Vector2i(x, ROOM_TILES.y - 1), WALL_SOURCE_ID, WALL_ATLAS_COORDS)
	for y in range(1, ROOM_TILES.y - 1):
		walls.set_cell(Vector2i(0, y), WALL_SOURCE_ID, WALL_ATLAS_COORDS)
		walls.set_cell(Vector2i(ROOM_TILES.x - 1, y), WALL_SOURCE_ID, WALL_ATLAS_COORDS)

	var furniture := TileMapLayer.new()
	furniture.name = "Furniture"
	furniture.tile_set = tile_set
	room.add_child(furniture)
	furniture.owner = room

	var objects := TileMapLayer.new()
	objects.name = "Objects"
	objects.tile_set = tile_set
	room.add_child(objects)
	objects.owner = room

	var packed_scene := PackedScene.new()
	var pack_error := packed_scene.pack(room)
	if pack_error != OK:
		push_error("Could not pack CafeRoom scene: %s" % pack_error)
		quit(1)
		return

	var save_error := ResourceSaver.save(packed_scene, CAFE_ROOM_PATH)
	if save_error != OK:
		push_error("Could not save CafeRoom scene at %s: %s" % [CAFE_ROOM_PATH, save_error])
		quit(1)
		return

	print("Wrote %s" % CAFE_ROOM_PATH)
	room.free()
	quit(0)
