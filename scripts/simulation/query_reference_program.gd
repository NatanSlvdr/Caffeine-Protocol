class_name QueryReferenceProgram
extends RefCounted

const OrderTicketScript := preload("res://scripts/data/order_ticket.gd")

func translate(customer: Dictionary, ticket_id: String) -> Dictionary:
	var phrase := String(customer.get("phrase", "")).strip_edges()
	var intent := Dictionary(customer.get("intent", {}))
	var asked_help := false

	if intent.get("confidence", "clear") == "ambiguous":
		asked_help = true
		var clarification_intent := Dictionary(customer.get("clarification_intent", {}))
		if clarification_intent.is_empty():
			return {
				"asked_help": asked_help,
				"ticket": null,
				"error": "",
			}
		intent = clarification_intent

	var tickets := []
	var order_intents: Array = intent.get("orders", [])
	if order_intents.is_empty():
		order_intents = [intent]

	for index in range(order_intents.size()):
		var order_intent := Dictionary(order_intents[index])
		var order_ticket_id := ticket_id
		if order_intents.size() > 1:
			order_ticket_id = "%s_%02d" % [ticket_id, index + 1]
		var ticket = _build_ticket(customer, order_ticket_id, order_intent, phrase)
		if ticket != null:
			tickets.append(ticket)

	if tickets.is_empty():
		return {
			"asked_help": asked_help,
			"ticket": null,
			"tickets": [],
			"error": "No supported drink intent was heard for \"%s\"." % phrase,
		}

	return {
		"asked_help": asked_help,
		"ticket": tickets[0],
		"tickets": tickets,
		"error": "",
	}

func _build_ticket(customer: Dictionary, ticket_id: String, intent: Dictionary, source_phrase: String):
	var item := String(intent.get("drink", ""))
	if item == "":
		return null

	var ticket := OrderTicketScript.new()
	ticket.ticket_id = ticket_id
	ticket.customer_id = String(customer.get("customer_id", ""))
	ticket.source_phrase = source_phrase
	ticket.source_intent = intent.duplicate()
	ticket.item = item
	ticket.created_at = float(customer.get("arrival", 0.0))
	ticket.due_at = ticket.created_at + 30.0

	if intent.has("sugar_count"):
		ticket.sugar_count = intent["sugar_count"]
	elif intent.has("with_sugar"):
		ticket.with_sugar = intent["with_sugar"]

	return ticket
