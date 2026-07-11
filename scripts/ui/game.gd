extends Control

const MAIN_MENU_SCENE := "res://scenes/menus/MainMenu.tscn"
const LevelLibraryScript := preload("res://scripts/data/level_library.gd")
const QueryReferenceProgramScript := preload("res://scripts/simulation/query_reference_program.gd")
const SimulationRunnerScript := preload("res://scripts/simulation/simulation_runner.gd")

var levels: Array = []
var selected_level_index := 0
var runner := SimulationRunnerScript.new()
var program := QueryReferenceProgramScript.new()
var last_result := {}

@onready var cafe: CafePanel = %Cafe
@onready var code: CodeScene = %Code

func _ready() -> void:
	levels = LevelLibraryScript.levels()
	code.level_selected.connect(_on_level_selected)
	code.run_requested.connect(_on_run_pressed)
	code.restart_requested.connect(_on_run_pressed)
	code.debug_toggled.connect(_on_debug_toggled)
	code.set_levels(levels)
	_select_level(0)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		get_tree().change_scene_to_file(MAIN_MENU_SCENE)

func _on_level_selected(index: int) -> void:
	_select_level(index)

func _select_level(index: int) -> void:
	selected_level_index = index
	code.select_level(index)
	var level := LevelLibraryScript.get_level(index)
	last_result = {}
	code.set_program_text(_program_text(level))
	code.set_result_text(_level_summary(level))
	cafe.set_state(level, last_result, code.is_debug_enabled())

func _on_run_pressed() -> void:
	var level := LevelLibraryScript.get_level(selected_level_index)
	last_result = runner.run_level(level, program)
	code.set_result_text(_result_text(level, last_result))
	cafe.set_state(level, last_result, code.is_debug_enabled())

func _on_debug_toggled(enabled: bool) -> void:
	var level := LevelLibraryScript.get_level(selected_level_index)
	cafe.set_state(level, last_result, enabled)

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
