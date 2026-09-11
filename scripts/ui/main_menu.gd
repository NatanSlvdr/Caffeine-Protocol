extends Control

const GAME_SCENE := "res://scenes/menus/Campaign.tscn"
const SETTINGS_SCENE := "res://scenes/menus/Settings.tscn"
var art: CafeView

func _ready() -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 54)
	for side in ["top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 48)
	add_child(margin)
	var layout := HBoxContainer.new()
	layout.add_theme_constant_override("separation", 42)
	margin.add_child(layout)
	var left := VBoxContainer.new()
	left.custom_minimum_size.x = 320
	left.add_theme_constant_override("separation", 16)
	layout.add_child(left)
	_spacer(left)
	_label(left, "A SMALL CAFÉ. A FRESH START.", 12, Color("96ac91"))
	var title := preload("res://scripts/art/pixel_title.gd").new()
	title.pixel_size = 6
	left.add_child(title)
	_label(left, "Good coffee takes a little care.\nSo does teaching a robot to listen.", 18, Color("dbcdb0"))
	var space := Control.new()
	space.custom_minimum_size.y = 10
	left.add_child(space)
	var play := _button(left, "Continue campaign" if Progress.stars(0) >= 0 else "Start campaign", _play)
	play.theme_type_variation = "PrimaryButton"
	play.custom_minimum_size.y = 48
	_button(left, "Settings", func() -> void: get_tree().change_scene_to_file(SETTINGS_SCENE))
	var secondary := HBoxContainer.new()
	secondary.add_theme_constant_override("separation", 8)
	left.add_child(secondary)
	_button(secondary, "About", _about).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_button(secondary, "Quit", Sound.quit_game).size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if Progress.stars(0) >= 0:
		var total := 0
		for index in range(2, 14):
			total += maxi(0, Progress.stars(index))
		_label(left, "Café certified · %s / 36 stars" % total if Progress.is_complete() else "Shift %s / 14 · %s stars collected" % [Progress.unlocked_level() + 1, total], 13, Color("afbd9b"))
		var reset := _button(left, "Start a new café", _new_game)
		reset.flat = true
	else:
		_label(left, "12 gentle coding puzzles · No experience needed", 12, Color("92a58d"))
	_spacer(left)
	_label(left, "CAFFEINE PROTOCOL  /  v1.0", 11, Color("708674"))
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 16)
	layout.add_child(right)
	_spacer(right)
	art = preload("res://scripts/art/cafe_view.gd").new()
	art.custom_minimum_size = Vector2(400, 480)
	right.add_child(art)
	var caption := _label(right, "THE LIGHTS ARE ON. NIKO'S WAITING FOR YOU.", 12, Color("b2b49a"))
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_spacer(right)
	art.art.serving = true
	art.art.queue_count = 1
	play.grab_focus()

func _process(_delta: float) -> void:
	if is_instance_valid(art):
		art.art.service_phase = fmod(art.art.clock, 6.0) / 6.0
		art.art.reduced_motion = bool(Progress.data.get_value("settings", "reduced_motion", false))

func _spacer(parent: Node) -> void:
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	parent.add_child(spacer)

func _label(parent: Node, text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	parent.add_child(label)
	return label

func _button(parent: Node, text: String, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.pressed.connect(action)
	parent.add_child(button)
	return button

func _play() -> void:
	get_tree().change_scene_to_file(GAME_SCENE)

func _new_game() -> void:
	var confirm := ConfirmationDialog.new()
	confirm.title = "A fresh beginning"
	confirm.dialog_text = "Start a new café? Your saved programs and stars will be cleared.\nYour sound and display settings will stay as they are."
	confirm.confirmed.connect(func() -> void: Progress.new_game(); _play())
	confirm.canceled.connect(confirm.queue_free)
	add_child(confirm)
	confirm.popup_centered()

func _about() -> void:
	var dialog := AcceptDialog.new()
	dialog.title = "Made with a little care"
	dialog.dialog_text = "CAFFEINE PROTOCOL\n\nA cozy puzzle game about understanding people,\none small instruction at a time.\n\nMeet Niko, repair Query, and make the café your own\nacross 14 shifts and 12 programming puzzles.\n\nBuilt with the supplied café tiles and existing character art.\nBuilt with Godot.\n\nThanks for stopping by."
	dialog.confirmed.connect(dialog.queue_free)
	dialog.canceled.connect(dialog.queue_free)
	add_child(dialog)
	dialog.popup_centered(Vector2i(510, 380))

func _draw() -> void:
	for x in range(0, int(size.x), 32):
		for y in range(0, int(size.y), 32):
			draw_rect(Rect2(x, y, 1, 1), Color(0.55, 0.65, 0.49, 0.12))
	draw_rect(Rect2(20, 20, size.x - 40, size.y - 40), Color("344438"), false, 1)
