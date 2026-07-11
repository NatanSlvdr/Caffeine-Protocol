extends Control

@export_multiline var story_text := "A new shift begins."
@export_file("*.tscn") var next_scene_path := "res://scenes/game/Game.tscn"

func _ready() -> void:
	%StoryText.text = story_text
	%ContinueButton.pressed.connect(_continue)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_accept"):
		_continue()

func _continue() -> void:
	if not next_scene_path.is_empty():
		get_tree().change_scene_to_file(next_scene_path)
