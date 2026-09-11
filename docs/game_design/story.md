# Story

## Campaign Setup

Niko inherits an abandoned retro-future cafe full of half-working equipment,
old service manuals, and a quiet repair bay in the back room. The cafe can still
open, but only because Niko can patch together temporary scripted routines and
salvaged machines.

The early cafe runs prove that doing everything by hand does not scale. Niko
starts repairing robots from a nearby scrapyard so the cafe can become stable
without constant human intervention.

## Act I: Query, The Order-Taking Robot

Query is the first robot Niko repairs. Query can hear customers clearly, but it
needs programming before it can translate human requests into the structured
tickets used by the rest of the cafe.

Act I teaches Query through increasingly demanding order-intake puzzles:

- listen for a customer;
- create a ticket;
- distinguish menu items;
- wait for repeated arrivals;
- create multiple tickets from one customer speech event;
- preserve modifiers;
- share ticket logic across varied customer language;
- ask for help on ambiguous speech;
- handle sugar counts;
- pass larger randomized validation batches.

By the end of Act I, Query can operate the counter without Niko intervening.
The next bottleneck becomes drink preparation, setting up the preparation robot
for Act II.

## Pricing Machine

The cafe has an old pricing machine near the counter. During Act I it is world
context, not an implementation requirement: it explains why totals can be
handled automatically while the player is focused on teaching Query order
intake.

TODO future act: the pricing machine stops working later, forcing the player to
program how totals are calculated from tickets and how Query gives the total
back to customers.

## Interludes

Story should be delivered through short interludes between levels. Interludes
can show Niko repairing Query, Query misunderstanding a cafe phrase, or the next
service problem becoming visible. They should be brief enough that replaying a
level stays fast.
