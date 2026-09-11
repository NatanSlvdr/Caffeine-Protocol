extends SceneTree

var checks := 0
var failures := 0

func _init() -> void:
	call_deferred("_validate")

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		push_error(message)

func _validate() -> void:
	var tea: Dictionary = LevelLibrary.get_level(3).seeds[1].customers[0]
	var coffee: Dictionary = LevelLibrary.get_level(3).seeds[0].customers[0]
	var branch := PlayerProgram.new(LessonGuide.solution(3), 4)
	var result := branch.translate(tea, "tea")
	check(result.error.is_empty() and result.tickets[0].item == "tea", "True branch must make tea.")
	check(not result.trace.any(func(step: Dictionary) -> bool: return step.command == "ITEM coffee"), "Trace must omit the untaken branch.")
	branch.reset_seed()
	result = branch.translate(coffee, "coffee")
	check(result.tickets[0].item == "coffee", "Else branch must make coffee.")
	var continuous := PlayerProgram.new(LessonGuide.solution(4), 5)
	continuous.translate(coffee, "first")
	result = continuous.translate(tea, "second")
	check(result.error.is_empty() and result.tickets[0].item == "tea", "Jump must resume at the next speech without leaking the first order.")
	check(not PlayerProgram.new("POSITION listen\nHELP\nLISTEN", 9).translate(tea, "early").error.is_empty(), "Help must not read speech before Wait.")
	var missing_number := PlayerProgram.new("LISTEN\nREAD count", 10).translate(tea, "missing")
	check(not missing_number.error.is_empty() and missing_number.error_line == 1, "Missing numeric chip must identify the read block.")
	var missing_variable := PlayerProgram.new("LISTEN\nTICKET\nITEM coffee\nSUGAR variable\nSUBMIT", 7).translate(coffee, "missing")
	check(not missing_variable.error.is_empty(), "Unread local variable must fail safely.")
	var recursive := PlayerProgram.new("LISTEN\nCALL build_ticket\nFUNCTION build_ticket\nCALL build_ticket\nEND", 8).translate(coffee, "recursive")
	check(recursive.error.contains("Recursive"), "Recursive calls must stop with a readable error.")
	for source in ["LISTEN\nELSE", "LISTEN\nIF tea\nELSE\nELSE\nEND", "LISTEN\nCALL build_ticket", "LISTEN\nJUMP listen", "POSITION listen\nLISTEN\nPOSITION listen"]:
		check(not PlayerProgram.new(source).compile_error.is_empty(), "Malformed structural blocks must fail compilation.")
	var sugar: Dictionary = LevelLibrary.get_level(6).seeds[0].customers[0]
	var locals := PlayerProgram.new("LISTEN\nCALL build_ticket\nSUGAR variable\nSUBMIT\nFUNCTION build_ticket\nTICKET\nITEM heard\nREAD sugar\nRETURN\nEND", 8).translate(sugar, "scope")
	check(not locals.error.is_empty(), "Function-local variables must not leak into the caller.")
	var orders := []
	for i in range(400): orders.append({"drink": "coffee"})
	var excessive := coffee.duplicate(true)
	excessive.intent = {"orders": orders}
	result = PlayerProgram.new("LISTEN\nEACH\nTICKET\nITEM heard\nSUBMIT\nEND", 6).translate(excessive, "bounded")
	check(result.error.contains("limit") and result.executed_instructions <= PlayerProgram.LIMIT, "Large loops must respect the instruction budget.")
	var zero: Dictionary = LevelLibrary.get_level(9).seeds[0].customers[0]
	var equality := PlayerProgram.new("LISTEN\nTICKET\nITEM coffee\nIF count = 0\nREAD count\nSUGAR number\nEND\nSUBMIT", 10).translate(zero, "zero")
	check(equality.error.is_empty() and equality.tickets[0].sugar_count == 0, "Numeric equality must preserve zero rather than treating it as absent.")
	var runner := SimulationRunner.new()
	var rush := runner.run_level(LevelLibrary.get_level(1), PlayerProgram.new())
	check(rush.events[-1].satisfaction < rush.events[0].satisfaction, "Manual rush must create a measurable backlog.")
	for event in rush.events:
		check(event.timing.created < event.timing.ready and event.timing.ready < event.timing.served and event.timing.served < event.timing.cleaned, "Lifecycle timestamps must be ordered.")
	var level := LevelLibrary.get_level(13)
	var a := runner.run_level(level, PlayerProgram.new(LessonGuide.solution(13)))
	var b := runner.run_level(level, PlayerProgram.new(LessonGuide.solution(13)))
	check(a.average_satisfaction == b.average_satisfaction and a.executed_instructions == b.executed_instructions, "Replays must be deterministic.")
	var editor := preload("res://scripts/ui/block_editor.gd").new()
	root.add_child(editor)
	editor.set_source("LISTEN\nIF tea\nITEM tea\nEND\nTICKET", 14)
	editor.move_group(1, 0)
	check(editor.source.begins_with("IF tea\nITEM tea\nEND\nLISTEN"), "Dragging a branch must preserve its contents and END.")
	editor.set_locked(true)
	var before: String = editor.source
	editor.insert("SUBMIT")
	check(editor.source == before, "Locked editor must reject insertion.")
	editor.queue_free()
	var progress := root.get_node("Progress")
	progress.save_path = "/tmp/caffeine-runtime-check.cfg"
	progress.data = ConfigFile.new()
	progress.complete_level(2, 3, "LISTEN\nTICKET\nITEM coffee\nSUBMIT")
	progress.save_draft(2, "broken later edit")
	check(progress.incoming_program(3).ends_with("SUBMIT"), "The next level must inherit the last passing program, not a broken draft.")
	DirAccess.remove_absolute(progress.save_path)
	await process_frame
	print("Runtime validation: %s checks, %s failures" % [checks, failures])
	quit(1 if failures else 0)
