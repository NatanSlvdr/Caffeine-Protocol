class_name SpriteAtlas
extends RefCounted

# Each character is stored in a separate atlas cell. Transparent padding is
# measured once so all actors can be placed consistently by their feet.
var texture: Texture2D
var regions: Array[Rect2] = []

func _init(source: Texture2D) -> void:
	texture = source
	var image := texture.get_image()
	var cell := Vector2i(image.get_width() / 3, image.get_height() / 2)
	for row in range(2):
		for column in range(3):
			var origin := Vector2i(column, row) * cell
			var cell_image := image.get_region(Rect2i(origin, cell))
			var low := cell
			var high := Vector2i.ZERO
			for y in range(cell.y):
				for x in range(cell.x):
					if cell_image.get_pixel(x, y).a > 0.5:
						low.x = mini(low.x, x)
						low.y = mini(low.y, y)
						high.x = maxi(high.x, x + 1)
						high.y = maxi(high.y, y + 1)
			var bounds := Rect2i(low, high - low)
			regions.append(Rect2(origin + bounds.position, bounds.size))

func portrait(index: int) -> AtlasTexture:
	var atlas := AtlasTexture.new()
	atlas.atlas = texture
	atlas.region = regions[clampi(index, 0, regions.size() - 1)]
	return atlas

func draw_actor(canvas: CanvasItem, index: int, feet: Vector2, height: float, flip := false, tint := Color.WHITE) -> void:
	var region := regions[clampi(index, 0, regions.size() - 1)]
	var width := roundf(height * region.size.x / region.size.y)
	var destination := Rect2(Vector2(roundf(feet.x - width / 2), roundf(feet.y - height)), Vector2(width, height))
	if flip:
		destination.position.x += destination.size.x
		destination.size.x = -destination.size.x
	canvas.draw_texture_rect_region(texture, destination, region, tint)
