extends SceneTree

const MAIN_SCENE := "res://scenes/game/Game.tscn"
const OUTPUT_PATH := "res://.godot/codex-main-screen.png"
const CAPTURE_SIZE := Vector2i(1280, 720)

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var root := get_root()
	root.size = CAPTURE_SIZE

	var packed := load(MAIN_SCENE) as PackedScene
	if packed == null:
		push_error("Could not load %s" % MAIN_SCENE)
		quit(1)
		return

	var scene := packed.instantiate()
	root.add_child(scene)

	await process_frame
	await process_frame

	var image := root.get_texture().get_image()
	var error := image.save_png(OUTPUT_PATH)
	if error != OK:
		push_error("Could not save screenshot to %s: %s" % [OUTPUT_PATH, error])
		quit(1)
		return

	print("Wrote %s" % OUTPUT_PATH)
	quit(0)
