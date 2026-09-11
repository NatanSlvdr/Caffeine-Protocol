class_name LevelLibrary
extends RefCounted

static func levels() -> Array:
	return [
		_level("L01", "Level 1: Reopening", false, 0, 0, [
			_seed("L01_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 12, "coffee", _item("coffee")),
				_customer("C3", 24, "coffee", _item("coffee")),
			]),
		], "Watch Niko welcome the first customers and serve their coffee."),
		_level("L02", "Level 2: Rush", false, 0, 0, [
			_seed("L02_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 5, "coffee", _item("coffee")),
				_customer("C3", 10, "coffee", _item("coffee")),
				_customer("C4", 15, "coffee", _item("coffee")),
				_customer("C5", 20, "coffee", _item("coffee")),
				_customer("C6", 25, "coffee", _item("coffee")),
				_customer("C7", 30, "coffee", _item("coffee")),
				_customer("C8", 35, "coffee", _item("coffee")),
			]),
		], "Watch the morning rush, then help Query take over the counter."),
		_level("L03", "Level 3: Boot Sequence", true, 4, 18, [
			_seed("L03_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
			]),
			_seed("L03_B", [
				_customer("C1", 6, "coffee", _item("coffee")),
			]),
		], "Wait for one customer speech event, then create one coffee ticket."),
		_level("L04", "Level 4: Coffee or Tea?", true, 9, 45, [
			_seed("L04_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
			]),
			_seed("L04_B", [
				_customer("C1", 7, "tea", _item("tea")),
			]),
			_seed("L04_C", [
				_customer("C1", 12, "tea", _item("tea")),
			]),
		], "Distinguish coffee and tea intent chips."),
		_level("L05", "Level 5: Continuous Service", true, 12, 100, [
			_seed("L05_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 15, "tea", _item("tea")),
				_customer("C3", 32, "coffee", _item("coffee")),
			]),
			_seed("L05_B", [
				_customer("C1", 0, "tea", _item("tea")),
				_customer("C2", 9, "coffee", _item("coffee")),
				_customer("C3", 26, "tea", _item("tea")),
				_customer("C4", 44, "coffee", _item("coffee")),
			]),
			_seed("L05_C", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 5, "tea", _item("tea")),
				_customer("C3", 19, "tea", _item("tea")),
				_customer("C4", 37, "coffee", _item("coffee")),
			]),
		], "Keep listening for the entire validation run."),
		_level("L06", "Level 6: Table for Two", true, 16, 165, [
			_seed("L06_A", [
				_customer("C1", 0, "two coffees", _multi([_item("coffee"), _item("coffee")])),
				_customer("C2", 12, "coffee and tea", _multi([_item("coffee"), _item("tea")])),
				_customer("C3", 24, "two teas", _multi([_item("tea"), _item("tea")])),
			]),
			_seed("L06_B", [
				_customer("C1", 0, "tea and coffee", _multi([_item("tea"), _item("coffee")])),
				_customer("C2", 9, "two coffees", _multi([_item("coffee"), _item("coffee")])),
				_customer("C3", 21, "coffee", _item("coffee")),
			]),
			_seed("L06_C", [
				_customer("C1", 0, "two teas", _multi([_item("tea"), _item("tea")])),
				_customer("C2", 8, "coffee and tea", _multi([_item("coffee"), _item("tea")])),
				_customer("C3", 18, "tea", _item("tea")),
				_customer("C4", 30, "tea and coffee", _multi([_item("tea"), _item("coffee")])),
			]),
		], "Create one ticket per heard order chip in a single speech event."),
		_level("L07", "Level 7: With or Without Sugar?", true, 18, 145, [
			_seed("L07_A", [
				_customer("C1", 0, "coffee with sugar", _binary("coffee", true)),
				_customer("C2", 8, "tea without sugar", _binary("tea", false)),
				_customer("C3", 16, "coffee without sugar", _binary("coffee", false)),
			]),
			_seed("L07_B", [
				_customer("C1", 0, "tea with sugar", _binary("tea", true)),
				_customer("C2", 6, "coffee with sugar", _binary("coffee", true)),
				_customer("C3", 12, "tea without sugar", _binary("tea", false)),
				_customer("C4", 18, "coffee without sugar", _binary("coffee", false)),
			]),
			_seed("L07_C", [
				_customer("C1", 0, "coffee without sugar", _binary("coffee", false)),
				_customer("C2", 7, "coffee with sugar", _binary("coffee", true)),
				_customer("C3", 14, "tea with sugar", _binary("tea", true)),
				_customer("C4", 21, "tea without sugar", _binary("tea", false)),
			]),
		], "Attach the binary sugar modifier to coffee and tea tickets."),
		_level("L08", "Level 8: Regulars", true, 24, 165, [
			_seed("L08_A", [
				_customer("C1", 0, "one coffee", _binary("coffee", false)),
				_customer("C2", 8, "coffee please", _binary("coffee", false)),
				_customer("C3", 16, "one tea", _binary("tea", false)),
			]),
			_seed("L08_B", [
				_customer("C1", 0, "tea please", _binary("tea", false)),
				_customer("C2", 7, "one coffee with sugar", _binary("coffee", true)),
				_customer("C3", 14, "one tea with sugar", _binary("tea", true)),
			]),
			_seed("L08_C", [
				_customer("C1", 0, "coffee please", _binary("coffee", false)),
				_customer("C2", 6, "tea please with sugar", _binary("tea", true)),
				_customer("C3", 12, "one coffee without sugar", _binary("coffee", false)),
				_customer("C4", 18, "one tea without sugar", _binary("tea", false)),
			]),
		], "Share ticket-building logic across source phrase variants."),
		_level("L09", "Level 9: I Did Not Understand", true, 31, 230, [
			_seed("L09_A", [
				_customer("C1", 0, "regular", _help_ticket("coffee", false), "coffee without sugar"),
				_customer("C2", 8, "coffee please", _binary("coffee", false)),
				_customer("C3", 16, "tea with sugar", _binary("tea", true)),
			]),
			_seed("L09_B", [
				_customer("C1", 0, "the usual", _help_ticket("tea", true), "tea with sugar"),
				_customer("C2", 7, "one coffee", _binary("coffee", false)),
				_customer("C3", 14, "something warm", _help_ticket("coffee", true), "coffee with sugar"),
			]),
			_seed("L09_C", [
				_customer("C1", 0, "same as yesterday", _help_ticket("tea", false), "tea without sugar"),
				_customer("C2", 6, "one tea with sugar", _binary("tea", true)),
				_customer("C3", 12, "regular", _help_ticket("coffee", true), "coffee with sugar"),
			]),
		], "Ask for help on ambiguous speech instead of guessing."),
		_level("L10", "Level 10: How Many Sugars?", true, 38, 310, [
			_seed("L10_A", [
				_customer("C1", 0, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C2", 8, "coffee with 1 sugar", _numeric("coffee", 1)),
				_customer("C3", 16, "tea with 2 sugar", _numeric("tea", 2)),
			]),
			_seed("L10_B", [
				_customer("C1", 0, "tea with 0 sugar", _numeric("tea", 0)),
				_customer("C2", 7, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C3", 14, "tea with 1 sugar", _numeric("tea", 1)),
			]),
			_seed("L10_C", [
				_customer("C1", 0, "one coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C2", 6, "one tea with 1 sugar", _numeric("tea", 1)),
				_customer("C3", 12, "regular", _help_only()),
			]),
			_seed("L10_D", [
				_customer("C1", 0, "coffee with sugar", _binary("coffee", true)),
				_customer("C2", 7, "tea without sugar", _binary("tea", false)),
				_customer("C3", 14, "tea with 2 sugar", _numeric("tea", 2)),
			]),
		], "Use numeric sugar-count chips while preserving binary sugar chips."),
		_level("L11", "Level 11: Refactor Shift", true, 34, 280, [
			_seed("L11_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 6, "tea", _item("tea")),
				_customer("C3", 12, "coffee with sugar", _binary("coffee", true)),
				_customer("C4", 20, "tea without sugar", _binary("tea", false)),
			]),
			_seed("L11_B", [
				_customer("C1", 0, "one coffee", _binary("coffee", false)),
				_customer("C2", 5, "tea please", _binary("tea", false)),
				_customer("C3", 11, "one coffee with sugar", _binary("coffee", true)),
				_customer("C4", 23, "one tea without sugar", _binary("tea", false)),
			]),
			_seed("L11_C", [
				_customer("C1", 0, "regular", _help_ticket("coffee", false), "coffee without sugar"),
				_customer("C2", 7, "the usual", _help_ticket("tea", true), "tea with sugar"),
				_customer("C3", 14, "coffee please", _binary("coffee", false)),
				_customer("C4", 24, "same as yesterday", _help_ticket("tea", false), "tea without sugar"),
			]),
			_seed("L11_D", [
				_customer("C1", 0, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C2", 6, "tea with 1 sugar", _numeric("tea", 1)),
				_customer("C3", 13, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C4", 25, "one tea with 2 sugar", _numeric("tea", 2)),
			]),
		], "Keep all learned behavior passing with less duplicated logic."),
		_level("L12", "Level 12: Intent Stress", true, 40, 520, [
			_seed("L12_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 5, "coffee please", _binary("coffee", false)),
				_customer("C3", 10, "one coffee", _binary("coffee", false)),
				_customer("C4", 16, "tea", _item("tea")),
				_customer("C5", 23, "tea please", _binary("tea", false)),
			]),
			_seed("L12_B", [
				_customer("C1", 0, "one tea", _binary("tea", false)),
				_customer("C2", 5, "one coffee with sugar", _binary("coffee", true)),
				_customer("C3", 11, "one tea with sugar", _binary("tea", true)),
				_customer("C4", 17, "one coffee without sugar", _binary("coffee", false)),
				_customer("C5", 24, "one tea without sugar", _binary("tea", false)),
			]),
			_seed("L12_C", [
				_customer("C1", 0, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C2", 5, "coffee with 1 sugar", _numeric("coffee", 1)),
				_customer("C3", 10, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C4", 15, "tea with 0 sugar", _numeric("tea", 0)),
				_customer("C5", 21, "tea with 1 sugar", _numeric("tea", 1)),
				_customer("C6", 28, "tea with 2 sugar", _numeric("tea", 2)),
			]),
			_seed("L12_D", [
				_customer("C1", 0, "one coffee with sugar", _binary("coffee", true)),
				_customer("C2", 4, "tea please", _binary("tea", false)),
				_customer("C3", 9, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C4", 14, "one tea", _binary("tea", false)),
				_customer("C5", 20, "coffee please", _binary("coffee", false)),
				_customer("C6", 27, "tea with 1 sugar", _numeric("tea", 1)),
			]),
			_seed("L12_E", [
				_customer("C1", 0, "tea with 2 sugar", _numeric("tea", 2)),
				_customer("C2", 4, "one coffee", _binary("coffee", false)),
				_customer("C3", 8, "one tea with sugar", _binary("tea", true)),
				_customer("C4", 13, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C5", 18, "one coffee without sugar", _binary("coffee", false)),
				_customer("C6", 24, "tea please", _binary("tea", false)),
				_customer("C7", 31, "coffee with 1 sugar", _numeric("coffee", 1)),
			]),
		], "Stress-test larger clear-intent batches."),
		_level("L13", "Level 13: Ambiguous Regulars", true, 42, 650, [
			_seed("L13_A", [
				_customer("C1", 0, "regular", _help_ticket("coffee", false), "coffee without sugar"),
				_customer("C2", 5, "coffee with 1 sugar", _numeric("coffee", 1)),
				_customer("C3", 10, "the usual", _help_numeric("tea", 2), "tea with 2 sugar"),
				_customer("C4", 16, "tea please", _binary("tea", false)),
				_customer("C5", 23, "same as yesterday", _help_numeric("coffee", 2), "coffee with 2 sugar"),
				_customer("C6", 31, "one tea without sugar", _binary("tea", false)),
			]),
			_seed("L13_B", [
				_customer("C1", 0, "something warm", _help_ticket("tea", false), "tea without sugar"),
				_customer("C2", 4, "one coffee with sugar", _binary("coffee", true)),
				_customer("C3", 9, "regular", _help_numeric("tea", 1), "tea with 1 sugar"),
				_customer("C4", 15, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C5", 22, "the usual", _help_numeric("coffee", 1), "coffee with 1 sugar"),
				_customer("C6", 30, "tea with 2 sugar", _numeric("tea", 2)),
			]),
			_seed("L13_C", [
				_customer("C1", 0, "coffee please", _binary("coffee", false)),
				_customer("C2", 5, "same as yesterday", _help_ticket("tea", false), "tea without sugar"),
				_customer("C3", 11, "tea with 1 sugar", _numeric("tea", 1)),
				_customer("C4", 17, "something warm", _help_numeric("coffee", 2), "coffee with 2 sugar"),
				_customer("C5", 24, "one coffee without sugar", _binary("coffee", false)),
				_customer("C6", 32, "regular", _help_numeric("coffee", 1), "coffee with 1 sugar"),
			]),
			_seed("L13_D", [
				_customer("C1", 0, "the usual", _help_ticket("tea", true), "tea with sugar"),
				_customer("C2", 4, "tea with 0 sugar", _numeric("tea", 0)),
				_customer("C3", 10, "regular", _help_ticket("coffee", true), "coffee with sugar"),
				_customer("C4", 16, "one tea", _binary("tea", false)),
				_customer("C5", 23, "same as yesterday", _help_ticket("coffee", false), "coffee without sugar"),
				_customer("C6", 31, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C7", 40, "something warm", _help_numeric("tea", 1), "tea with 1 sugar"),
			]),
			_seed("L13_E", [
				_customer("C1", 0, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C2", 4, "regular", _help_ticket("tea", false), "tea without sugar"),
				_customer("C3", 9, "tea please", _binary("tea", false)),
				_customer("C4", 15, "the usual", _help_numeric("coffee", 0), "coffee with 0 sugar"),
				_customer("C5", 21, "one coffee with sugar", _binary("coffee", true)),
				_customer("C6", 28, "same as yesterday", _help_numeric("tea", 2), "tea with 2 sugar"),
				_customer("C7", 36, "one tea with sugar", _binary("tea", true)),
			]),
		], "Preserve help behavior under mixed ambiguous and clear speech."),
		_level("L14", "Level 14: Employee of the Month", true, 48, 1000, [
			_seed("L14_A", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 5, "tea", _item("tea")),
				_customer("C3", 10, "coffee", _item("coffee")),
				_customer("C4", 16, "tea", _item("tea")),
				_customer("C5", 23, "coffee", _item("coffee")),
			]),
			_seed("L14_B", [
				_customer("C1", 0, "coffee with sugar", _binary("coffee", true)),
				_customer("C2", 5, "coffee without sugar", _binary("coffee", false)),
				_customer("C3", 11, "tea with sugar", _binary("tea", true)),
				_customer("C4", 17, "tea without sugar", _binary("tea", false)),
				_customer("C5", 24, "one coffee with sugar", _binary("coffee", true)),
				_customer("C6", 32, "one tea without sugar", _binary("tea", false)),
			]),
			_seed("L14_C", [
				_customer("C1", 0, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C2", 5, "coffee with 1 sugar", _numeric("coffee", 1)),
				_customer("C3", 10, "coffee with 2 sugar", _numeric("coffee", 2)),
				_customer("C4", 16, "tea with 0 sugar", _numeric("tea", 0)),
				_customer("C5", 23, "tea with 1 sugar", _numeric("tea", 1)),
				_customer("C6", 31, "tea with 2 sugar", _numeric("tea", 2)),
			]),
			_seed("L14_D", [
				_customer("C1", 0, "one coffee", _binary("coffee", false)),
				_customer("C2", 4, "coffee please", _binary("coffee", false)),
				_customer("C3", 9, "one tea", _binary("tea", false)),
				_customer("C4", 15, "tea please", _binary("tea", false)),
				_customer("C5", 22, "one coffee with sugar", _binary("coffee", true)),
				_customer("C6", 30, "one tea with 2 sugar", _numeric("tea", 2)),
			]),
			_seed("L14_E", [
				_customer("C1", 0, "coffee and tea", _multi([_item("coffee"), _item("tea")])),
				_customer("C2", 6, "two coffees", _multi([_item("coffee"), _item("coffee")])),
				_customer("C3", 14, "tea and coffee", _multi([_item("tea"), _item("coffee")])),
				_customer("C4", 22, "two teas", _multi([_item("tea"), _item("tea")])),
			]),
			_seed("L14_F", [
				_customer("C1", 0, "regular", _help_ticket("coffee", false), "coffee without sugar"),
				_customer("C2", 5, "the usual", _help_numeric("tea", 1), "tea with 1 sugar"),
				_customer("C3", 11, "same as yesterday", _help_numeric("coffee", 2), "coffee with 2 sugar"),
				_customer("C4", 18, "something warm", _help_ticket("tea", false), "tea without sugar"),
				_customer("C5", 26, "coffee please", _binary("coffee", false)),
				_customer("C6", 35, "tea with sugar", _binary("tea", true)),
			]),
			_seed("L14_G", [
				_customer("C1", 0, "coffee", _item("coffee")),
				_customer("C2", 4, "tea with 2 sugar", _numeric("tea", 2)),
				_customer("C3", 8, "regular", _help_numeric("coffee", 1), "coffee with 1 sugar"),
				_customer("C4", 12, "one coffee without sugar", _binary("coffee", false)),
				_customer("C5", 17, "the usual", _help_ticket("tea", true), "tea with sugar"),
				_customer("C6", 22, "coffee with 0 sugar", _numeric("coffee", 0)),
				_customer("C7", 27, "tea please", _binary("tea", false)),
				_customer("C8", 33, "same as yesterday", _help_numeric("coffee", 2), "coffee with 2 sugar"),
				_customer("C9", 39, "one tea with sugar", _binary("tea", true)),
				_customer("C10", 46, "something warm", _help_ticket("tea", false), "tea without sugar"),
				_customer("C11", 54, "coffee please", _binary("coffee", false)),
				_customer("C12", 63, "tea with 1 sugar", _numeric("tea", 1)),
			]),
		], "Final Act I certification for Query's order intake."),
	]

static func get_level(index: int) -> Dictionary:
	var all_levels := levels()
	return all_levels[clamp(index, 0, all_levels.size() - 1)]

static func _level(id: String, title: String, programming_enabled: bool, block_target: int, instruction_target: int, seeds: Array, summary: String) -> Dictionary:
	return {
		"id": id,
		"active_tables": [2, 4, 3, 4, 5, 5, 5, 6, 6, 6, 6, 8, 8, 10][int(id.substr(1)) - 1],
		"title": title,
		"programming_enabled": programming_enabled,
		"block_target": block_target,
		"instruction_target": instruction_target,
		"reference_block_count": min(block_target, 34) if programming_enabled else 0,
		"seeds": seeds,
		"summary": summary,
	}

static func _seed(id: String, customers: Array) -> Dictionary:
	return {
		"id": id,
		"customers": customers,
	}

static func _customer(customer_id: String, arrival: int, phrase: String, expected: Dictionary, clarification := "") -> Dictionary:
	var intent := _intent_from_expected(expected)
	var clarification_intent := {}
	if bool(expected.get("ask_help", false)):
		intent = {"confidence": "ambiguous"}
		if expected.has("item"):
			clarification_intent = _intent_from_expected(expected)

	return {
		"customer_id": customer_id,
		"arrival": arrival,
		"phrase": phrase,
		"clarification": clarification,
		"intent": intent,
		"clarification_intent": clarification_intent,
		"expected": expected,
	}

static func _intent_from_expected(expected: Dictionary) -> Dictionary:
	var intent := {
		"confidence": "clear",
	}

	if expected.has("tickets"):
		var orders := []
		for ticket in expected["tickets"]:
			orders.append(_intent_from_expected(ticket))
		intent["orders"] = orders
		return intent

	if expected.has("item"):
		intent["drink"] = expected["item"]
	if expected.has("with_sugar"):
		intent["with_sugar"] = expected["with_sugar"]
	if expected.has("sugar_count"):
		intent["sugar_count"] = expected["sugar_count"]

	return intent

static func _item(item: String) -> Dictionary:
	return {"item": item}

static func _binary(item: String, with_sugar: bool) -> Dictionary:
	return {
		"item": item,
		"with_sugar": with_sugar,
	}

static func _numeric(item: String, sugar_count: int) -> Dictionary:
	return {
		"item": item,
		"sugar_count": sugar_count,
	}

static func _multi(tickets: Array) -> Dictionary:
	return {
		"tickets": tickets,
	}

static func _help_only() -> Dictionary:
	return {"ask_help": true}

static func _help_ticket(item: String, with_sugar: bool) -> Dictionary:
	return {
		"ask_help": true,
		"item": item,
		"with_sugar": with_sugar,
	}

static func _help_numeric(item: String, sugar_count: int) -> Dictionary:
	return {
		"ask_help": true,
		"item": item,
		"sugar_count": sugar_count,
	}
