extends SceneTree

var failures := 0
var checks := 0

func _init() -> void:
	call_deferred("_validate")

func _check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		push_error(message)

func _validate() -> void:
	root.size = Vector2i(1280, 720)
	var runner := SimulationRunner.new()
	for index in range(2, 14):
		var level := LevelLibrary.get_level(index)
		var program := PlayerProgram.new(LessonGuide.solution(index), index + 1)
		var result := runner.run_level(level, program)
		_check(result.passed, "%s worked example failed: %s" % [level.id, result.first_failure])
		print("%s: %s blocks, %s steps, %s stars" % [level.id, result.block_count, result.executed_instructions, result.stars])
		_check(result.stars == 3, "%s must have an achievable three-star solution." % level.id)
		var starting_result := runner.run_level(level, PlayerProgram.new(LessonGuide.starter(index), index + 1))
		if index not in [7, 10, 11, 12, 13]:
			_check(not starting_result.passed, "%s introduces a new puzzle." % level.id)
	_check(not runner.run_level(LevelLibrary.get_level(3), PlayerProgram.new("LISTEN\nTICKET\nITEM coffee\nSUBMIT", 4)).passed, "Hard-coded coffee must fail the tea test.")
	_check(not runner.run_level(LevelLibrary.get_level(4), PlayerProgram.new("LISTEN\nTICKET\nITEM heard\nSUBMIT", 5)).passed, "Missing REPEAT must stop after the first customer.")
	_check(not runner.run_level(LevelLibrary.get_level(5), PlayerProgram.new("LISTEN\nTICKET\nITEM heard\nSUBMIT\nREPEAT", 6)).passed, "Missing EACH must fail multiple drinks.")
	_check(not runner.run_level(LevelLibrary.get_level(6), PlayerProgram.new(LessonGuide.solution(5), 7)).passed, "Missing sugar instruction must fail sugar tests.")
	_check(not runner.run_level(LevelLibrary.get_level(8), PlayerProgram.new(LessonGuide.solution(7), 9)).passed, "Missing HELP must fail ambiguous orders.")
	_check(not runner.run_level(LevelLibrary.get_level(9), PlayerProgram.new(LessonGuide.solution(8), 10)).passed, "Binary sugar must not satisfy numeric sugar.")
	for source in ["", "LISTEN\nEND", "LISTEN\nEACH", "LISTEN\nEACH\nEACH\nEND\nEND", "LISTEN\nREPEAT\nTICKET", "LISTEN\nBOGUS", "TICKET\nLISTEN"]:
		_check(not PlayerProgram.new(source).compile_error.is_empty(), "Invalid source accepted: %s" % source)
	_check(not PlayerProgram.new("LISTEN\nHELP", 3).compile_error.is_empty(), "Locked HELP accepted in boot lesson.")
	_check(not runner.run_level(LevelLibrary.get_level(2), PlayerProgram.new("LISTEN\nITEM coffee\nSUBMIT", 3)).passed, "Setting ITEM without a ticket must fail safely.")
	var help_only := {"customer_id": "test", "phrase": "regular", "intent": {"confidence": "ambiguous"}, "clarification_intent": {}}
	var deferred := PlayerProgram.new(LessonGuide.solution(13)).translate(help_only, "test")
	_check(deferred.asked_help and deferred.tickets.is_empty() and deferred.error.is_empty(), "Unresolved ambiguity must defer without guessing.")
	# Persistence checks use a temporary file and never touch the player's save.
	var progress := root.get_node("Progress")
	progress.save_path = "/tmp/caffeine-validation-progress.cfg"
	progress.data = ConfigFile.new()
	progress.complete_level(2, 2)
	progress.complete_level(2, 1)
	progress.save_draft(2, "LISTEN")
	var disk := ConfigFile.new()
	_check(disk.load(progress.save_path) == OK, "Save file was not written.")
	_check(disk.get_value("stars", "2") == 2, "Replays must preserve the best star count.")
	_check(disk.get_value("drafts", "2") == "LISTEN", "Draft must persist to disk.")
	_check(progress.unlocked_level() == 3, "Passing must unlock the next shift.")
	progress.complete_level(13, 3)
	_check(progress.is_complete(), "Final shift must complete the campaign.")
	progress.new_game()
	_check(not progress.is_complete() and progress.unlocked_level() == 0 and progress.stars(2) == -1, "New game must clear campaign progress.")
	var game := load("res://scenes/game/Game.tscn").instantiate() as Control
	game.animate_entry = false
	root.add_child(game)
	await process_frame
	_check(game.code.next_button.disabled, "New game must not allow skipping the first shift.")
	game._run()
	_check(game.code.next_button.disabled, "Observation cannot be skipped before watching.")
	game.inspected_ticket = true
	game.cafe.playback = game.cafe.events.size() * game.cafe.EVENT_DURATION
	game.cafe._process(0)
	_check(not game.code.next_button.disabled, "A completed observation must allow advancing.")
	game._select_level(1)
	_check(game.selected_level_index == 1, "Unlocked levels must load their saved program.")
	for index in range(1, 14):
		game._select_level(index)
		if is_instance_valid(game.story_dialog): game.story_dialog.hide()
		if index >= 2:
			game.code.set_program_text(LessonGuide.solution(index))
		game.code.set_editing_locked(false)
		game._run()
		if index < 2:
			game.cafe.playback = game.cafe.events.size() * game.cafe.EVENT_DURATION
			game.cafe._process(0)
		_check(game.last_result.passed, "UI campaign run failed at shift %s" % (index + 1))
		if index == 13: game._next()
	_check(progress.is_complete(), "UI campaign must reach the ending.")
	_check(game.get_node_or_null("Ending") != null, "Final next button must show the ending.")
	game.queue_free()
	await process_frame
	var settings := load("res://scenes/menus/Settings.tscn").instantiate() as Control
	root.add_child(settings)
	for frame in range(3):
		await process_frame
	var settings_card: Control = settings.get_child(0).get_child(0)
	_check(Rect2(Vector2.ZERO, root.size).encloses(settings_card.get_global_rect()), "The settings card must fit inside the window.")
	var sliders := settings.find_children("*", "HSlider", true, false)
	_check(sliders.size() == 3, "Settings must expose master, music, and effects volume.")
	if sliders.size() == 3:
		sliders[1].value = 0
		_check(progress.data.get_value("settings", "music") == 0.0, "Music slider must persist its value.")
		_check(is_inf(root.get_node("Sound").music.volume_db), "Zero music volume must silence the music player.")
	progress.new_game()
	_check(progress.data.get_value("settings", "music") == 0.0, "Starting a new café must preserve settings.")
	settings.queue_free()
	await process_frame
	DirAccess.remove_absolute(progress.save_path)
	print("Player validation: %s checks, %s failures" % [checks, failures])
	quit(1 if failures else 0)
