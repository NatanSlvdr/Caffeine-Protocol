extends Control

const GAME_SCENE := "res://scenes/game/Game.tscn"
const SETTINGS_SCENE := "res://scenes/menus/Settings.tscn"

func _ready() -> void:
	%PlayButton.pressed.connect(func() -> void: get_tree().change_scene_to_file(GAME_SCENE))
	%SettingsButton.pressed.connect(func() -> void: get_tree().change_scene_to_file(SETTINGS_SCENE))
	%QuitButton.pressed.connect(func() -> void: get_tree().quit())
