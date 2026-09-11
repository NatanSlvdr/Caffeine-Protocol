extends Node

var save_path := "user://progress.cfg"
var data := ConfigFile.new()
var selected_level := 0
var save_error := ""

func _ready() -> void:
	get_tree().root.theme = preload("res://scripts/ui/game_theme.gd").create()
	RenderingServer.set_default_clear_color(Color("101f19"))
	data.load(save_path)
	selected_level = clampi(int(data.get_value("campaign", "selected", 0)), 0, unlocked_level())
	apply_settings()

func unlocked_level() -> int:
	return clampi(int(data.get_value("campaign", "unlocked", 0)), 0, 13)

func is_complete() -> bool:
	return bool(data.get_value("campaign", "complete", false))

func stars(index: int) -> int:
	return int(data.get_value("stars", str(index), -1))

func draft(index: int, fallback: String) -> String:
	return String(data.get_value("drafts", str(index), fallback))

func save_draft(index: int, source: String) -> void:
	data.set_value("drafts", str(index), source)
	data.set_value("campaign", "selected", index)
	save()

func complete_level(index: int, earned_stars: int, source := "") -> void:
	if not source.is_empty(): data.set_value("solutions", str(index), source)
	data.set_value("stars", str(index), maxi(stars(index), earned_stars))
	data.set_value("campaign", "unlocked", maxi(unlocked_level(), mini(index + 1, 13)))
	if index == 13:
		data.set_value("campaign", "complete", true)
	save()

func new_game() -> void:
	for section in ["campaign", "drafts", "stars", "solutions", "story"]:
		if data.has_section(section):
			data.erase_section(section)
	selected_level = 0
	save()

func save() -> void:
	var error := data.save(save_path)
	save_error = "Progress could not be saved (%s)." % error if error != OK else ""

func apply_settings() -> void:
	AudioServer.set_bus_volume_db(0, linear_to_db(float(data.get_value("settings", "volume", 0.6))))
	if DisplayServer.get_name() != "headless":
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if bool(data.get_value("settings", "fullscreen", false)) else DisplayServer.WINDOW_MODE_WINDOWED)

# Advance with the player's last passing routine, never an invented repair template.
func incoming_program(index: int) -> String:
	if index <= 2: return LessonGuide.starter(index)
	return String(data.get_value("solutions", str(index - 1), data.get_value("drafts", str(index - 1), LessonGuide.starter(index))))
