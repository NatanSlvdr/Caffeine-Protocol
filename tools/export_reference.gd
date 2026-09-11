extends SceneTree
func _init() -> void:
	call_deferred("export_data")
func clean(value):
	if value is OrderTicket:
		var result := {}
		for key in ["ticket_id", "customer_id", "table_id", "source_phrase", "source_intent", "item", "with_sugar", "sugar_count", "status", "created_at", "due_at", "debug_notes"]:
			result[key] = value.get(key)
		return result
	if value is Array:
		return value.map(clean)
	if value is Dictionary:
		var result := {}
		for key in value: result[key] = clean(value[key])
		return result
	return value
func export_data() -> void:
	var levels := LevelLibrary.levels()
	var lessons := []
	var results := []
	for i in range(14):
		lessons.append({"note": LessonGuide.NOTES[i], "starter": LessonGuide.starter(i), "solution": LessonGuide.solution(i)})
		results.append(clean(SimulationRunner.new().run_level(levels[i], PlayerProgram.new(LessonGuide.solution(i), i + 1))))
	FileAccess.open("res://web/src/data/campaign.json", FileAccess.WRITE).store_string(JSON.stringify({"levels": levels, "lessons": lessons}, "  "))
	FileAccess.open("res://web/tests/reference-results.json", FileAccess.WRITE).store_string(JSON.stringify(results, "  "))
	FileAccess.open("res://web/src/data/labels.json", FileAccess.WRITE).store_string(JSON.stringify(BlockEditor.LABELS, "  "))
	print("Exported 14 shifts and exact reference results")
	quit()
