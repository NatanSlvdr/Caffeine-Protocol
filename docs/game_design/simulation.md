# Cafe Simulation

## Role In Act I

The cafe simulation is the validation harness for Query's program. It should be
predictable, replayable, and readable. Simulation complexity exists to make
program behavior visible, not to create a deep restaurant-management game in
Act I.

## Cafe Layout

The working layout is a compact cafe, not a large empty floor. The kitchen/prep
zone sits on the left side of the screen and is enclosed by service countertops
instead of full walls, like a real coffee shop. Customers enter from the bottom
edge and approach the order-taking station near that entrance.

Later acts can expand table count and traffic, but the base layout should stay
small enough that robot positions and cafe workflow are readable at a glance.

Required Act I stations:

- Entrance/order point: customers enter from the bottom and speak to Query here.
- Left kitchen/prep zone: behind-counter work zone for preparation equipment.
- Service counters: counter runs form the visible boundary around the kitchen.
- Queue board: structured order tickets appear here.
- Pricing machine: visible counter prop that totals orders automatically in Act
  I.
- Coffee machine: scripted preparation creates coffee.
- Tea station: scripted preparation creates tea.
- Pickup counter: completed drinks wait here.
- Customer tables: customers sit after ordering.
- Cleaning spot: dirty tables are reset by scripted cleaning work.

Robot station layout:

- Order-taking robot/Query: red marker near the bottom entrance/order point.
- Preparation robot: red marker inside the left kitchen/prep zone.
- Floor/server robot: red marker in the main customer area.

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
