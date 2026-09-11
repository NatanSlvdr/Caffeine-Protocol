# Cafe Simulation

## Role In Act I

The cafe simulation is the validation harness for Query's program. It should be
predictable, replayable, and readable. Simulation complexity exists to make
program behavior visible, not to create a deep restaurant-management game in
Act I.

## Cafe Layout

The café is a compact portrait room, 14 tiles wide and 19 tall. The kitchen occupies the top and is almost enclosed by a brick partition. A staff doorway permits human movement; a separate pickup counter permits drink handoff across the partition. Customers enter from the bottom and approach a dedicated order till. Two columns contain 2–10 active tables, with a central walking aisle.

Required stations:

- Order till: Query takes orders near the entrance from Level 3 onward.
- Kitchen: Niko prepares coffee and tea using the supplied equipment tiles.
- Pickup counter: Niko deposits prepared drinks on its kitchen side; the floor robot collects them from its dining-room side.
- Tables: customers wait, receive drinks, leave and trigger scripted cleaning.

Levels 1–2 show Niko doing every task. From Level 3, the floor helper is a scripted presentation actor using the existing robot sprite. It does not introduce another editable program. Actors follow continuous waypoint paths through the staff doorway and central aisle, without crossing the kitchen walls.

## Customer Flow

1. Customer enters and joins the counter queue.
2. Customer speaks; the speech event includes a source phrase and intent chips.
3. Query must create the correct order ticket or tickets.
4. Customer sits at an available clean table.
5. Scripted preparation creates the drink from the ticket.
6. Scripted serving delivers the drink to the customer.
7. Customer leaves.
8. Table becomes dirty and blocks future seating until cleaned.

In Act I, preparation, serving, and cleaning are scripted unless a level
explicitly states otherwise. Query owns only order intake from Level 3 onward.

## Satisfaction And Patience

Each customer has individual satisfaction. The level summary also shows average
satisfaction.

First-pass tuning defaults:

- Starting satisfaction: 100.
- Satisfaction decay before ticket creation: 6 points per simulated 10 seconds.
- Satisfaction decay after ticket creation: 3 points per simulated 10 seconds.
- Customer warning threshold: 65.
- Abandon threshold: 30.
- Abandon delay after threshold: 10 simulated seconds.

If a customer abandons, the run fails for programming levels. In observation
levels, abandonment is allowed only when the level is demonstrating a bottleneck.

## Timing Defaults

These are tuning defaults, not final balance locks.

| Action | Duration |
| --- | ---: |
| Customer entry spacing, early | 8-12 seconds |
| Customer entry spacing, late Act I | 4-8 seconds |
| Query speech event dispatch | immediate |
| Ticket creation action | 1 second |
| Coffee preparation | 6 seconds |
| Tea preparation | 7 seconds |
| Serve drink | 5 seconds |
| Clean table | 4 seconds |

## Validation Runs

Programming levels use deterministic validation seeds. A seed defines:

- customer count;
- customer arrival timings;
- spoken phrases and intent chips;
- expected ticket data;
- table assignment order;
- optional ambiguity/help responses;
- scoring targets.

Completion requires all required seeds to pass. Validation stops on the first
failing seed and shows the failing event.

## Failure Conditions

A programming run fails immediately when:

- Query creates the wrong ticket;
- Query creates no ticket for a required order;
- Query creates the wrong number of tickets for one customer speech event;
- a ticket has the wrong item or modifier;
- ambiguous speech confidence is treated as a concrete order instead of asking
  for help;
- a customer abandons because Query failed its role;
- the program hits a runtime error not accepted by the level.

Wrong delivered orders always fail the level. In Act I, a wrong delivered order
usually traces back to an incorrect ticket from Query.

## Godot Implementation Notes

Recommended scenes/resources:

- `CafeSimulation.tscn`: root simulation scene with station, customer, ticket,
  and robot managers.
- `LevelDefinition.gd`: `Resource` containing level id, seeds, starter program,
  block palette, scoring targets, and story interlude ids.
- `ValidationSeed.gd`: `Resource` containing deterministic customer scripts and
  expected outcomes.
- `CustomerActor.tscn`: visual customer with queue, speak, sit, wait, leave
  states.
- `OrderTicket.gd`: data object created by Query and consumed by scripted prep.
- `SimulationRunner.gd`: owns play, pause, step, fast-forward, restart, failure,
  and result reporting.

Useful signals:

- `customer_spoke(customer_id, phrase, intent_chips)`
- `ticket_created(ticket)`
- `ticket_failed(ticket, reason)`
- `block_executed(block_id)`
- `runtime_error(block_id, reason)`
- `validation_failed(seed_id, reason, event_time)`
- `validation_passed(seed_id, metrics)`
