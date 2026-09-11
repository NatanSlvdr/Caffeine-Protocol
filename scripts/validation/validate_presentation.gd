extends SceneTree

var failures := 0
var checks := 0

func _init() -> void:
	call_deferred("_validate")

func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		push_error(message)

func _validate() -> void:
	var art := CafeArt.new()
	root.add_child(art)
	art.active_tables = 10
	art.serving = true
	check(CafeArt.ROOM_SIZE.y > CafeArt.ROOM_SIZE.x, "The café must use a portrait footprint.")
	check(art.room.get_node("Tables").get_used_cells().size() == 40, "Ten distinct tables must remain available.")
	check(CafeArt.ORDER_POINT.distance_to(CafeArt.PASS_OUTSIDE) > 180, "Order intake and pickup must be separate stations.")
	var continuous := true
	var kitchen_owned := true
	var hall_owned := true
	var walls_clear := true
	var wall := Rect2(0, 120, 192, 48)
	for manual in [false, true]:
		art.awake = not manual
		for table in range(10):
			art.customer_number = table
			for boundary in [0.12, 0.20, 0.34, 0.43, 0.50, 0.58, 0.70, 0.76, 0.87, 0.90]:
				art.service_phase = boundary - 0.00001
				var before := art.actor_state()
				art.service_phase = boundary + 0.00001
				var after := art.actor_state()
				for actor in ["niko", "server", "customer"]:
					continuous = continuous and before[actor].distance_to(after[actor]) < 1.0
			for sample in range(101):
				art.service_phase = sample / 100.0
				var state := art.actor_state()
				if not manual: kitchen_owned = kitchen_owned and state.niko.y < 144
				hall_owned = hall_owned and state.server.y >= 181 and state.customer.y > 181
				walls_clear = walls_clear and not wall.has_point(state.niko) and not wall.has_point(state.server) and not wall.has_point(state.customer)
	check(continuous, "Actors must not teleport at service-phase boundaries.")
	check(kitchen_owned, "Niko must stay in the kitchen when the service robot owns delivery.")
	check(hall_owned, "Customers and the floor robot must stay outside the kitchen.")
	check(walls_clear, "Manual and automated paths must use the staff door rather than crossing kitchen walls.")
	art.awake = true
	art.service_phase = 0.53
	var deposit := art.actor_state()
	check(deposit.niko.is_equal_approx(CafeArt.PASS_INSIDE) and deposit.server.is_equal_approx(CafeArt.PASS_OUTSIDE), "Pickup handoff must place the two actors on opposite sides of the counter.")
	art.service_phase = 0.98
	var near_end := art.actor_state()
	art.service_phase = 1.0
	var end := art.actor_state()
	check(end.server.is_equal_approx(CafeArt.PASS_OUTSIDE), "The service robot must return to pickup before the next customer.")
	check(near_end.server.distance_to(end.server) < 100, "Return movement must be continuous.")
	art.queue_free()
	await process_frame
	print("Presentation validation: %s checks, %s failures" % [checks, failures])
	quit(1 if failures else 0)
