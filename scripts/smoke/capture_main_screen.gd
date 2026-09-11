extends SceneTree

# Render representative screens without modifying the player's local save.
func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	root.gui_embed_subwindows = true
	var scenario := "main"
	var small := false
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--case="):
			scenario = argument.trim_prefix("--case=")
		if argument == "--small":
			small = true
	root.size = Vector2i(1100, 720) if small else Vector2i(1280, 720)
	var progress := root.get_node("Progress")
	progress.save_path = "/tmp/caffeine-preview.cfg"
	progress.data = ConfigFile.new()
	progress.selected_level = 0
	if scenario in ["pass", "fail", "help", "ending", "inspect", "pickup", "delivery"]:
		progress.data.set_value("campaign", "unlocked", 13)
		progress.selected_level = 13
		if scenario == "ending":
			for index in range(14):
				progress.data.set_value("stars", str(index), 0 if index < 2 else 3)
	var path := "res://scenes/menus/MainMenu.tscn" if scenario == "menu" else "res://scenes/game/Game.tscn"
	if scenario == "campaign":
		path = "res://scenes/menus/Campaign.tscn"
	if scenario == "settings":
		path = "res://scenes/menus/Settings.tscn"
	var scene := (load(path) as PackedScene).instantiate()
	if path == "res://scenes/game/Game.tscn": scene.animate_entry = false
	root.add_child(scene)
	current_scene = scene
	if scenario in ["pass", "fail", "help", "ending", "inspect", "pickup", "delivery"]:
		scene.code.set_program_text(LessonGuide.solution(13) if scenario != "fail" else "LISTEN\nTICKET\nITEM coffee\nSUBMIT\nREPEAT")
		scene._run()
		if scenario != "fail":
			scene.cafe.playback = 1.1
		scene.cafe.paused = true
		scene.cafe.debug_tickets = true
		if scenario == "pickup": scene.cafe.playback = scene.cafe.EVENT_DURATION * 0.53
		if scenario == "delivery": scene.cafe.playback = scene.cafe.EVENT_DURATION * 0.67
		if scenario == "inspect": scene.cafe.show_inspector()
		if scenario == "help":
			scene.code._show_help()
		if scenario == "ending":
			scene._next()
	for frame in range(8):
		await process_frame
	await RenderingServer.frame_post_draw
	var output := "res://.godot/codex-%s%s-screen.png" % [scenario, "-small" if small else ""]
	var error := root.get_texture().get_image().save_png(output)
	DirAccess.remove_absolute(progress.save_path)
	if error != OK:
		push_error("Could not save screenshot: %s" % error)
	else:
		print("Wrote %s" % output)
	root.get_node("Sound").stop_all()
	await create_timer(0.2).timeout
	quit(0 if error == OK else 1)
