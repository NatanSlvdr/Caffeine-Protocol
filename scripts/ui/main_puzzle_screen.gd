extends Control

const CafePanelScript := preload("res://scripts/ui/cafe_panel.gd")
const LevelLibraryScript := preload("res://scripts/data/level_library.gd")
const QueryReferenceProgramScript := preload("res://scripts/simulation/query_reference_program.gd")
const SimulationRunnerScript := preload("res://scripts/simulation/simulation_runner.gd")

var levels: Array = []
var selected_level_index := 0
var runner := SimulationRunnerScript.new()
var program := QueryReferenceProgramScript.new()
var last_result := {}

var cafe_panel
var level_list: ItemList
var result_label: RichTextLabel
var code_view: TextEdit
var debug_toggle: CheckBox

func _ready() -> void:
	levels = LevelLibraryScript.levels()
	_build_ui()
	_select_level(0)

func _build_ui() -> void:
	var split := HSplitContainer.new()
	split.set_anchors_preset(Control.PRESET_FULL_RECT)
	split.split_offset = 840
	add_child(split)

	cafe_panel = CafePanelScript.new()
	cafe_panel.custom_minimum_size = Vector2(780, 640)
	split.add_child(cafe_panel)

	var right_panel := VBoxContainer.new()
	right_panel.custom_minimum_size = Vector2(380, 640)
	split.add_child(right_panel)

	var title := Label.new()
	title.text = "Query Console"
	title.add_theme_font_size_override("font_size", 24)
	right_panel.add_child(title)

	level_list = ItemList.new()
	level_list.custom_minimum_size = Vector2(360, 188)
	for level in levels:
		level_list.add_item(String(level.get("title", "")))
	level_list.item_selected.connect(_on_level_selected)
	right_panel.add_child(level_list)

	code_view = TextEdit.new()
	code_view.editable = false
	code_view.custom_minimum_size = Vector2(360, 190)
	code_view.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	right_panel.add_child(code_view)

	var controls := HBoxContainer.new()
	right_panel.add_child(controls)

	var run_button := Button.new()
	run_button.text = "Run Validation"
	run_button.pressed.connect(_on_run_pressed)
	controls.add_child(run_button)

	var restart_button := Button.new()
	restart_button.text = "Restart Seed"
	restart_button.pressed.connect(_on_run_pressed)
	controls.add_child(restart_button)

	debug_toggle = CheckBox.new()
	debug_toggle.text = "Ticket Debug"
	debug_toggle.toggled.connect(_on_debug_toggled)
	right_panel.add_child(debug_toggle)

	result_label = RichTextLabel.new()
	result_label.bbcode_enabled = true
	result_label.fit_content = false
	result_label.custom_minimum_size = Vector2(360, 220)
	right_panel.add_child(result_label)

func _on_level_selected(index: int) -> void:
	_select_level(index)

func _select_level(index: int) -> void:
	selected_level_index = index
	level_list.select(index)
	var level := LevelLibraryScript.get_level(index)
	last_result = {}
	code_view.text = _program_text(level)
	result_label.text = _level_summary(level)
	cafe_panel.set_state(level, last_result, debug_toggle.button_pressed)

func _on_run_pressed() -> void:
	var level := LevelLibraryScript.get_level(selected_level_index)
	last_result = runner.run_level(level, program)
	result_label.text = _result_text(level, last_result)
	cafe_panel.set_state(level, last_result, debug_toggle.button_pressed)

func _on_debug_toggled(enabled: bool) -> void:
	var level := LevelLibraryScript.get_level(selected_level_index)
	cafe_panel.set_state(level, last_result, enabled)

func _level_summary(level: Dictionary) -> String:
	var mode := "Observation" if not bool(level.get("programming_enabled", true)) else "Programming"
	return "[b]%s[/b]\n%s\n\nMode: %s\nSeeds: %s" % [
		level.get("title", ""),
		level.get("summary", ""),
		mode,
		level.get("seeds", []).size(),
	]

func _result_text(level: Dictionary, result: Dictionary) -> String:
	var status := "PASSED" if bool(result.get("passed", false)) else "FAILED"
	var text := "[b]%s[/b]\n%s\n\nSeeds: %s/%s\nAverage satisfaction: %s\nExecuted instructions: %s\nStars: %s" % [
		level.get("title", ""),
		status,
		result.get("passed_seeds", 0),
		result.get("required_seeds", 0),
		result.get("average_satisfaction", 0),
		result.get("executed_instructions", 0),
		result.get("stars", 0),
	]

	var failure: Dictionary = result.get("first_failure", {})
	if not failure.is_empty():
		text += "\n\n[b]First Failure[/b]\nSeed: %s\nCustomer: %s\nTime: %ss\nSpeech: %s\nIntent: %s\nReason: %s\nExpected: %s\nActual: %s" % [
			failure.get("seed_id", ""),
			failure.get("customer_id", ""),
			failure.get("event_time", 0),
			failure.get("phrase", ""),
			str(failure.get("intent", {})),
			failure.get("reason", ""),
			str(failure.get("expected", {})),
			failure.get("actual", ""),
		]

	return text

func _program_text(level: Dictionary) -> String:
	if not bool(level.get("programming_enabled", true)):
		return "Programming unavailable\n\nScripted human work owns order intake for this level."

	var level_number := _level_number(level)
	var lines := ["Wait for customer speech"]
	if level_number >= 6:
		lines.append("For each heard order")
		lines.append("  Create ticket")
		lines.append("  If speech confidence is ambiguous")
		lines.append("    Ask Niko for help")
		lines.append("    Use clarification")
		lines.append("  Set item from current order")
		lines.append("  Set sugar data from current order")
		lines.append("  Submit ticket")
	else:
		lines.append("Create ticket")
		lines.append("If speech confidence is ambiguous")
		lines.append("  Ask Niko for help")
		lines.append("  Use clarification")
		lines.append("Set item from heard drink")
		lines.append("Set sugar data from heard sugar")
		lines.append("Submit ticket")

	if level_number >= 5:
		lines.push_front("Position: listen")
		lines.append("Jump to listen")

	lines.append("")
	lines.append("Temporary reference program")
	lines.append("Block editor runtime comes next.")
	return "\n".join(lines)

func _level_number(level: Dictionary) -> int:
	var id := String(level.get("id", "L00"))
	return int(id.substr(1))
