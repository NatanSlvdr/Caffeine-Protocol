class_name OrderTicket
extends RefCounted

var ticket_id := ""
var customer_id := ""
var table_id = null
var source_phrase := ""
var source_intent := {}
var item := ""
var with_sugar = null
var sugar_count = null
var status := "created"
var created_at := 0.0
var due_at := 0.0
var debug_notes := ""

func to_debug_text() -> String:
	var parts: Array[String] = [
		"ticket_id=%s" % ticket_id,
		"customer_id=%s" % customer_id,
		"phrase=\"%s\"" % source_phrase,
		"intent=%s" % str(source_intent),
		"item=%s" % item,
		"status=%s" % status,
	]

	if with_sugar != null:
		parts.append("with_sugar=%s" % str(with_sugar))
	if sugar_count != null:
		parts.append("sugar_count=%s" % str(sugar_count))
	if debug_notes != "":
		parts.append("notes=%s" % debug_notes)

	return ", ".join(parts)

func to_summary_text() -> String:
	var modifier := ""
	if sugar_count != null:
		modifier = " + %s sugar" % str(sugar_count)
	elif with_sugar != null:
		modifier = " + sugar" if with_sugar else " + no sugar"

	return "%s: %s%s" % [customer_id, item, modifier]
