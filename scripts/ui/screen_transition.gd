extends RefCounted

# The transition uses interface graphics only and respects reduced-motion settings.
static func cover(host: Control, title: String) -> ColorRect:
	var panel := ColorRect.new()
	panel.name = "LevelTransition"
	panel.color = Color("101f19")
	panel.z_index = 200
	panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	host.add_child(panel)
	var label := Label.new()
	label.text = title
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 30)
	label.add_theme_color_override("font_color", Color("f0d198"))
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(label)
	return panel

static func reveal(host: Control, title: String) -> void:
	var panel := cover(host, title)
	var reduced := bool(host.get_node("/root/Progress").data.get_value("settings", "reduced_motion", false))
	var tween := host.create_tween()
	tween.tween_interval(0.05 if reduced else 0.35)
	tween.tween_property(panel, "modulate:a", 0.0, 0.05 if reduced else 0.4)
	await tween.finished
	panel.queue_free()

static func leave(host: Control, path: String, title := "") -> void:
	var panel := cover(host, title)
	panel.modulate.a = 0
	var reduced := bool(host.get_node("/root/Progress").data.get_value("settings", "reduced_motion", false))
	var tween := host.create_tween()
	tween.tween_property(panel, "modulate:a", 1.0, 0.05 if reduced else 0.2)
	await tween.finished
	host.get_tree().change_scene_to_file(path)
