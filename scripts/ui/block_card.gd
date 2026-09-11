extends PanelContainer

var editor: Control
var source_line := 0
var caption := ""

# Drag the numbered grip to move a complete IF/EACH/function with its children.
func _get_drag_data(_at: Vector2):
	if editor.locked: return null
	var preview := Label.new()
	preview.text = caption
	preview.add_theme_color_override("font_color", Color("fff0bf"))
	set_drag_preview(preview)
	return {"kind": "query_block", "editor": editor, "line": source_line}

func _can_drop_data(_at: Vector2, data) -> bool:
	return not editor.locked and data is Dictionary and data.get("kind") == "query_block" and data.get("editor") == editor

func _drop_data(_at: Vector2, data) -> void:
	editor.move_group(int(data.line), source_line)
