extends Control

const MAIN_MENU_SCENE := "res://scenes/menus/MainMenu.tscn"

func _ready() -> void:
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(520, 540)
	card.add_theme_stylebox_override("panel", GameTheme.panel(Color("23372f"), 26))
	center.add_child(card)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 16)
	card.add_child(column)
	var title := Label.new()
	title.text = "MAKE YOURSELF AT HOME"
	title.add_theme_font_size_override("font_size", 23)
	title.add_theme_color_override("font_color", Color("eac388"))
	column.add_child(title)
	_volume(column, "Master volume", "volume", 0.6)
	_volume(column, "Café music", "music", 0.55)
	_volume(column, "Little sounds", "effects", 0.65)
	var fullscreen := CheckButton.new()
	fullscreen.text = "Fullscreen"
	fullscreen.button_pressed = DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN
	fullscreen.toggled.connect(func(enabled: bool) -> void:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if enabled else DisplayServer.WINDOW_MODE_WINDOWED)
		Progress.data.set_value("settings", "fullscreen", enabled)
		Progress.save())
	column.add_child(fullscreen)
	var motion := CheckButton.new()
	motion.text = "Reduce decorative motion"
	motion.button_pressed = bool(Progress.data.get_value("settings", "reduced_motion", false))
	motion.toggled.connect(func(enabled: bool) -> void:
		Progress.data.set_value("settings", "reduced_motion", enabled)
		Progress.save())
	column.add_child(motion)
	var caption := Label.new()
	caption.text = "Your café, your pace. Settings save automatically."
	caption.add_theme_font_size_override("font_size", 13)
	caption.add_theme_color_override("font_color", Color("a5b598"))
	column.add_child(caption)
	var back := Button.new()
	back.text = "Back to the café"
	back.theme_type_variation = "PrimaryButton"
	back.pressed.connect(_back)
	column.add_child(back)
	back.grab_focus()

func _volume(parent: Node, title: String, key: String, fallback: float) -> void:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	parent.add_child(row)
	var label := Label.new()
	var value := float(Progress.data.get_value("settings", key, fallback))
	label.text = "%s  ·  %s%%" % [title, roundi(value * 100)]
	row.add_child(label)
	var slider := HSlider.new()
	slider.max_value = 100
	slider.value = value * 100
	slider.custom_minimum_size.y = 24
	slider.value_changed.connect(func(next_value: float) -> void:
		Progress.data.set_value("settings", key, next_value / 100.0)
		if key == "volume":
			AudioServer.set_bus_volume_db(0, linear_to_db(next_value / 100.0))
		Sound.apply_settings()
		Progress.save()
		label.text = "%s  ·  %s%%" % [title, roundi(next_value)])
	row.add_child(slider)

func _back() -> void:
	get_tree().change_scene_to_file(MAIN_MENU_SCENE)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_back()
