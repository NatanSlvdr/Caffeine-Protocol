class_name CafePanel
extends Control

var level := {}
var result := {}
var debug_tickets := false

func set_state(next_level: Dictionary, next_result: Dictionary, show_debug: bool) -> void:
	level = next_level
	result = next_result
	debug_tickets = show_debug
	queue_redraw()

func _draw() -> void:
	var panel := Rect2(Vector2.ZERO, size)
	draw_rect(panel, Color(0.12, 0.11, 0.09))
