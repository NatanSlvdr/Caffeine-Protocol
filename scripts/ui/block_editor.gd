class_name BlockEditor
extends ScrollContainer

signal changed(source: String)
var source := ""
var level_number := 3
var selected_line := -1
var rows: Array[Control] = []
var column: VBoxContainer
var locked := false
const LABELS := {
	"AUTO_SERVICE": "Automatic service · watch Niko",
	"LISTEN": "Wait for customer speech", "TICKET": "Create ticket", "SUBMIT": "Submit ticket",
	"ITEM coffee": "Set item: coffee", "ITEM tea": "Set item: tea", "ITEM heard": "Set item from heard drink",
	"IF tea": "If heard drink is tea", "IF coffee": "If heard drink is coffee", "ELSE": "Else", "END": "End",
	"POSITION listen": "Position: listen", "JUMP listen": "Jump to listen", "REPEAT": "Repeat from the beginning",
	"EACH": "For each heard order", "READ sugar": "Store heard sugar → sugar variable", "SUGAR variable": "Set sugar from variable",
	"SUGAR binary": "Copy heard sugar preference", "IF sugar": "If sugar is requested",
	"FUNCTION build_ticket": "Function: build ticket (heard order)", "CALL build_ticket": "Call build ticket (current order)", "RETURN": "Return ticket",
	"IF ambiguous": "If speech is ambiguous", "HELP": "Ask Niko for clarification", "ERROR": "Report unsupported order",
	"IF count": "If sugar count exists", "IF count > 0": "If sugar count > 0", "IF count > 1": "If sugar count > 1",
	"IF count = 0": "If sugar count = 0", "IF count = 1": "If sugar count = 1", "IF count = 2": "If sugar count = 2",
	"READ count": "Store heard count → number variable", "SUGAR number": "Set sugar count from variable",
	"SUGAR count": "Copy heard sugar count", "SUGAR heard": "Copy available sugar chips",
}

func _ready() -> void:
	horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column = VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)
	add_child(column)
	redraw()

static func label_for(command: String) -> String:
	return String(LABELS.get(command, command))

static func color_for(command: String) -> Color:
	if command.begins_with("IF ") or command in ["ELSE", "END", "EACH", "LISTEN", "REPEAT"] or command.begins_with("JUMP ") or command.begins_with("POSITION "):
		return Color("315f71")
	if command.begins_with("FUNCTION ") or command.begins_with("CALL ") or command == "RETURN":
		return Color("715576")
	if command in ["HELP", "ERROR"]:
		return Color("944e42")
	return Color("477057")

func set_source(value: String, number: int) -> void:
	source = value
	level_number = number
	if is_instance_valid(column): redraw()

# Each row is a statement slot. Selectors expose only unlocked, well-typed operations.
func redraw() -> void:
	for child in column.get_children():
		column.remove_child(child)
		child.queue_free()
	rows.clear()
	var depth := 0
	var lines := source.split("\n")
	for i in range(lines.size()):
		var command := String(lines[i]).strip_edges()
		if command.is_empty() or command.begins_with("#"):
			continue
		if command in ["END", "ELSE"]: depth = maxi(0, depth - 1)
		var outer := HBoxContainer.new()
		column.add_child(outer)
		var indent := Control.new()
		indent.custom_minimum_size.x = mini(depth, 4) * 12
		outer.add_child(indent)
		var card := preload("res://scripts/ui/block_card.gd").new()
		card.editor = self
		card.source_line = i
		card.caption = label_for(command)
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card.add_theme_stylebox_override("panel", GameTheme.panel(color_for(command), 5))
		card.set_meta("line", i)
		outer.add_child(card)
		rows.append(card)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 2)
		card.add_child(row)
		if command == "AUTO_SERVICE":
			var automatic := Label.new()
			automatic.text = "▶  AUTOMATIC SERVICE\n\nTake order → prepare → serve → clean"
			automatic.add_theme_color_override("font_color", Color("eee1c3"))
			automatic.add_theme_font_size_override("font_size", 15)
			automatic.custom_minimum_size.y = 96
			row.add_child(automatic)
			continue
		var grip := Label.new()
		grip.text = "%02d" % (i + 1)
		grip.tooltip_text = "Drag to move this block and its contents"
		grip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		grip.add_theme_color_override("font_color", Color("d9ddd1"))
		grip.add_theme_font_size_override("font_size", 11)
		row.add_child(grip)
		var choice := OptionButton.new()
		choice.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		choice.clip_text = true
		choice.add_theme_font_size_override("font_size", 13)
		choice.add_theme_color_override("font_disabled_color", Color("d6dfd3"))
		choice.tooltip_text = label_for(command)
		var options := PlayerProgram.available_commands(level_number)
		if command == "AUTO_SERVICE": options = ["AUTO_SERVICE"]
		for option in options: choice.add_item(label_for(option))
		if command in options: choice.select(options.find(command))
		choice.disabled = locked
		choice.item_selected.connect(func(index: int) -> void: _replace(i, options[index]))
		choice.focus_entered.connect(func() -> void: selected_line = i)
		row.add_child(choice)
		for action in ["↑", "↓", "×"]:
			var button := Button.new()
			button.text = action
			button.add_theme_font_size_override("font_size", 12)
			button.custom_minimum_size.x = 23
			button.disabled = locked
			button.tooltip_text = "Delete block" if action == "×" else "Move block"
			button.pressed.connect(func() -> void: _move(i, action))
			row.add_child(button)
		if command.begins_with("IF ") or command.begins_with("FUNCTION ") or command in ["EACH", "ELSE"]: depth += 1
	if rows.is_empty():
		var empty := Label.new()
		empty.text = "Choose a block above to begin."
		column.add_child(empty)

func insert(command: String) -> void:
	if locked: return
	var lines := source.split("\n")
	var at := lines.size() if selected_line < 0 else mini(selected_line + 1, lines.size())
	lines.insert(at, command)
	if command.begins_with("IF ") or command.begins_with("FUNCTION ") or command == "EACH":
		lines.insert(at + 1, "END")
	selected_line = at
	_commit(lines)

func _replace(line: int, command: String) -> void:
	var lines := source.split("\n")
	lines[line] = command
	selected_line = line
	_commit(lines)

func _move(line: int, action: String) -> void:
	var lines := source.split("\n")
	if action == "×":
		lines.remove_at(line)
		selected_line = -1
	else:
		var target := clampi(line + (-1 if action == "↑" else 1), 0, lines.size() - 1)
		var previous := lines[target]
		lines[target] = lines[line]
		lines[line] = previous
		selected_line = target
	_commit(lines)

func _commit(lines: PackedStringArray) -> void:
	source = "\n".join(lines)
	changed.emit(source)
	redraw()

func highlight(line: int, failure := false) -> void:
	for card in rows:
		var active := int(card.get_meta("line")) == line
		card.modulate = Color("ffb3a1") if active and failure else (Color("fff0a0") if active else Color.WHITE)
		if active: ensure_control_visible(card)

func set_locked(value: bool) -> void:
	locked = value
	redraw()

# Move a structural span intact; dropping into its own body leaves it unchanged.
func move_group(from: int, to: int) -> void:
	if locked or from == to: return
	var lines := source.split("\n")
	var end := from
	var opening := String(lines[from]).strip_edges()
	if opening.begins_with("IF ") or opening.begins_with("FUNCTION ") or opening == "EACH":
		var depth := 1
		while end + 1 < lines.size() and depth > 0:
			end += 1
			var command := String(lines[end]).strip_edges()
			if command.begins_with("IF ") or command.begins_with("FUNCTION ") or command == "EACH": depth += 1
			if command == "END": depth -= 1
	if to >= from and to <= end: return
	var moved := lines.slice(from, end + 1)
	for i in range(end - from + 1): lines.remove_at(from)
	if to > end: to -= moved.size()
	for i in range(moved.size()): lines.insert(to + i, moved[i])
	selected_line = to
	_commit(lines)
