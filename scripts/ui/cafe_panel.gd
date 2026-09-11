class_name CafePanel
extends Control

signal replay_finished
signal edit_requested
signal block_executed(line: int, failed: bool)
var level := {}
var result := {}
var debug_tickets := false
var events: Array = []
var playback := 0.0
var last_event := -1
var paused := false
var speed := 1.0
var pause_button: Button
var cafe_view: CafeView
var counter_title: Label
var speech: Label
var receipt: RichTextLabel
var chips: RichTextLabel
var shift_label: Label
var timeline: ProgressBar
var replay_done := false
var step_back: Button
var step_next: Button
const EVENT_DURATION := 18.0
var last_stage := -1
var trace_step := -1
var edit_button: Button
var block_step_button: Button
var restart_seed_button: Button
var inspect_button: Button
var inspect_dialog: AcceptDialog

func _ready() -> void:
	for child in get_children():
		if child is TileMapLayer: child.hide()
	var column := VBoxContainer.new()
	column.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	column.add_theme_constant_override("separation", 12)
	add_child(column)
	shift_label = _label("", 13, Color("b8b391"))
	shift_label.hide()
	add_child(shift_label)
	cafe_view = preload("res://scripts/art/cafe_view.gd").new()
	cafe_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cafe_view.custom_minimum_size.y = 400
	column.add_child(cafe_view)
	var caption := HBoxContainer.new()
	column.add_child(caption)
	speech = _label("Ready to open", 16, Color("f4dfb8"))
	speech.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	speech.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	caption.add_child(speech)
	counter_title = _label("", 12, Color("a9bfae"))
	caption.add_child(counter_title)
	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation", 8)
	column.add_child(controls)
	pause_button = _button("Pause", controls, _toggle_pause)
	pause_button.custom_minimum_size.x = 82
	timeline = ProgressBar.new()
	timeline.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	timeline.show_percentage = false
	timeline.custom_minimum_size.y = 5
	timeline.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	controls.add_child(timeline)
	var speed_picker := OptionButton.new()
	for label in ["1×", "2×", "4×"]: speed_picker.add_item(label)
	speed_picker.item_selected.connect(func(index: int) -> void: speed = pow(2.0, index))
	controls.add_child(speed_picker)
	inspect_button = _button("Inspect…", controls, show_inspector)
	inspect_dialog = AcceptDialog.new()
	inspect_dialog.title = "Service inspector"
	inspect_dialog.min_size = Vector2i(680, 390)
	add_child(inspect_dialog)
	var detail := VBoxContainer.new()
	detail.custom_minimum_size = Vector2(640, 320)
	detail.add_theme_constant_override("separation", 22)
	inspect_dialog.add_child(detail)
	receipt = RichTextLabel.new()
	receipt.custom_minimum_size.y = 70
	receipt.add_theme_color_override("default_color", Color("eee1c3"))
	receipt.add_theme_font_size_override("normal_font_size", 18)
	detail.add_child(receipt)
	chips = RichTextLabel.new()
	chips.custom_minimum_size.y = 120
	chips.add_theme_color_override("default_color", Color("b5cbb8"))
	chips.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail.add_child(chips)
	var customers := HBoxContainer.new()
	detail.add_child(customers)
	step_back = _button("‹ Previous customer", customers, func() -> void: _seek(-1))
	step_next = _button("Next customer ›", customers, func() -> void: _seek(1))
	_button("Replay service", customers, _replay)
	var debugging := HBoxContainer.new()
	detail.add_child(debugging)
	block_step_button = _button("Step block", debugging, _step_block)
	restart_seed_button = _button("Restart seed", debugging, _restart_seed)
	edit_button = _button("Stop & edit", debugging, stop_and_edit)

func show_inspector() -> void:
	paused = true
	pause_button.text = "Resume"
	debug_tickets = true
	inspect_dialog.popup_centered()

func stop_and_edit() -> void:
	paused = true
	pause_button.text = "Resume"
	inspect_dialog.hide()
	edit_requested.emit()

func _label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label

func _button(text: String, parent: Node, action: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.pressed.connect(action)
	parent.add_child(button)
	return button

func set_state(next_level: Dictionary, next_result: Dictionary, show_debug: bool) -> void:
	level = next_level
	result = next_result
	debug_tickets = show_debug
	playback = 0.0
	paused = false
	pause_button.text = "Pause"
	pause_button.disabled = next_result.is_empty()
	last_event = -1
	replay_done = false
	last_stage = -1
	trace_step = -1
	events = result.get("events", []).duplicate()
	shift_label.text = "SHIFT %02d / 14    ·    %s" % [int(String(level.get("id", "L01")).substr(1)), "EVENING SERVICE" if String(level.get("id", "")) in ["L12", "L13", "L14"] else "THE NEIGHBORHOOD IS WAKING UP"]
	cafe_view.art.active_tables = int(level.get("active_tables", 4))
	cafe_view.art.awake = bool(level.get("programming_enabled", true))
	cafe_view.art.evening = String(level.get("id", "")) in ["L12", "L13", "L14"]
	step_back.disabled = events.is_empty()
	step_next.disabled = events.is_empty()
	_refresh_receipt()

func _process(delta: float) -> void:
	if not is_instance_valid(cafe_view):
		return
	if not paused and not replay_done:
		playback += delta * speed
	cafe_view.art.reduced_motion = bool(Progress.data.get_value("settings", "reduced_motion", false))
	cafe_view.art.playback_paused = paused
	cafe_view.art.serving = not events.is_empty() and not replay_done
	cafe_view.art.celebration = replay_done and bool(result.get("passed", false))
	if not events.is_empty():
		var index := mini(int(playback / EVENT_DURATION), events.size() - 1)
		var event: Dictionary = events[index]
		cafe_view.art.service_phase = fmod(playback, EVENT_DURATION) / EVENT_DURATION
		cafe_view.art.successful = event.passed and not event.tickets.is_empty()
		cafe_view.art.asked_help = event.get("asked_help", false)
		cafe_view.art.drink_item = String(event.tickets[0].item) if not event.tickets.is_empty() else "coffee"
		cafe_view.art.customer_number = maxi(0, int(event.get("table", index + 1)) - 1)
		var waiting := 0
		for later in range(index + 1, events.size()):
			if events[later].seed_id != event.seed_id: break
			if float(events[later].customer.arrival) <= float(event.get("timing", {}).get("created", event.customer.arrival)): waiting += 1
		cafe_view.art.queue_count = mini(waiting, 2)
		var phase := cafe_view.art.service_phase
		var trace: Array = event.get("trace", [])
		if not trace.is_empty():
			var step := mini(int(phase / 0.20 * trace.size()), trace.size() - 1)
			if trace_step != step or index != last_event:
				trace_step = step
				block_executed.emit(int(event.get("failure_line", trace[step].line)) if not event.passed and step == trace.size() - 1 else int(trace[step].line), not event.passed and step == trace.size() - 1)
		var stage := int(phase * 10)
		if last_stage != stage:
			last_stage = stage
			_refresh_receipt()
		timeline.value = minf(playback / (events.size() * EVENT_DURATION) * 100, 100)
		if index != last_event:
			last_event = index
			if event.passed:
				Sound.play("serve")
			_refresh_receipt()
		if playback >= events.size() * EVENT_DURATION and not replay_done:
			replay_done = true
			_refresh_receipt()
			replay_finished.emit()
	else:
		timeline.value = 0
	chips.visible = debug_tickets

func _refresh_receipt() -> void:
	if events.is_empty():
		counter_title.text = ""
		speech.text = "Ready to open"
		receipt.text = "Niko handles the counter today. Watch the shift to meet your customers." if not level.get("programming_enabled", false) else "Build Query's routine, then run it against the day's orders."
		chips.text = ""
		return
	var index := mini(int(playback / EVENT_DURATION), events.size() - 1)
	var event: Dictionary = events[index]
	counter_title.text = "Complete" if replay_done else "%02d / %02d customers" % [index + 1, events.size()]
	speech.text = "Service complete" if replay_done else (cafe_view.art.stage_name() if fmod(playback, EVENT_DURATION) / EVENT_DURATION >= 0.20 else '“%s”' % event.customer.phrase)
	var text := "Niko serves a freshly brewed coffee." if result.get("observation", false) else ""
	for ticket in event.tickets:
		text += ("  +  " if not text.is_empty() else "") + ticket.to_summary_text()
	if event.get("asked_help", false):
		text = "Niko clarifies → " + (text if not text.is_empty() else "We'll come back to this order.")
	if not event.passed:
		text = "Let's try that again. The workbench shows what went wrong."
	receipt.text = text
	receipt.add_theme_color_override("default_color", Color("bdcbb0") if event.passed else Color("e8a98c"))
	var phase := fmod(playback, EVENT_DURATION) / EVENT_DURATION
	var state := "CREATED" if phase < 0.20 else ("PREPARING" if phase < 0.50 else ("READY / PICKUP" if phase < 0.58 else ("DELIVERING" if phase < 0.70 else ("SERVED" if phase < 0.87 else "CLEANING"))))
	if not event.passed: state = "STOPPED / FIX QUERY"
	elif event.tickets.is_empty(): state = "DEFERRED / NO TICKET"
	receipt.text += "  ·  " + state
	chips.text = "HEARD  " + _intent_text(event.customer.intent)
	if event.has("timing") and event.passed and not event.tickets.is_empty():
		chips.text += "\nTable %s · ticket %ss → ready %ss → served %ss → clean %ss · satisfaction %s%%" % [event.table, event.timing.created, event.timing.ready, event.timing.served, event.timing.cleaned, event.satisfaction]

func _toggle_pause() -> void:
	paused = not paused
	pause_button.text = "Resume" if paused else "Pause"

func _replay() -> void:
	playback = 0.0
	last_event = -1
	replay_done = false
	paused = false
	pause_button.text = "Pause"
	_refresh_receipt()

func _seek(direction: int) -> void:
	if events.is_empty():
		return
	var index := clampi(int(playback / EVENT_DURATION) + direction, 0, events.size() - 1)
	playback = index * EVENT_DURATION + EVENT_DURATION * 0.5
	paused = true
	replay_done = false
	pause_button.text = "Resume"
	_refresh_receipt()

func _intent_text(intent: Dictionary) -> String:
	if intent.has("orders"):
		var parts: Array[String] = []
		for order in intent.orders:
			parts.append(_intent_text(order))
		return " / ".join(parts)
	var text := String(intent.get("drink", intent.get("confidence", "unknown")))
	if intent.has("sugar_count"):
		text += " · %s sugars" % intent.sugar_count
	elif intent.has("with_sugar"):
		text += " · with sugar" if intent.with_sugar else " · no sugar"
	return text

# Step through the recorded interpreter trace without re-executing or changing the save.
func _step_block() -> void:
	if events.is_empty(): return
	var index := mini(int(playback / EVENT_DURATION), events.size() - 1)
	var trace: Array = events[index].get("trace", [])
	var next := trace_step + 1
	if next >= trace.size():
		if index >= events.size() - 1: return
		index += 1
		trace = events[index].get("trace", [])
		next = 0
	if trace.is_empty():
		_seek(1)
		return
	playback = index * EVENT_DURATION + (next + 0.1) / trace.size() * EVENT_DURATION * 0.20
	trace_step = next
	paused = true
	replay_done = false
	pause_button.text = "Resume"
	block_executed.emit(int(trace[next].line), not events[index].passed and next == trace.size() - 1)
	_refresh_receipt()

func _restart_seed() -> void:
	if events.is_empty(): return
	var index := mini(int(playback / EVENT_DURATION), events.size() - 1)
	var seed: String = events[index].seed_id
	while index > 0 and events[index - 1].seed_id == seed: index -= 1
	playback = index * EVENT_DURATION
	last_event = -1
	trace_step = -1
	replay_done = false
	paused = false
	pause_button.text = "Pause"
	_refresh_receipt()
