extends Control

const MAIN_MENU_SCENE := "res://scenes/menus/MainMenu.tscn"

func _ready() -> void:
	var master_bus := AudioServer.get_bus_index("Master")
	if master_bus >= 0:
		%VolumeSlider.value = db_to_linear(AudioServer.get_bus_volume_db(master_bus)) * 100.0
	%VolumeSlider.value_changed.connect(_on_volume_changed)
	%FullscreenToggle.button_pressed = DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
	%FullscreenToggle.toggled.connect(_on_fullscreen_toggled)
	%BackButton.pressed.connect(func() -> void: get_tree().change_scene_to_file(MAIN_MENU_SCENE))

func _on_volume_changed(value: float) -> void:
	var master_bus := AudioServer.get_bus_index("Master")
	if master_bus >= 0:
		AudioServer.set_bus_volume_db(master_bus, linear_to_db(value / 100.0))

func _on_fullscreen_toggled(enabled: bool) -> void:
	var mode := DisplayServer.WINDOW_MODE_FULLSCREEN if enabled else DisplayServer.WINDOW_MODE_WINDOWED
	DisplayServer.window_set_mode(mode)
