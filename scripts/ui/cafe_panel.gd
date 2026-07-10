class_name CafePanel
extends Control

const CafeRoomScene := preload("res://scenes/cafe/CafeRoom.tscn")

var level := {}
var result := {}
var debug_tickets := false
var cafe_room: Control

func _ready() -> void:
	cafe_room = CafeRoomScene.instantiate()
	add_child(cafe_room)
	_layout_cafe_room()

func set_state(next_level: Dictionary, next_result: Dictionary, show_debug: bool) -> void:
	level = next_level
	result = next_result
	debug_tickets = show_debug
	queue_redraw()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_cafe_room()

func _layout_cafe_room() -> void:
	if cafe_room == null:
		return

	var room_size := cafe_room.custom_minimum_size
	cafe_room.position = ((size - room_size) * 0.5).floor()
	cafe_room.size = room_size

func _draw() -> void:
	var panel := Rect2(Vector2.ZERO, size)
	draw_rect(panel, Color(0.12, 0.11, 0.09))
	if cafe_room != null:
		draw_rect(Rect2(cafe_room.position, cafe_room.size), Color(0.22, 0.2, 0.17), false, 2.0)
