extends Control

const MAIN_MENU_SCENE := "res://scenes/menus/Campaign.tscn"
const Transition := preload("res://scripts/ui/screen_transition.gd")
var animate_entry := true
var transitioning := false
var selected_level_index := 0
var runner := SimulationRunner.new()
var last_result := {}
var save_timer: Timer
var selecting := false
var observation_pending := false
var inspected_ticket := false
var story_dialog: AcceptDialog

@onready var cafe: CafePanel = %Cafe
@onready var code: CodeScene = %Code

func _ready() -> void:
	$Layout/Body/Workbench.add_theme_stylebox_override("panel", GameTheme.panel(Color("e8e3d5"), 20))
	%CampaignButton.pressed.connect(_menu)
	save_timer = Timer.new()
	save_timer.one_shot = true
	save_timer.wait_time = 0.5
	save_timer.timeout.connect(_save_draft)
	add_child(save_timer)
	code.level_selected.connect(_select_level)
	code.run_requested.connect(_run)
	code.stop_requested.connect(cafe.stop_and_edit)
	code.restart_requested.connect(_reset)
	code.next_requested.connect(_next)
	code.menu_requested.connect(_menu)
	code.program_changed.connect(_changed)
	code.debug_toggled.connect(func(enabled: bool) -> void:
		cafe.debug_tickets = enabled
		if enabled:
			inspected_ticket = true
			cafe.show_inspector()
		_finish_observation())
	cafe.block_executed.connect(func(line: int, failed: bool) -> void:
		code.blocks.highlight(line, failed)
		if failed: code.show_error(line))
	cafe.replay_finished.connect(func() -> void:
		code.set_editing_locked(false)
		_finish_observation())
	cafe.edit_requested.connect(func() -> void: code.set_editing_locked(false))
	_select_level(Progress.selected_level)
	if animate_entry:
		transitioning = true
		await Transition.reveal(self, LevelLibrary.get_level(selected_level_index).title)
		transitioning = false

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		_menu()

func _input(event: InputEvent) -> void:
	if transitioning or get_node_or_null("Ending") != null:
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ENTER and (event.ctrl_pressed or event.meta_pressed):
		if code.editing_locked: cafe.stop_and_edit()
		else: _run()
		get_viewport().set_input_as_handled()

func _changed() -> void:
	if not selecting:
		save_timer.start()
		code.save_label.text = "Draft changed · Run to check your new routine"

func _save_draft() -> void:
	Progress.save_draft(selected_level_index, code.code_view.text)
	code.save_label.text = "Saved locally · Esc returns to campaign" if Progress.save_error.is_empty() else Progress.save_error

func _select_level(index: int) -> void:
	if index > Progress.unlocked_level():
		return
	if is_instance_valid(save_timer) and not save_timer.is_stopped():
		_save_draft()
		save_timer.stop()
	selecting = true
	observation_pending = false
	code.set_editing_locked(false)
	selected_level_index = index
	Progress.selected_level = index
	code.set_levels(LevelLibrary.levels())
	code.select_level(index)
	var level := LevelLibrary.get_level(index)
	%LevelTitle.text = "%02d   %s" % [index + 1, String(level.title).get_slice(": ", 1)]
	%LevelMode.text = "OBSERVATION" if index < 2 else "QUERY / ORDER INTAKE"
	last_result = {}
	code.set_program_text(Progress.draft(index, Progress.incoming_program(index)) if index >= 2 else "# Observation shift\n# Niko handles the counter today.\n# Watch, then advance to repair Query.")
	code.set_result_text("[b]Your objective[/b]\n%s\n\n%s" % [level.summary, "Targets: %s blocks · %s executed steps · %s test shifts" % [level.block_target, level.instruction_target, level.seeds.size()] if index >= 2 else "Press Watch the shift to begin."])
	cafe.set_state(level, {}, code.is_debug_enabled())
	selecting = false
	_save_draft()

func _run() -> void:
	if transitioning or code.editing_locked or (is_instance_valid(story_dialog) and story_dialog.visible): return
	_save_draft()
	var level := LevelLibrary.get_level(selected_level_index)
	code.clear_error()
	var previous_stars := Progress.stars(selected_level_index)
	var program := PlayerProgram.new(code.code_view.text, selected_level_index + 1)
	last_result = runner.run_level(level, program)
	code.set_result_text(_result_text(level, last_result))
	cafe.set_state(level, last_result, code.is_debug_enabled())
	code.set_editing_locked(true)
	if last_result.observation:
		observation_pending = true
		code.set_result_text("[b]Watch the service[/b]\nCreated → preparing → ready → served → cleaned.\nNo editing needed. Follow the order from the till to the kitchen, pickup counter and table.")
		return
	if last_result.passed:
		Progress.complete_level(selected_level_index, int(last_result.stars), code.code_view.text)
		code.set_levels(LevelLibrary.levels())
		code.select_level(selected_level_index)
		code.save_label.text = "Shift complete · Progress saved" if Progress.save_error.is_empty() else Progress.save_error
		Sound.play("success")
		if previous_stars < int(last_result.stars) or previous_stars < 0:
			_show_reward(int(last_result.stars))
	else:
		Sound.play("retry")
		code.show_error(int(last_result.first_failure.get("error_line", -1)))
		# Go directly to the mismatch; earlier customers remain inspectable.
		cafe.playback = maxf(0, (cafe.events.size() - 1) * cafe.EVENT_DURATION + cafe.EVENT_DURATION * 0.5)
		cafe.paused = true
		cafe.pause_button.text = "Resume"
		cafe._refresh_receipt()

func _reset() -> void:
	code.set_program_text(Progress.incoming_program(selected_level_index))
	_changed()

func _next() -> void:
	if Progress.stars(selected_level_index) < 0:
		return
	if selected_level_index < 13:
		_menu(selected_level_index + 1)
	else:
		if get_node_or_null("Ending") == null:
			var ending := preload("res://scripts/ui/ending.gd").new()
			ending.return_to_menu.connect(_menu)
			add_child(ending)

func _show_reward(stars: int) -> void:
	cafe.shift_label.text = "SHIFT %02d COMPLETE    ·    %s" % [selected_level_index + 1, "A FRESH START" if stars == 0 else "★".repeat(stars) + "  A SHIFT TO BE PROUD OF"]

func _menu(next_selection := -1) -> void:
	if transitioning: return
	_save_draft()
	if next_selection >= 0:
		Progress.selected_level = next_selection
		Progress.data.set_value("campaign", "selected", next_selection)
		Progress.save()
	transitioning = true
	await Transition.leave(self, MAIN_MENU_SCENE)

func _result_text(level: Dictionary, result: Dictionary) -> String:
	if result.observation:
		return "[b]Shift complete[/b]\n%s cups served · Satisfaction %s%%\n%s\n\nNext shift is ready." % [result.tickets.size(), result.average_satisfaction, "The rush is too much for Niko alone. Time to repair Query." if selected_level_index == 1 else "The café is open. Niko could use another pair of hands."]
	var text := "[b]%s[/b]  ·  %s/%s test shifts\n%s blocks / %s target · %s steps / %s target" % ["SHIFT PASSED  " + "★".repeat(int(result.stars)) if result.passed else "NEEDS A FIX", result.passed_seeds, result.required_seeds, result.block_count, level.block_target, result.executed_instructions, level.instruction_target]
	if not result.first_failure.is_empty():
		var failure: Dictionary = result.first_failure
		text += "\n\n%s · %s · %ss: “%s”\n[color=#a65243]%s[/color]" % [failure.seed_id, failure.customer_id, failure.event_time, failure.phrase, String(failure.reason).replace("[", "[lb]")]
		text += "\nExpected: %s\nActual: %s" % [str(failure.expected).replace("[", "[lb]"), String(failure.actual).replace("[", "[lb]")]
	else:
		text += "\n\nEvery order checked. Satisfaction: %s%%. Next shift is ready." % result.average_satisfaction
	return text

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST and is_node_ready():
		_save_draft()

# Observation uses the same editor with an automatic block; watching completes the shift.
func _finish_observation() -> void:
	if not observation_pending or not cafe.replay_done: return
	observation_pending = false
	Progress.complete_level(selected_level_index, 0)
	code.set_levels(LevelLibrary.levels())
	code.select_level(selected_level_index)
	code.set_result_text(_result_text(LevelLibrary.get_level(selected_level_index), last_result))
	_show_reward(0)

# Brief first-visit interludes explain why the next programming concept is needed.
func _show_interlude() -> void:
	var beats := {
		2: ["A voice at the counter", "Niko tightens the last screw. The scrapyard robot's display blinks.\n\nQUERY: Hearing module online. What is a coffee?\nNIKO: Let's begin with one customer, one ticket. I'll handle the brewing."],
		7: ["The regulars", "QUERY: 'One tea' and 'tea please' have different lengths.\nNIKO: But the same drink chip. Put the shared work in a function.\n\nQuery opens a fresh page in the service manual."],
		9: ["Two is not yes", "CUSTOMER: Two sugars, please.\nQUERY: Sugar: yes.\nNIKO: You're not wrong. You're just not precise enough.\n\nA number variable should help."],
		13: ["The counter is yours", "Niko pins a new badge beside the till.\n\nNIKO: One last service. Every order we've learned, all together.\nQUERY: I have retained my instructions.\n\nBehind them, the espresso machine is already busy."],
	}
	if not beats.has(selected_level_index) or Progress.data.get_value("story", str(selected_level_index), false): return
	story_dialog = AcceptDialog.new()
	story_dialog.title = beats[selected_level_index][0]
	story_dialog.dialog_text = beats[selected_level_index][1]
	story_dialog.ok_button_text = "Let's open the café"
	story_dialog.min_size = Vector2i(560, 270)
	story_dialog.confirmed.connect(func() -> void:
		Progress.data.set_value("story", str(selected_level_index), true)
		Progress.save())
	add_child(story_dialog)
	story_dialog.popup_centered()
