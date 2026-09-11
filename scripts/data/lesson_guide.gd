class_name LessonGuide
extends RefCounted

const NOTES := [
	"Niko: The café is ours now. Watch customers order, receive a drink and leave a clean table. Open ticket details to inspect the lifecycle.",
	"Niko: Eight orders, one pair of hands. The counter queue keeps growing while I brew. Query could help, once we repair the controller.",
	"Query: BOOT OK. Add Create ticket, Set item: coffee and Submit ticket after Wait for customer speech. Each test is a fresh shift.",
	"Niko: Tea is on the menu. Use If heard drink is tea, then Set item: tea. In Else, set coffee. Close the branch with End, then submit.",
	"Query: I served one customer and stopped. Put Position: listen before Wait, then Jump to listen at the end. Every customer needs a ticket.",
	"Niko: A table for two can mean two drinks in one request. Wrap ticket creation, item selection and submission in For each heard order / End.",
	"Niko: Sweet or unsweetened? Store heard sugar in a variable, then set the ticket's sugar from that variable before submitting it.",
	"Niko: Regulars use different words for the same drink. Define a build-ticket function with the heard order as its parameter. Call it inside Each; return the ticket, then submit.",
	"Niko: 'The usual' is ambiguous. If speech is ambiguous, ask me for clarification before creating tickets. Without clarification, safely defer the order.",
	"Query: Two sugars is more precise than yes. If a sugar count exists, store it as a number and use it. Otherwise keep the binary sugar behavior.",
	"Niko: Time to tidy our routine. Keep the behavior, but share ticket building and copy whichever sugar chip exists. Compare your blocks and executed steps.",
	"Query: Lunch rush. Larger batches, familiar chips. Your saved program carries forward. Inspect the trace if a customer gets left behind.",
	"Niko: Our regulars mix clear orders and ambiguous requests. Keep asking for clarification before building their tickets, including numbered sugars.",
	"Niko: Certification day. Your own saved routine faces every case: singles, pairs, sugar and regulars. The counter is yours, Query. I'll keep the kettle busy.",
]

# Examples demonstrate the lesson's concept; they are revealed only on request.
static func solution(index: int) -> String:
	var number := index + 1
	if number <= 3: return "LISTEN\nTICKET\nITEM coffee\nSUBMIT"
	var item := "IF tea\nITEM tea\nELSE\nITEM coffee\nEND"
	if number == 4: return "LISTEN\nTICKET\n" + item + "\nSUBMIT"
	var body := "TICKET\n" + item
	if number == 7: body += "\nREAD sugar\nSUGAR variable"
	body += "\nSUBMIT"
	if number >= 6: body = "EACH\n" + body + "\nEND"
	if number <= 7: return "POSITION listen\nLISTEN\n" + body + "\nJUMP listen"
	var sugar := "READ sugar\nSUGAR variable"
	if number == 10: sugar = "IF count\nREAD count\nSUGAR number\nELSE\nSUGAR binary\nEND"
	if number >= 11: sugar = "SUGAR heard"
	var main := "POSITION listen\nLISTEN\n"
	if number >= 9: main += "IF ambiguous\nHELP\nEND\n"
	main += "EACH\nCALL build_ticket\nSUBMIT\nEND\nJUMP listen\n"
	return main + "FUNCTION build_ticket\nTICKET\nITEM heard\n" + sugar + "\nRETURN\nEND"

static func starter(index: int) -> String:
	if index <= 2: return "LISTEN"
	return solution(index - 1)
