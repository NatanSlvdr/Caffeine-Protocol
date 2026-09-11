class_name SimulationRunner
extends RefCounted

func run_level(level: Dictionary, program) -> Dictionary:
	if not bool(level.get("programming_enabled", true)):
		return _run_observation_level(level)

	level = level.duplicate()
	if program is PlayerProgram:
		level["reference_block_count"] = program.block_count
	var events := []
	var passed_seeds := 0
	var tickets := []
	var executed_instructions := 0
	var first_failure := {}

	for seed in level.get("seeds", []):
		if program.has_method("reset_seed"):
			program.reset_seed()
		var seed_id := String(seed.get("id", ""))
		for customer in seed.get("customers", []):
			var ticket_id := "%s_T%02d" % [seed_id, tickets.size() + 1]
			var actual: Dictionary = program.translate(customer, ticket_id)
			executed_instructions += int(actual.get("executed_instructions", _estimate_instruction_count(customer)))
			var failure := _validate_customer(seed_id, customer, actual)
			events.append({"seed_id": seed_id, "customer": customer, "tickets": actual.get("tickets", []), "asked_help": actual.get("asked_help", false), "passed": failure.is_empty(), "reason": failure.get("reason", ""), "trace": actual.get("trace", []), "failure_line": failure.get("error_line", -1)})

			for ticket in actual.get("tickets", []):
				tickets.append(ticket)

			if not failure.is_empty():
				first_failure = failure
				return _build_result(false, level, passed_seeds, tickets, executed_instructions, first_failure, events)

		passed_seeds += 1

	return _build_result(true, level, passed_seeds, tickets, executed_instructions, first_failure, events)

func _run_observation_level(level: Dictionary) -> Dictionary:
	var tickets := []
	for seed in level.get("seeds", []):
		for customer in seed.get("customers", []):
			var ticket := preload("res://scripts/data/order_ticket.gd").new()
			ticket.ticket_id = "%s_T%02d" % [String(seed.get("id", "")), tickets.size() + 1]
			ticket.customer_id = String(customer.get("customer_id", ""))
			ticket.source_phrase = String(customer.get("phrase", ""))
			ticket.item = "coffee"
			ticket.status = "served"
			tickets.append(ticket)

	var events := []
	var at := 0
	for seed in level.seeds:
		for customer in seed.customers:
			events.append({"seed_id": seed.id, "customer": customer, "tickets": [tickets[at]], "asked_help": false, "passed": true, "trace": []})
			at += 1
	_schedule_service(events, level)
	return {
		"passed": true,
		"events": events,
		"observation": true,
		"level_id": level.get("id", ""),
		"level_title": level.get("title", ""),
		"passed_seeds": level.get("seeds", []).size(),
		"required_seeds": level.get("seeds", []).size(),
		"tickets": tickets,
		"executed_instructions": 0,
		"average_satisfaction": _satisfaction(events),
		"stars": 0,
		"first_failure": {},
	}

func _validate_customer(seed_id: String, customer: Dictionary, actual: Dictionary) -> Dictionary:
	var expected := Dictionary(customer.get("expected", {}))
	var expected_tickets := _expected_tickets(expected)
	var expected_help := bool(expected.get("ask_help", false))
	var asked_help := bool(actual.get("asked_help", false))
	var actual_tickets: Array = actual.get("tickets", [])

	if actual.get("error", "") != "":
		return _failure(seed_id, customer, actual, actual["error"])

	if expected_help and not asked_help:
		return _failure(seed_id, customer, actual, "Expected Query to ask for help.")

	if not expected_help and asked_help:
		return _failure(seed_id, customer, actual, "Query asked for help on a supported phrase.")

	if expected_help and expected_tickets.is_empty():
		if not actual_tickets.is_empty():
			return _failure(seed_id, customer, actual, "Do not guess a drink when no clarification is available.")
		return {}

	if actual_tickets.is_empty():
		return _failure(seed_id, customer, actual, "No ticket was created.")

	if actual_tickets.size() != expected_tickets.size():
		return _failure(seed_id, customer, actual, "Wrong ticket count: expected %s, got %s." % [expected_tickets.size(), actual_tickets.size()])

	for index in range(expected_tickets.size()):
		var expected_ticket: Dictionary = expected_tickets[index]
		var ticket = actual_tickets[index]

		if expected_ticket.has("item") and ticket.item != expected_ticket["item"]:
			return _failure(seed_id, customer, actual, "Wrong item on ticket %s: expected %s, got %s." % [index + 1, expected_ticket["item"], ticket.item])

		if expected_ticket.has("with_sugar") and ticket.with_sugar != expected_ticket["with_sugar"]:
			return _failure(seed_id, customer, actual, "Wrong binary sugar modifier on ticket %s." % [index + 1])

		if expected_ticket.has("sugar_count") and ticket.sugar_count != expected_ticket["sugar_count"]:
			return _failure(seed_id, customer, actual, "Wrong sugar count on ticket %s." % [index + 1])

	return {}

func _expected_tickets(expected: Dictionary) -> Array:
	if expected.has("tickets"):
		return expected["tickets"]
	if expected.has("item"):
		return [expected]
	return []

func _failure(seed_id: String, customer: Dictionary, actual: Dictionary, reason: String) -> Dictionary:
	var failing_line := int(actual.get("error_line", -1))
	if actual.get("error", "").is_empty():
		var prefix := "ITEM" if reason.contains("item") else ("SUGAR" if reason.contains("sugar") else "SUBMIT")
		var trace: Array = actual.get("trace", [])
		for i in range(trace.size() - 1, -1, -1):
			if String(trace[i].command).begins_with(prefix):
				failing_line = int(trace[i].line)
				break
	var actual_tickets: Array = actual.get("tickets", [])
	var actual_text := "none"
	if not actual_tickets.is_empty():
		var parts: Array[String] = []
		for ticket in actual_tickets:
			parts.append(ticket.to_debug_text())
		actual_text = " | ".join(parts)

	return {
		"seed_id": seed_id,
		"error_line": failing_line,
		"customer_id": customer.get("customer_id", ""),
		"event_time": customer.get("arrival", 0),
		"phrase": customer.get("phrase", ""),
		"intent": customer.get("intent", {}),
		"expected": customer.get("expected", {}),
		"actual": actual_text,
		"reason": reason,
	}

func _build_result(passed: bool, level: Dictionary, passed_seeds: int, tickets: Array, executed_instructions: int, first_failure: Dictionary, events: Array) -> Dictionary:
	_schedule_service(events, level)
	var required_seeds := int(level.get("seeds", []).size())
	var stars := 0
	if passed:
		stars = 1
		if int(level.get("block_target", 999)) >= int(level.get("reference_block_count", 999)):
			stars = 2
		if stars == 2 and executed_instructions <= int(level.get("instruction_target", 999999)):
			stars = 3

	return {
		"passed": passed,
		"observation": false,
		"events": events,
		"block_count": level.get("reference_block_count", 0),
		"level_id": level.get("id", ""),
		"level_title": level.get("title", ""),
		"passed_seeds": passed_seeds,
		"required_seeds": required_seeds,
		"tickets": tickets,
		"executed_instructions": executed_instructions,
		"average_satisfaction": _satisfaction(events),
		"stars": stars,
		"first_failure": first_failure,
	}

func _estimate_instruction_count(customer: Dictionary) -> int:
	var intent := Dictionary(customer.get("intent", {}))
	var count := 5
	if intent.has("with_sugar"):
		count += 4
	if intent.has("sugar_count"):
		count += 3
	if intent.has("orders"):
		count += max(0, int(intent["orders"].size()) - 1) * 4
	if intent.get("confidence", "clear") == "ambiguous":
		count += 6
	return count

# Deterministic station and table reservations produce real lifecycle times and satisfaction.
func _schedule_service(events: Array, level: Dictionary) -> void:
	var seed_id := ""
	var prep_free := 0.0
	var counter_free := 0.0
	var server_free := 0.0
	var tables: Array[float] = []
	for event in events:
		if event.seed_id != seed_id:
			seed_id = event.seed_id
			prep_free = 0
			counter_free = 0
			server_free = 0
			tables.assign([])
			tables.resize(int(level.get("active_tables", 4)))
			tables.fill(0.0)
		var arrival := float(event.customer.arrival)
		var manual := not bool(level.get("programming_enabled", true))
		var created := maxf(arrival, counter_free) + (9.0 if manual else float(maxi(1, event.tickets.size())))
		counter_free = created
		if event.tickets.is_empty() or not event.passed:
			event["timing"] = {"arrival": arrival, "created": created, "seated": created, "ready": created, "served": created, "left": created, "cleaned": created}
			event["table"] = 0
			event["satisfaction"] = snappedf(maxf(0, 100.0 - (created - arrival) * 0.6), 0.1)
			continue
		var table_index := 0
		for i in range(tables.size()):
			if tables[i] < tables[table_index]: table_index = i
		var seated := maxf(created, tables[table_index])
		var ready := maxf(created, prep_free)
		for ticket in event.tickets:
			ready += 7 if ticket.item == "tea" else 6
			ticket.table_id = "T%02d" % (table_index + 1)
			ticket.created_at = created
			ticket.status = "served" if event.passed else "failed"
		prep_free = ready
		var served := maxf(maxf(ready, seated), server_free) + 5
		server_free = served
		var left := served + 5
		var cleaned := left + 4
		tables[table_index] = cleaned
		event["timing"] = {"arrival": arrival, "created": created, "seated": seated, "ready": ready, "served": served, "left": left, "cleaned": cleaned}
		event["table"] = table_index + 1
		event["satisfaction"] = snappedf(clampf(100.0 - (created - arrival) * 0.6 - (served - created) * 0.3, 0, 100), 0.1)

func _satisfaction(events: Array) -> float:
	if events.is_empty(): return 100.0
	var total := 0.0
	for event in events: total += float(event.get("satisfaction", 100))
	return snappedf(total / events.size(), 0.1)
