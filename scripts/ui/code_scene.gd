class_name CodeScene
extends VBoxContainer

signal level_selected(index: int)
signal run_requested
signal restart_requested
signal debug_toggled(enabled: bool)

@onready var level_list: ItemList = %LevelList
@onready var code_view: TextEdit = %CodeView
@onready var debug_toggle: CheckBox = %DebugToggle
@onready var result_label: RichTextLabel = %ResultLabel

func _ready() -> void:
	level_list.item_selected.connect(_on_level_selected)
	%RunButton.pressed.connect(func() -> void: run_requested.emit())
	%RestartButton.pressed.connect(func() -> void: restart_requested.emit())
	debug_toggle.toggled.connect(func(enabled: bool) -> void: debug_toggled.emit(enabled))

func set_levels(levels: Array) -> void:
	level_list.clear()
	for level in levels:
		level_list.add_item(String(level.get("title", "")))

func select_level(index: int) -> void:
	level_list.select(index)

func set_program_text(text: String) -> void:
	code_view.text = text

func set_result_text(text: String) -> void:
	result_label.text = text

func is_debug_enabled() -> bool:
	return debug_toggle.button_pressed

func _on_level_selected(index: int) -> void:
	level_selected.emit(index)
