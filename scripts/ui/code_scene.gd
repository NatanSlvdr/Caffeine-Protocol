class_name CodeScene
extends VBoxContainer

const BlockEditor := preload("res://scripts/ui/block_editor.gd")

signal level_selected(index: int)
signal stop_requested
signal run_requested
signal restart_requested
signal next_requested
signal menu_requested
signal program_changed
signal debug_toggled(enabled: bool)

var level_list: OptionButton
var code_view: CodeEdit
var result_label: RichTextLabel
var lesson: Label
var next_button: Button
var run_button: Button
var reset_button: Button
var palette: OptionButton
var add_button: Button
var hint_button: Button
var current_index := 0
var help_dialog: AcceptDialog
var help_text: RichTextLabel
var debug_toggle: CheckBox
var save_label: Label
var error_line := -1
var example_button: Button
var program_tools: HBoxContainer
var observation_card: RichTextLabel
var blocks: BlockEditor
var source_toggle: CheckButton
var editing_locked := false
var options_dialog: AcceptDialog
var results_dialog: AcceptDialog
var results_button: Button
var status_label: Label

func _ready() -> void:
	theme = GameTheme.create()
	theme.set_color("font_color", "Label", Color("425448"))
	add_theme_constant_override("separation", 12)
	var heading_row := HBoxContainer.new()
	add_child(heading_row)
	var heading := Label.new()
	heading.text = "PROGRAM"
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_theme_font_size_override("font_size", 19)
	heading_row.add_child(heading)
	hint_button = _button("Help", heading_row, _show_help)
	_button("Options…", heading_row, func() -> void: options_dialog.popup_centered())
	level_list = OptionButton.new()
	add_child(level_list)
	level_list.hide()
	lesson = Label.new()
	lesson.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	lesson.custom_minimum_size.y = 42
	lesson.add_theme_font_size_override("font_size", 15)
	add_child(lesson)
	program_tools = HBoxContainer.new()
	program_tools.add_theme_constant_override("separation", 8)
	add_child(program_tools)
	palette = OptionButton.new()
	palette.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	palette.clip_text = true
	program_tools.add_child(palette)
	add_button = _button("+ Add block", program_tools, _insert_instruction)
	code_view = CodeEdit.new()
	code_view.custom_minimum_size.y = 180
	code_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	code_view.gutters_draw_line_numbers = true
	code_view.add_theme_font_size_override("font_size", 16)
	code_view.text_changed.connect(func() -> void:
		clear_error()
		blocks.set_source(code_view.text, current_index + 1)
		program_changed.emit())
	add_child(code_view)
	blocks = BlockEditor.new()
	blocks.custom_minimum_size.y = 180
	blocks.size_flags_vertical = Control.SIZE_EXPAND_FILL
	blocks.changed.connect(func(value: String) -> void:
		code_view.text = value
		clear_error()
		program_changed.emit())
	add_child(blocks)
	# Observation uses the same workspace with a read-only automatic-service block.
	observation_card = RichTextLabel.new()
	observation_card.hide()
	add_child(observation_card)
	var summary := HBoxContainer.new()
	add_child(summary)
	status_label = Label.new()
	status_label.text = "Ready to open"
	status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	summary.add_child(status_label)
	results_button = _button("Results…", summary, func() -> void: results_dialog.popup_centered())
	results_button.hide()
	run_button = _button("Run service", self, func() -> void:
		if editing_locked: stop_requested.emit()
		else: run_requested.emit())
	run_button.theme_type_variation = "PrimaryButton"
	run_button.custom_minimum_size.y = 48
	next_button = _button("Back to campaign →", self, func() -> void: next_requested.emit())
	next_button.hide()
	save_label = Label.new()
	save_label.hide()
	add_child(save_label)
	options_dialog = AcceptDialog.new()
	options_dialog.title = "Program options"
	options_dialog.min_size = Vector2i(420, 260)
	add_child(options_dialog)
	var options := VBoxContainer.new()
	options.custom_minimum_size = Vector2(380, 190)
	options.add_theme_constant_override("separation", 12)
	options_dialog.add_child(options)
	source_toggle = CheckButton.new()
	source_toggle.text = "Use text editor"
	source_toggle.toggled.connect(func(value: bool) -> void:
		code_view.visible = value and current_index >= 2
		blocks.visible = not value or current_index < 2)
	options.add_child(source_toggle)
	reset_button = _button("Reset incoming program", options, func() -> void: options_dialog.hide(); _confirm_reset())
	debug_toggle = CheckBox.new()
	debug_toggle.text = "Inspect service and tickets"
	debug_toggle.toggled.connect(func(enabled: bool) -> void:
		options_dialog.hide()
		debug_toggled.emit(enabled))
	options.add_child(debug_toggle)
	results_dialog = AcceptDialog.new()
	results_dialog.title = "Validation results"
	results_dialog.min_size = Vector2i(680, 440)
	add_child(results_dialog)
	result_label = RichTextLabel.new()
	result_label.bbcode_enabled = true
	result_label.custom_minimum_size = Vector2(640, 360)
	result_label.add_theme_color_override("default_color", Color("eee1c3"))
	results_dialog.add_child(result_label)
	help_dialog = AcceptDialog.new()
	help_dialog.title = "Query's instruction manual"
	help_dialog.min_size = Vector2i(590, 540)
	add_child(help_dialog)
	help_text = RichTextLabel.new()
	help_text.add_theme_color_override("default_color", Color("eee1c3"))
	help_text.custom_minimum_size = Vector2(550, 450)
	help_dialog.add_child(help_text)
	example_button = help_dialog.add_button("Show worked example", true, "example")
	help_dialog.custom_action.connect(func(action: StringName) -> void:
		if action == "example":
			help_text.text = "A worked example for this shift:\n\n" + LessonGuide.solution(current_index)
			example_button.hide())

func _button(text: String, parent: Node, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.pressed.connect(action)
	parent.add_child(button)
	return button

func set_levels(levels: Array) -> void:
	level_list.clear()
	for index in range(levels.size()):
		var earned := Progress.stars(index)
		var suffix := "  ✓" if earned == 0 else ("  " + "★".repeat(earned) if earned > 0 else "")
		level_list.add_item(String(levels[index].title) + suffix)
		level_list.set_item_disabled(index, index > Progress.unlocked_level())

func select_level(index: int) -> void:
	current_index = index
	level_list.select(index)
	var programming := index >= 2
	lesson.text = LevelLibrary.get_level(index).summary if programming else "Automatic service. Watch Niko take an order, prepare it, and serve the table."
	palette.clear()
	if programming:
		for command in PlayerProgram.available_commands(index + 1):
			palette.add_item(BlockEditor.label_for(command))
			palette.set_item_metadata(palette.item_count - 1, command)
	else:
		palette.add_item("Automatic service")
	code_view.editable = programming and not editing_locked
	code_view.visible = programming and source_toggle.button_pressed
	blocks.visible = not code_view.visible
	source_toggle.disabled = not programming
	program_tools.visible = true
	observation_card.hide()
	palette.disabled = not programming or editing_locked
	add_button.disabled = not programming or editing_locked
	reset_button.disabled = not programming or editing_locked
	_update_run_button()
	next_button.disabled = Progress.stars(index) < 0
	next_button.visible = Progress.stars(index) >= 0
	next_button.text = "Closing time →" if index == 13 else "Back to campaign →"

func set_program_text(text: String) -> void:
	clear_error()
	code_view.text = text
	blocks.set_source(text if current_index >= 2 else "AUTO_SERVICE", current_index + 1)
	blocks.set_locked(editing_locked or current_index < 2)

func set_result_text(text: String) -> void:
	result_label.text = text
	results_button.visible = text.contains("PASSED") or text.contains("FIX") or text.contains("Shift complete")
	status_label.text = "All checks passed" if text.contains("PASSED") else ("An order needs a fix" if text.contains("FIX") else ("Service complete" if text.contains("Shift complete") else "Ready when you are"))
	result_label.scroll_to_line(0)

func is_debug_enabled() -> bool:
	return debug_toggle.button_pressed

func _insert_instruction() -> void:
	if editing_locked: return
	var command := String(palette.get_item_metadata(palette.selected))
	if not source_toggle.button_pressed:
		blocks.insert(command)
		return
	var line := code_view.get_caret_line()
	code_view.set_caret_column(code_view.get_line(line).length())
	code_view.insert_text_at_caret(("\n" if not code_view.get_line(line).is_empty() else "") + command)
	code_view.grab_focus()

func _show_help() -> void:
	help_text.text = "NIKO'S NOTE\n\n" + LessonGuide.NOTES[current_index] + "\n\nChoose a block and Insert. Select a block to insert after it. Drag a numbered grip to move a whole group; use arrows for individual blocks and × to remove. Blue blocks control flow, green blocks build tickets, purple blocks define and call functions. IF, EACH and FUNCTION insert their matching END. Run checks every test shift. Read the first mismatch, adjust your routine, and try again.\n\nLISTEN — receive the next customer\nTICKET — create a fresh order\nITEM heard — copy the current drink chip\nSUBMIT — send the ticket to Niko\nREPEAT — return to LISTEN\nEACH / END — repeat the enclosed steps per drink\nHELP — clarify ambiguous speech before making tickets\nSUGAR binary / count / heard — copy sugar chips\n\nEarn one star for correct orders, a second for meeting the block target, and a third for meeting the step target.\n\nStill stuck? The worked example is here when you want it."
	example_button.show()
	help_text.scroll_to_line(0)
	help_dialog.popup_centered(Vector2i(590, 540))

func clear_error() -> void:
	if is_instance_valid(blocks): blocks.highlight(-1)
	if error_line >= 0 and error_line < code_view.get_line_count():
		code_view.set_line_background_color(error_line, Color.TRANSPARENT)
	error_line = -1

func show_error(line: int) -> void:
	clear_error()
	if line >= 0 and line < code_view.get_line_count():
		error_line = line
		blocks.highlight(line, true)
		code_view.set_line_background_color(line, Color(0.65, 0.26, 0.19, 0.25))
		code_view.set_caret_line(line)
		code_view.center_viewport_to_caret()

func _confirm_reset() -> void:
	var dialog := ConfirmationDialog.new()
	dialog.theme = GameTheme.create()
	dialog.dialog_text = "Reset this shift's draft to its starting program?"
	dialog.confirmed.connect(func() -> void: restart_requested.emit(); dialog.queue_free())
	dialog.canceled.connect(dialog.queue_free)
	add_child(dialog)
	dialog.popup_centered()

# Edits belong between runs; a replay can be stopped explicitly to resume editing.
func set_editing_locked(value: bool) -> void:
	editing_locked = value
	blocks.set_locked(value or current_index < 2)
	code_view.editable = not value and current_index >= 2
	palette.disabled = value or current_index < 2
	add_button.disabled = value or current_index < 2
	reset_button.disabled = value or current_index < 2
	_update_run_button()

func _update_run_button() -> void:
	run_button.disabled = false
	run_button.text = "Stop & edit" if editing_locked else ("Run service" if current_index >= 2 else "Watch service")
	run_button.tooltip_text = "Ctrl/⌘ + Enter"
