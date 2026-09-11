extends Control

const Transition := preload("res://scripts/ui/screen_transition.gd")
var selected := 0
var launching := false
var cards: Array[Button] = []
var detail_title: Label
var detail_text: Label
var play_button: Button

func _ready() -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]: margin.add_theme_constant_override("margin_" + side, 32)
	add_child(margin)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 22)
	margin.add_child(page)
	var header := HBoxContainer.new()
	page.add_child(header)
	var back := Button.new()
	back.text = "← Main menu"
	back.pressed.connect(func() -> void: get_tree().change_scene_to_file("res://scenes/menus/MainMenu.tscn"))
	header.add_child(back)
	var chapter := Label.new()
	chapter.text = "CAMPAIGN   /   ACT I · QUERY"
	chapter.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	chapter.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	chapter.add_theme_color_override("font_color", Color("d5bc8b"))
	header.add_child(chapter)
	var introduction := Label.new()
	introduction.text = "One café. Fourteen shifts."
	introduction.add_theme_font_size_override("font_size", 32)
	page.add_child(introduction)
	var grid := GridContainer.new()
	grid.columns = 4
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	page.add_child(grid)
	var levels := LevelLibrary.levels()
	for i in range(levels.size()):
		var card := Button.new()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.size_flags_vertical = Control.SIZE_EXPAND_FILL
		card.custom_minimum_size.y = 82
		card.add_theme_font_size_override("font_size", 17)
		card.add_theme_color_override("font_disabled_color", Color("98ac9b"))
		var status := "Observe" if i < 2 else "Program Query"
		if Progress.stars(i) >= 0: status = "Complete  " + ("✓" if i < 2 else "★".repeat(Progress.stars(i)))
		if i > Progress.unlocked_level(): status = "Locked"
		card.text = "%02d    %s\n\n%s" % [i + 1, String(levels[i].title).get_slice(": ", 1), status]
		card.disabled = i > Progress.unlocked_level()
		card.clip_text = true
		card.tooltip_text = String(levels[i].title) + "\n" + status
		card.pressed.connect(func() -> void: select_level(i))
		grid.add_child(card)
		cards.append(card)
	var footer := PanelContainer.new()
	footer.add_theme_stylebox_override("panel", GameTheme.panel(Color("243a32"), 18))
	page.add_child(footer)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	footer.add_child(row)
	var detail := VBoxContainer.new()
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(detail)
	detail_title = Label.new()
	detail_title.add_theme_font_size_override("font_size", 20)
	detail.add_child(detail_title)
	detail_text = Label.new()
	detail_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail_text.add_theme_color_override("font_color", Color("b5c4ac"))
	detail.add_child(detail_text)
	play_button = Button.new()
	play_button.text = "Open this shift →"
	play_button.theme_type_variation = "PrimaryButton"
	play_button.custom_minimum_size.x = 200
	play_button.pressed.connect(_launch)
	row.add_child(play_button)
	select_level(clampi(Progress.selected_level, 0, Progress.unlocked_level()))

func select_level(index: int) -> void:
	if launching or index > Progress.unlocked_level(): return
	selected = index
	var level := LevelLibrary.get_level(index)
	detail_title.text = level.title
	detail_text.text = "Automatic service. Watch how the café works." if index < 2 else level.summary
	for i in range(cards.size()):
		cards[i].add_theme_stylebox_override("normal", GameTheme.panel(Color("426350") if i == selected else Color("23382f"), 12))
	play_button.text = "Replay this shift →" if Progress.stars(index) >= 0 else "Open this shift →"

func _launch() -> void:
	if launching: return
	launching = true
	Progress.selected_level = selected
	Progress.data.set_value("campaign", "selected", selected)
	Progress.save()
	await Transition.leave(self, "res://scenes/game/Game.tscn", LevelLibrary.get_level(selected).title)

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and not launching:
		get_tree().change_scene_to_file("res://scenes/menus/MainMenu.tscn")
