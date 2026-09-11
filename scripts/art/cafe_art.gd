class_name CafeArt
extends Node2D

# A portrait room built exclusively from the existing tile sheets and actor atlas.
const CHARACTERS := preload("res://assets/art/characters.png")
const TILES := preload("res://assets/tiles/cafe_tiles.tres")
const PROPS := preload("res://assets/tiles/tile-B-01.png")
const ROOM_SIZE := Vector2i(336, 456)
const ENTRANCE := Vector2(204, 450)
const ORDER_POINT := Vector2(100, 416)
const QUERY_POINT := Vector2(76, 371)
const MACHINE := Vector2(54, 101)
const STAFF_DOOR := Vector2(216, 162)
const PASS_INSIDE := Vector2(264, 128)
const PASS_CUP := Vector2(264, 136)
const PASS_OUTSIDE := Vector2(264, 181)
const TABLES := [Vector2(168, 220), Vector2(288, 220), Vector2(168, 268), Vector2(288, 268), Vector2(168, 316), Vector2(288, 316), Vector2(168, 364), Vector2(288, 364), Vector2(168, 412), Vector2(288, 412)]
var atlas: SpriteAtlas
var clock := 0.0
var service_phase := 0.0
var serving := false
var successful := true
var asked_help := false
var customer_number := 0
var queue_count := 0
var drink_item := "coffee"
var celebration := false
var evening := false
var reduced_motion := false
var awake := true
var playback_paused := false
var active_tables := 4:
	set(value):
		active_tables = clampi(value, 2, 10)
		if is_instance_valid(seating): _build_seating()
var seating: TileMapLayer
var room: Node2D

func _ready() -> void:
	atlas = SpriteAtlas.new(CHARACTERS)
	room = Node2D.new()
	room.scale = Vector2.ONE * 0.5
	room.z_index = -1
	add_child(room)
	var floor := _layer("Floor")
	for y in range(19):
		for x in range(14):
			floor.set_cell(Vector2i(x, y), 1, Vector2i(4, 0) if y < 6 else Vector2i(x % 4, y % 4))
	var walls := _layer("Walls")
	for x in range(14):
		_stamp(walls, Vector2i(x, 0), 2, Rect2i(8 + x % 2, 0, 1, 2))
	_stamp(walls, Vector2i(9, 0), 2, Rect2i(6, 0, 2, 2))
	# A real wall encloses the kitchen; only a staff door and service hatch stay open.
	for x in [0, 1, 2, 3, 4, 5, 6, 7, 13]:
		_stamp(walls, Vector2i(x, 5), 2, Rect2i(8 + x % 2, 0, 1, 2))
	var furniture := _layer("Equipment")
	_stamp(furniture, Vector2i(1, 2), 5, Rect2i(0, 0, 2, 2))
	_stamp(furniture, Vector2i(4, 2), 5, Rect2i(8, 10, 2, 2))
	_stamp(furniture, Vector2i(7, 2), 5, Rect2i(14, 6, 2, 2))
	_stamp(furniture, Vector2i(11, 2), 5, Rect2i(6, 2, 2, 2))
	# The pickup hatch and the till are separate props in separate parts of the room.
	var counters := _layer("Counters")
	_stamp(counters, Vector2i(10, 5), 1, Rect2i(11, 2, 2, 2))
	_stamp(counters, Vector2i(12, 5), 1, Rect2i(12, 2, 1, 2))
	_stamp(counters, Vector2i(1, 15), 2, Rect2i(0, 8, 4, 2))
	seating = _layer("Tables")
	_build_seating()
	var decor := _layer("Decor")
	_stamp(decor, Vector2i(0, 7), 6, Rect2i(2, 2, 1, 2))
	_stamp(decor, Vector2i(0, 11), 6, Rect2i(0, 2, 1, 2))
	_stamp(decor, Vector2i(1, 9), 6, Rect2i(8, 4, 2, 2))
	_stamp(decor, Vector2i(1, 18), 2, Rect2i(6, 12, 2, 1))

func _layer(label: String) -> TileMapLayer:
	var layer := TileMapLayer.new()
	layer.name = label
	layer.tile_set = TILES
	room.add_child(layer)
	return layer

func _stamp(layer: TileMapLayer, at: Vector2i, sheet: int, region: Rect2i) -> void:
	for y in range(region.size.y):
		for x in range(region.size.x):
			layer.set_cell(at + Vector2i(x, y), sheet, region.position + Vector2i(x, y))

func _process(delta: float) -> void:
	if not reduced_motion and not playback_paused: clock += delta
	if is_instance_valid(room): room.modulate = Color("e4dfeb") if evening else Color.WHITE
	queue_redraw()

# Arc-length interpolation keeps actors on connected paths without jumping at phase boundaries.
static func along(points: PackedVector2Array, progress: float) -> Vector2:
	var length := 0.0
	for i in range(1, points.size()): length += points[i - 1].distance_to(points[i])
	var remaining := length * clampf(progress, 0, 1)
	for i in range(1, points.size()):
		var segment := points[i - 1].distance_to(points[i])
		if remaining <= segment: return points[i - 1].lerp(points[i], remaining / maxf(segment, 0.001))
		remaining -= segment
	return points[-1]

func stage_name() -> String:
	if not serving: return "Ready to open" if not celebration else "Service complete"
	if not successful: return "Order needs attention"
	var phase := service_phase
	if phase < 0.20: return "Taking the order"
	if phase < 0.43: return "Preparing the drink"
	if phase < 0.58: return "Ready at the pickup counter"
	if phase < 0.70: return "Delivering to table %02d" % (customer_number + 1)
	if phase < 0.87: return "Customer enjoying the drink"
	if phase < 0.90: return "Cleaning the table"
	return "Returning to the station"

# Positions are pure functions of the replay phase, so pause, stepping and replay agree.
func actor_state() -> Dictionary:
	var p := clampf(service_phase, 0, 1) if serving else 0.0
	var machine := Vector2(120, 101) if drink_item == "tea" else MACHINE
	var table: Vector2 = TABLES[customer_number % active_tables]
	var seat := table + Vector2(20 if customer_number % 2 == 0 else -20, 9)
	var front := table + Vector2(0, 22)
	var to_seat := PackedVector2Array([ORDER_POINT, Vector2(120, 440), Vector2(216, 440), Vector2(216, table.y + 24), Vector2(seat.x, table.y + 24), seat])
	var intake_to_kitchen := PackedVector2Array([QUERY_POINT, Vector2(120, 339), Vector2(120, 181), Vector2(216, 181), STAFF_DOOR, Vector2(216, 111), machine])
	var to_pass := PackedVector2Array([machine, Vector2(180, 111), Vector2(264, 111), PASS_INSIDE])
	var through_door := PackedVector2Array([PASS_INSIDE, Vector2(264, 111), Vector2(216, 111), STAFF_DOOR, Vector2(216, 181), PASS_OUTSIDE])
	var to_table := PackedVector2Array([PASS_OUTSIDE, Vector2(216, 181), Vector2(216, front.y), front])
	var customer := along(PackedVector2Array([ENTRANCE, Vector2(128, 440), ORDER_POINT]), p / 0.12)
	if p >= 0.20 and successful: customer = along(to_seat, (p - 0.20) / 0.14)
	if p >= 0.76 and successful:
		var exit_path := PackedVector2Array([seat, Vector2(seat.x, table.y + 24), Vector2(216, table.y + 24), Vector2(216, 442), ENTRANCE])
		customer = along(exit_path, (p - 0.76) / 0.11)
	var niko := machine if awake else QUERY_POINT
	if serving and successful:
		if not awake and p >= 0.20: niko = along(intake_to_kitchen, (p - 0.20) / 0.14)
		if p >= 0.43: niko = along(to_pass, (p - 0.43) / 0.07)
		if awake and p >= 0.58:
			var back := to_pass.duplicate()
			back.reverse()
			niko = along(back, (p - 0.58) / 0.12)
		if not awake and p >= 0.50: niko = along(through_door, (p - 0.50) / 0.08)
		if not awake and p >= 0.58: niko = along(to_table, (p - 0.58) / 0.12)
		if not awake and p >= 0.90:
			niko = along(PackedVector2Array([front, Vector2(216, front.y), Vector2(216, 339), Vector2(72, 339), QUERY_POINT]), (p - 0.90) / 0.10)
	var server := PASS_OUTSIDE
	if serving and successful and p >= 0.58: server = along(to_table, (p - 0.58) / 0.12)
	if serving and successful and p >= 0.90:
		var back := to_table.duplicate()
		back.reverse()
		server = along(back, (p - 0.90) / 0.10)
	return {"niko": niko, "server": server, "customer": customer, "table": table, "customer_visible": serving and (p < 0.87 or not successful)}

func _draw() -> void:
	if atlas == null: return
	var state := actor_state()
	var p := service_phase
	atlas.draw_actor(self, 1, state.niko.round(), 27)
	atlas.draw_actor(self, 0, QUERY_POINT if awake else Vector2(30, 280), 27, false, Color.WHITE if awake else Color("899292"))
	if awake:
		atlas.draw_actor(self, 0, state.server.round(), 27)
	if state.customer_visible: atlas.draw_actor(self, 2 + customer_number % 3, state.customer.round(), 26)
	for i in range(mini(queue_count, 2)):
		if serving: atlas.draw_actor(self, 2 + (customer_number + i + 1) % 3, Vector2(148 + i * 26, 446), 25)
	atlas.draw_actor(self, 5, Vector2(26, 434), 12)
	if serving and successful:
		if p >= 0.43 and p < 0.50: _cup((state.niko + Vector2(8, -12)).lerp(PASS_CUP, clampf((p - 0.48) / 0.02, 0, 1)))
		if p >= 0.50 and p < 0.58: _cup(PASS_CUP.lerp((state.server if awake else state.niko) + Vector2(8, -12), clampf((p - 0.56) / 0.02, 0, 1)))
		if p >= 0.58 and p < 0.70: _cup((state.server if awake else state.niko) + Vector2(8, -12))
		if p >= 0.70 and p < 0.90: _cup(state.table)
		if p >= 0.87 and p < 0.90: _badge(state.table + Vector2(0, -15), "CLEANING")
	_badge(Vector2(164, 25), "02   KITCHEN")
	_badge(Vector2(264, 157), "03   PICKUP")
	_badge(Vector2(76, 393), "01   ORDERS")
	_badge(STAFF_DOOR, "STAFF")

func _badge(at: Vector2, text: String) -> void:
	var font := ThemeDB.fallback_font
	var width := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 8).x
	draw_style_box(GameTheme.panel(Color("223a3df2"), 3), Rect2(at - Vector2(width / 2 + 4, 9), Vector2(width + 8, 13)))
	draw_string(font, at - Vector2(width / 2, 0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 8, Color("f3ead6"))

func _cup(at: Vector2) -> void:
	draw_texture_rect_region(PROPS, Rect2(at - Vector2(4, 5), Vector2(8, 10)), Rect2(630, 421, 18, 22))

func _build_seating() -> void:
	seating.clear()
	for i in range(active_tables):
		var at: Vector2 = TABLES[i]
		_stamp(seating, Vector2i(int(at.x / 24) - 1, int((at.y - 28) / 24)), 0, Rect2i(0, 2, 2, 2))
