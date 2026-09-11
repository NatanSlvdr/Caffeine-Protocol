class_name CafeView
extends TextureRect

var art: CafeArt
var pixel_viewport: SubViewport

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	pixel_viewport = SubViewport.new()
	pixel_viewport.size = Vector2i(672, 912)
	pixel_viewport.disable_3d = true
	pixel_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(pixel_viewport)
	art = preload("res://scripts/art/cafe_art.gd").new()
	art.scale = Vector2.ONE * 2.0
	pixel_viewport.add_child(art)
	texture = pixel_viewport.get_texture()
