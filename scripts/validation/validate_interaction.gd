extends SceneTree

var checks := 0
var failures := 0

func _init() -> void:
	call_deferred("_validate")

func _check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		push_error(description)

# Embedded popups receive their mouse position in the main viewport's coordinate space.
func _click(control: Control) -> void:
	await process_frame
	var point := control.get_global_rect().get_center()
	if control.get_window() != root: point += Vector2(control.get_window().position)
	for pressed in [true, false]:
		var event := InputEventMouseButton.new()
		event.position = point
		event.global_position = point
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = pressed
		root.push_input(event, true)
		await process_frame

func _key(key: Key, ctrl := false, character := 0) -> void:
	for pressed in [true, false]:
		var event := InputEventKey.new()
		event.keycode = key
		event.unicode = character
		event.ctrl_pressed = ctrl
		event.pressed = pressed
		root.push_input(event, true)
		await process_frame

func _validate() -> void:
	root.size = Vector2i(1280, 720)
	root.gui_embed_subwindows = true
	var progress := root.get_node("Progress")
	progress.save_path = "/tmp/caffeine-input-check.cfg"
	progress.data = ConfigFile.new()
	progress.selected_level = 0
	var campaign := load("res://scenes/menus/Campaign.tscn").instantiate() as Control
	root.add_child(campaign)
	current_scene = campaign
	await process_frame
	_check(campaign.cards.size() == 14 and campaign.cards[2].disabled, "Campaign must show all 14 levels and lock later shifts.")
	await _click(campaign.play_button)
	_check(campaign.launching and campaign.get_node_or_null("LevelTransition") != null, "Launch must start a blocking transition.")
	await create_timer(1.2).timeout
	var game := current_scene as Control
	_check(game.name == "Game" and not game.transitioning, "Transition must finish in the chosen level.")
	_check(game.code.blocks.visible and game.code.blocks.source == "AUTO_SERVICE" and game.code.add_button.disabled, "Observation must use the same workspace with an automatic block.")
	_check(not game.code.results_dialog.visible and not game.cafe.inspect_dialog.visible and not game.code.level_list.visible, "Details and level selection must not clutter the level screen.")
	await _click(game.code.run_button)
	_check(game.last_result.get("passed", false) and not game.code.next_button.visible, "Watch must run the service without unlocking early.")
	game.cafe.playback = game.cafe.events.size() * game.cafe.EVENT_DURATION
	game.cafe._process(0)
	_check(game.code.next_button.visible and progress.unlocked_level() == 1, "Watching must unlock the next shift without requiring a debug action.")
	await _click(game.code.next_button)
	await create_timer(0.4).timeout
	campaign = current_scene
	_check(campaign.name == "Campaign" and campaign.selected == 1, "Finished shift must return to campaign with the next level selected.")
	await _click(campaign.play_button)
	await create_timer(1.2).timeout
	game = current_scene
	await _click(game.code.run_button)
	game.cafe.playback = game.cafe.events.size() * game.cafe.EVENT_DURATION
	game.cafe._process(0)
	await _click(game.code.next_button)
	await create_timer(0.4).timeout
	campaign = current_scene
	await _click(campaign.play_button)
	await create_timer(1.2).timeout
	game = current_scene
	_check(game.selected_level_index == 2 and game.code.blocks.visible and not game.code.add_button.disabled, "Third shift must unlock editing in the same layout.")
	for command in ["TICKET", "ITEM coffee", "SUBMIT"]:
		for index in range(game.code.palette.item_count):
			if game.code.palette.get_item_metadata(index) == command: game.code.palette.select(index)
		await _click(game.code.add_button)
	_check(game.code.code_view.text.contains("TICKET\nITEM coffee\nSUBMIT"), "Palette clicks must build the first routine.")
	await _key(KEY_ENTER, true)
	_check(game.last_result.get("passed", false) and progress.stars(2) == 3, "Shortcut must validate and save the program.")
	_check(game.code.editing_locked and game.code.run_button.text == "Stop & edit", "One primary button must switch from running to editing.")
	await _click(game.cafe.inspect_button)
	_check(game.cafe.inspect_dialog.size.y <= 600 and game.cafe.inspect_dialog.visible and game.cafe.paused, "Inspect must open a separate, paused debugging view.")
	await _click(game.cafe.block_step_button)
	_check(game.cafe.trace_step >= 0, "Inspector must step through a real recorded instruction.")
	await _click(game.cafe.step_next)
	_check(game.cafe.counter_title.text.contains("02 / 02"), "Inspector must navigate customers.")
	game.cafe.inspect_dialog.hide()
	await _click(game.code.run_button)
	_check(not game.code.editing_locked, "Stop & edit must restore editing.")
	game.code.options_dialog.popup_centered()
	await _click(game.code.source_toggle)
	game.code.options_dialog.hide()
	game.code.code_view.grab_focus()
	game.code.code_view.set_caret_line(0)
	game.code.code_view.set_caret_column(0)
	await _key(KEY_X, false, 120)
	await _key(KEY_ENTER, true)
	_check(not game.last_result.get("passed", true) and game.code.error_line == 0, "Invalid text must highlight the failing line.")
	await _click(game.code.results_button)
	_check(game.code.results_dialog.visible, "Detailed failures belong in a separate results view.")
	game.code.results_dialog.hide()
	_check(Rect2(Vector2.ZERO, root.size).encloses(game.code.get_global_rect()), "Workspace must fit 1280×720 even after completion.")
	game._save_draft()
	var disk := ConfigFile.new()
	_check(disk.load(progress.save_path) == OK and disk.get_value("campaign", "selected") == 2, "Navigation and programs must remain saved.")
	game.queue_free()
	await process_frame
	DirAccess.remove_absolute(progress.save_path)
	root.get_node("Sound").stop_all()
	print("Interaction validation: %s checks, %s failures" % [checks, failures])
	quit(1 if failures else 0)
