extends SceneTree

const LevelLibraryScript := preload("res://scripts/data/level_library.gd")
const QueryReferenceProgramScript := preload("res://scripts/simulation/query_reference_program.gd")
const SimulationRunnerScript := preload("res://scripts/simulation/simulation_runner.gd")

func _init() -> void:
	var runner := SimulationRunnerScript.new()
	var program := QueryReferenceProgramScript.new()
	var failures := 0

	for level in LevelLibraryScript.levels():
		var result: Dictionary = runner.run_level(level, program)
		var status := "PASS" if result.get("passed", false) else "FAIL"
		print("%s %s (%s/%s seeds)" % [
			status,
			level.get("id", ""),
			result.get("passed_seeds", 0),
			result.get("required_seeds", 0),
		])

		if not result.get("passed", false):
			failures += 1
			print("  %s" % result.get("first_failure", {}).get("reason", "Unknown failure."))

	if failures > 0:
		quit(1)
	else:
		quit(0)
