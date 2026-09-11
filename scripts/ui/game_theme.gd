class_name GameTheme
extends RefCounted

static func panel(color: Color, padding := 10) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_content_margin_all(padding)
	style.set_border_width_all(1)
	style.border_color = color.lightened(0.12)
	style.border_width_bottom = 3
	style.set_corner_radius_all(2)
	return style

static func create() -> Theme:
	var theme := Theme.new()
	theme.default_font_size = 15
	for type in ["Label", "Button", "OptionButton", "CheckBox", "CheckButton", "TextEdit", "CodeEdit", "RichTextLabel"]:
		theme.set_color("font_color", type, Color("eee1c3"))
	for type in ["Button", "OptionButton"]:
		for state in ["normal", "hover", "pressed", "disabled", "focus"]:
			var color := Color("3d594c") if state in ["hover", "pressed"] else Color("293f36")
			if state == "disabled":
				color = Color("202e28")
			var box := panel(color, 8)
			if state == "focus":
				box.bg_color = Color.TRANSPARENT
				box.border_color = Color("eac388")
			theme.set_stylebox(state, type, box)
		theme.set_color("font_disabled_color", type, Color("667b68"))
	theme.set_type_variation("PrimaryButton", "Button")
	for state in ["normal", "hover", "pressed"]:
		theme.set_stylebox(state, "PrimaryButton", panel(Color("dfb77b") if state == "normal" else Color("f0d198"), 10))
		theme.set_color("font_color" if state == "normal" else "font_%s_color" % state, "PrimaryButton", Color("342e2d"))
	theme.set_color("font_focus_color", "PrimaryButton", Color("342e2d"))
	for type in ["TextEdit", "CodeEdit", "PopupMenu", "AcceptDialog", "ConfirmationDialog"]:
		theme.set_stylebox("normal" if type in ["TextEdit", "CodeEdit"] else "panel", type, panel(Color("192b25"), 10))
	theme.set_stylebox("background", "ProgressBar", panel(Color("1a2a23"), 0))
	theme.set_stylebox("fill", "ProgressBar", panel(Color("88a57b"), 0))
	theme.set_color("font_selected_color", "CodeEdit", Color("fff0cf"))
	theme.set_color("selection_color", "CodeEdit", Color("4b6550"))
	theme.set_color("caret_color", "CodeEdit", Color("e5b875"))
	return theme
