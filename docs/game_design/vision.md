# Vision

## Game Identity

Caffeine Protocol is a cozy puzzle-comedy game about restoring an abandoned
retro-future cafe and gradually programming a robot staff until service runs by
itself.

The player character is Niko. The first repaired robot is Query, the
order-taking robot. Query is friendly, literal, and good at listening once Niko
teaches it how to translate customer speech into robot-readable order tickets.

## Core Pillars

- Automation through learning: each robot and programming concept is introduced
  one clear step at a time.
- Service as validation: cafe operations are the test harness for the player's
  program.
- Readable robot logic: programs should be easy to inspect, replay, debug, and
  improve.
- Pressure before replacement: a scripted human worker demonstrates a job before
  a robot takes ownership of that job.
- Puzzle clarity over simulation complexity: every new rule should exist because
  it creates a readable programming problem.

## Act I Scope

Act I is the first playable vertical slice and focuses only on Query. The player
does not directly control an avatar. Instead, the player edits Query's
Scratch-like visual program, runs deterministic cafe simulations, inspects the
first failing case, and revises the program.

Before a robot owns a role, scripted human work can perform that role
automatically. Once a robot is introduced for a role, there is no human fallback
for that role during validation.

## Tone And Presentation

- Tone: cozy puzzle comedy.
- Setting: cozy modern 2026 coffee shop with visible repair benches, practical
  robot parts, clean service surfaces, comfortable cafe materials, and selective
  machine-status details.
- Camera: 2D top-down cafe view.
- Humor should come from literal robot interpretation and cafe mishaps, not from
  punishing the player.

## Future Scope Notes

The preparation robot, floor robot, charging, carrying-route planning, robot
running, pricing-machine failure, and customer total calculation are not Act I
requirements. They should be referenced only as future hooks unless a later
documentation pass makes them implementation-ready.
