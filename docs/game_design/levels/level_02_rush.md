# Level 2: Rush

## Purpose

Show that scripted human order intake becomes the bottleneck and motivate
repairing Query.

## Story Beat

The reopening gets attention. More customers arrive than the patched-together
manual counter routine can comfortably handle.

## Player Task

Watch a scripted service run where orders start backing up at the counter. The
player should understand that the cafe needs automated order intake.

## Setup

- Active tables: 4.
- Customers: 8.
- Menu: coffee only.
- Query: visible in the repair bay with a short interlude after completion.
- Programming editor: locked.

## Available Blocks

None.

## Starter Program

None.

## Validation

This is a demonstration level, not a program-validation level.

Scripted customer sequence:

| Customer | Arrival | Phrase | Expected Result |
| --- | ---: | --- | --- |
| C1 | 0s | `coffee` | Served correctly. |
| C2 | 5s | `coffee` | Served correctly. |
| C3 | 10s | `coffee` | Served correctly. |
| C4 | 15s | `coffee` | Served correctly. |
| C5 | 20s | `coffee` | Satisfaction drops before service. |
| C6 | 25s | `coffee` | Satisfaction drops before service. |
| C7 | 30s | `coffee` | Counter queue visibly backs up. |
| C8 | 35s | `coffee` | Counter queue visibly backs up. |

## Success Conditions

- At least 6 customers are served.
- The run demonstrates a visible counter backlog.
- The interlude unlocks Query repair.

## Failure Conditions

None. This level should not fail, even if late customers are unhappy.

## Scoring

No stars. Completion unlocks Level 3.

## Godot Notes

- This is the only Act I level where low satisfaction is expected as a teaching
  beat.
- Use the summary panel to call out the counter bottleneck.
