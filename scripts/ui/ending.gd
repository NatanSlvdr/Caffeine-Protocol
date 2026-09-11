extends Control

signal return_to_menu
var view: CafeView

func _ready() -> void:
	name = "Ending"
	z_index = 100
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var backdrop := ColorRect.new()
	backdrop.color = Color("14251f")
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 44)
	add_child(margin)
	var layout := HBoxContainer.new()
	layout.add_theme_constant_override("separation", 38)
	margin.add_child(layout)
	var left := VBoxContainer.new()
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	layout.add_child(left)
	var title := preload("res://scripts/art/pixel_title.gd").new()
	title.text = "CLOSING TIME"
	title.pixel_size = 4
	left.add_child(title)
	view = preload("res://scripts/art/cafe_view.gd").new()
	view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(view)
	view.art.active_tables = 10
	view.art.evening = true
	view.art.celebration = true
	var thanks := Label.new()
	thanks.text = "THANK YOU FOR SPENDING A LITTLE TIME AT OUR CAFÉ."
	thanks.add_theme_font_size_override("font_size", 12)
	thanks.add_theme_color_override("font_color", Color("b6bea0"))
	left.add_child(thanks)
	var right := VBoxContainer.new()
	right.custom_minimum_size.x = 440
	right.add_theme_constant_override("separation", 20)
	layout.add_child(right)
	_spacer(right)
	_label(right, "EMPLOYEE OF THE MONTH", 14, Color("e8bc7b"))
	_label(right, "QUERY", 13, Color("95c4a3"))
	_label(right, "“That is not in my instruction set.”", 21, Color("eee0c0"))
	_label(right, "NIKO", 13, Color("e1ab87"))
	_label(right, "“It is now.”", 25, Color("eee0c0"))
	_label(right, "The counter is finally in good hands. Behind it, the espresso machine struggles to keep up.\n\nNiko looks at the next broken robot. Preparation will be another story.\n\nAct I complete. Thank you for playing.", 17, Color("b8c5a9"))
	var total := 0
	for index in range(2, 14):
		total += maxi(0, Progress.stars(index))
	_label(right, "14 SHIFTS COMPLETE    ·    %s / 36 ★" % total, 16, Color("e8bc7b"))
	var back := Button.new()
	back.text = "Back to the café"
	back.theme_type_variation = "PrimaryButton"
	back.pressed.connect(func() -> void: return_to_menu.emit())
	right.add_child(back)
	var again := Button.new()
	again.text = "Keep tinkering"
	again.pressed.connect(queue_free)
	right.add_child(again)
	_spacer(right)
	back.grab_focus()
	Sound.play("success")

func _process(_delta: float) -> void:
	if is_instance_valid(view):
		view.art.reduced_motion = bool(Progress.data.get_value("settings", "reduced_motion", false))

func _label(parent: Node, text: String, font_size: int, color: Color) -> void:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	parent.add_child(label)

func _spacer(parent: Node) -> void:
	var space := Control.new()
	space.size_flags_vertical = Control.SIZE_EXPAND_FILL
	parent.add_child(space)

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		queue_free()
