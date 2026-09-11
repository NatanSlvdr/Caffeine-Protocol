class_name PlayerProgram
extends RefCounted

const Ticket := preload("res://scripts/data/order_ticket.gd")
const LIMIT := 1024
var instructions: Array[String] = []
var source_lines: Array[int] = []
var compile_error := ""
var error_line := 0
var block_count := 0
var stopped := false
var pc := 0
var ends := {}
var alternatives := {}
var positions := {}
var functions := {}

# Compile only the finite, typed block vocabulary. Saved text is never executed as code.
func _init(source := "", level_number := 14) -> void:
	var stack: Array[int] = []
	var raw := source.split("\n")
	for i in range(raw.size()):
		var command := String(raw[i]).strip_edges()
		error_line = i
		if command.is_empty() or command.begins_with("#"):
			continue
		if command not in available_commands(level_number):
			compile_error = "Unknown or locked instruction: " + command
			return
		var at := instructions.size()
		instructions.append(command)
		source_lines.append(i)
		if command.begins_with("POSITION "):
			var label := command.trim_prefix("POSITION ")
			if positions.has(label):
				compile_error = "Duplicate position: " + label
				return
			positions[label] = at
		if command == "EACH" or command.begins_with("IF ") or command.begins_with("FUNCTION "):
			if command == "EACH" and stack.any(func(open: int) -> bool: return instructions[open] == "EACH"):
				compile_error = "Use one EACH per speech event; do not nest EACH blocks."
				return
			if command.begins_with("FUNCTION "):
				if not stack.is_empty() or functions.has(command.trim_prefix("FUNCTION ")):
					compile_error = "Functions must be unique and placed outside other blocks."
					return
				functions[command.trim_prefix("FUNCTION ")] = at
			stack.append(at)
		elif command == "ELSE":
			if stack.is_empty() or not instructions[stack[-1]].begins_with("IF ") or alternatives.has(stack[-1]):
				compile_error = "ELSE belongs inside one IF block."
				return
			alternatives[stack[-1]] = at
		elif command == "END":
			if stack.is_empty():
				compile_error = "END needs an IF, EACH or FUNCTION above it."
				return
			var start := stack.pop_back() as int
			ends[start] = at
			ends[at] = start
			if alternatives.has(start):
				ends[alternatives[start]] = at
	if not stack.is_empty():
		compile_error = "Close each IF, EACH and FUNCTION with END."
	elif instructions.is_empty() or instructions[0] not in ["LISTEN", "POSITION listen"]:
		compile_error = "Start with Wait for customer speech, or Position: listen."
	elif instructions.count("LISTEN") != 1:
		compile_error = "Use one Wait for customer speech; jump back to it for continuous service."
	elif instructions.has("REPEAT") and (instructions[-1] != "REPEAT" or instructions.count("REPEAT") > 1):
		compile_error = "REPEAT belongs once, at the very end."
	for i in range(instructions.size()):
		var command := instructions[i]
		if command.begins_with("JUMP ") and not positions.has(command.trim_prefix("JUMP ")):
			compile_error = "Jump target has no matching Position block."
			error_line = source_lines[i]
		if command.begins_with("CALL ") and not functions.has(command.trim_prefix("CALL ")):
			compile_error = "Define the function before calling it."
			error_line = source_lines[i]
	block_count = instructions.size()
	if block_count > 128:
		compile_error = "Query has room for at most 128 blocks."

static func available_commands(level_number: int) -> Array[String]:
	var commands: Array[String] = ["LISTEN", "TICKET", "ITEM coffee", "SUBMIT"]
	if level_number >= 4:
		commands.append_array(["IF tea", "IF coffee", "ELSE", "END", "ITEM tea", "ITEM heard"])
	if level_number >= 5:
		commands.append_array(["POSITION listen", "JUMP listen", "REPEAT"])
	if level_number >= 6:
		commands.append("EACH")
	if level_number >= 7:
		commands.append_array(["READ sugar", "SUGAR variable", "SUGAR binary", "IF sugar"])
	if level_number >= 8:
		commands.append_array(["FUNCTION build_ticket", "CALL build_ticket", "RETURN"])
	if level_number >= 9:
		commands.append_array(["IF ambiguous", "HELP", "ERROR"])
	if level_number >= 10:
		commands.append_array(["IF count", "IF count > 0", "IF count > 1", "IF count = 0", "IF count = 1", "IF count = 2", "READ count", "SUGAR number", "SUGAR count"])
	if level_number >= 11:
		commands.append("SUGAR heard")
	return commands

func reset_seed() -> void:
	stopped = false
	pc = 0

# Resume the instruction pointer at the next speech; bounded jumps and calls cannot hang a shift.
func translate(customer: Dictionary, ticket_id: String) -> Dictionary:
	var output := {"tickets": [], "asked_help": false, "error": "", "executed_instructions": 0, "trace": []}
	if not compile_error.is_empty():
		output.error = compile_error
		output["error_line"] = error_line
		return output
	if stopped:
		output.error = "Query stopped listening. Jump to the listen position after serving."
		return output
	var intent: Dictionary = customer.get("intent", {}).duplicate(true)
	var current_order := intent
	var variables := {}
	var loops: Array[Dictionary] = []
	var calls: Array[Dictionary] = []
	var ticket: OrderTicket
	var heard := false
	while pc < instructions.size():
		if output.executed_instructions >= LIMIT:
			output.error = "Instruction limit reached. A loop must return to Wait for customer speech."
			return output
		var command := instructions[pc]
		if command == "LISTEN" and heard:
			return output
		output.executed_instructions += 1
		output["error_line"] = source_lines[pc]
		output.trace.append({"line": source_lines[pc], "command": command, "function_depth": calls.size()})
		if not heard and (command in ["HELP", "EACH"] or command.begins_with("READ ")):
			output.error = "No customer speech is available."
			return output
		var next := pc + 1
		if command.begins_with("IF "):
			if not heard:
				output.error = "No customer speech is available."
				return output
			var condition := false
			match command.trim_prefix("IF "):
				"tea", "coffee": condition = current_order.get("drink", "") == command.trim_prefix("IF ")
				"sugar": condition = bool(current_order.get("with_sugar", false))
				"ambiguous": condition = intent.get("confidence", "clear") == "ambiguous"
				"count": condition = current_order.has("sugar_count")
				"count > 0", "count > 1", "count = 0", "count = 1", "count = 2":
					if not current_order.has("sugar_count"):
						output.error = "Expected a sugar count chip, but none was heard."
						return output
					condition = int(current_order.sugar_count) == int(command.right(1)) if command.contains("=") else int(current_order.sugar_count) > int(command.right(1))
			if not condition:
				next = int(alternatives.get(pc, ends[pc])) + 1
		elif command.begins_with("FUNCTION "):
			next = int(ends[pc]) + 1
		elif command.begins_with("CALL "):
			if not calls.is_empty():
				output.error = "Recursive function calls are not supported."
				return output
			calls.append({"return": next, "variables": variables.duplicate(), "loop_depth": loops.size()})
			variables = {}
			next = int(functions[command.trim_prefix("CALL ")]) + 1
		elif command.begins_with("JUMP "):
			if not calls.is_empty() or not loops.is_empty():
				output.error = "Finish the function or EACH before jumping to listen."
				return output
			next = int(positions[command.trim_prefix("JUMP ")])
		else:
			match command:
				"LISTEN": heard = true
				"HELP":
					if intent.get("confidence", "clear") == "ambiguous":
						output.asked_help = true
						intent = customer.get("clarification_intent", {}).duplicate(true)
						current_order = intent
						if intent.is_empty():
							pc = 0
							stopped = not instructions.has("REPEAT") and not instructions.has("JUMP listen")
							return output
				"ERROR":
					output.error = "Query reported an unsupported order. Ask Niko for help before creating a ticket."
					return output
				"EACH":
					var orders: Array = intent.get("orders", [intent])
					if orders.is_empty():
						output.error = "No order chips were heard."
						return output
					loops.append({"start": pc, "orders": orders, "index": 0})
					current_order = orders[0]
				"ELSE": next = int(ends[pc]) + 1
				"END":
					var opening: String = instructions[int(ends[pc])]
					if opening == "EACH":
						var loop: Dictionary = loops[-1]
						loop.index += 1
						if loop.index < loop.orders.size():
							current_order = loop.orders[loop.index]
							next = int(loop.start) + 1
						else:
							loops.pop_back()
							current_order = intent
					elif opening.begins_with("FUNCTION "):
						var frame: Dictionary = calls.pop_back()
						next = int(frame["return"])
						variables = frame.variables
				"RETURN":
					if calls.is_empty():
						output.error = "Return belongs inside a called function."
						return output
					var frame: Dictionary = calls.pop_back()
					next = int(frame["return"])
					variables = frame.variables
					loops.resize(int(frame.loop_depth))
				"TICKET":
					if not heard:
						output.error = "No customer speech is available."
						return output
					if current_order.get("confidence", "clear") == "ambiguous":
						output.error = "Ambiguous customer speech. Ask for help before creating a ticket."
						return output
					if ticket != null:
						output.error = "Submit the current ticket before creating another."
						return output
					ticket = Ticket.new()
					ticket.ticket_id = "%s_%02d" % [ticket_id, output.tickets.size() + 1]
					ticket.customer_id = String(customer.get("customer_id", ""))
					ticket.source_phrase = String(customer.get("phrase", ""))
					ticket.source_intent = current_order.duplicate()
					ticket.created_at = float(customer.get("arrival", 0))
					ticket.due_at = ticket.created_at + 30
				"ITEM coffee", "ITEM tea", "ITEM heard":
					if ticket == null:
						output.error = "Create a ticket before setting its item."
						return output
					ticket.item = String(current_order.get("drink", "")) if command == "ITEM heard" else command.get_slice(" ", 1)
				"READ sugar", "READ count":
					var key := "with_sugar" if command == "READ sugar" else "sugar_count"
					if not current_order.has(key):
						output.error = "Expected a %s chip, but none was heard." % key
						return output
					variables[key] = current_order[key]
				"SUGAR binary", "SUGAR count", "SUGAR heard", "SUGAR variable", "SUGAR number":
					if ticket == null:
						output.error = "Create a ticket before setting sugar."
						return output
					if command in ["SUGAR variable", "SUGAR number"]:
						var key := "with_sugar" if command == "SUGAR variable" else "sugar_count"
						if not variables.has(key):
							output.error = "Read the sugar value into the local variable first."
							return output
						if key == "with_sugar": ticket.with_sugar = variables[key]
						else: ticket.sugar_count = variables[key]
					else:
						if command != "SUGAR count" and current_order.has("with_sugar"):
							ticket.with_sugar = current_order.with_sugar
						if command != "SUGAR binary" and current_order.has("sugar_count"):
							ticket.sugar_count = current_order.sugar_count
				"SUBMIT":
					if ticket == null or ticket.item not in ["coffee", "tea"]:
						output.error = "Created ticket is missing an item."
						return output
					output.tickets.append(ticket)
					ticket = null
				"REPEAT":
					pc = 0
					return output
		pc = next
	stopped = true
	return output
