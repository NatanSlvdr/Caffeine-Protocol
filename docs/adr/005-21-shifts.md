# ADR 005: 21 shifts, short solo acts, hard shifts for the whole crew

- Status: accepted, supersedes the shift order of [001](001-32-shifts.md)
- Date: 2026-09-30

## Context

The 32-shift campaign stopped being a challenge once the pattern was clear.
Acts I–III each spent eight to twelve shifts on one robot, and most of the
later shifts only changed a number or blanked a different line of the same
program. The robots only really played together in the last two shifts, which
is where the interesting problems are: one robot's program is only right if
the other two do their part.

## Decision

- **21 shifts.** Prologue (1), Act I Query (7), Act II Brew (5), Act III
  Porter (3), Act IV all three robots (5). The table is in
  [docs/campaign/README.md](../campaign/README.md).
- **Solo acts stay short.** Each introduces its robot's classic cases and
  nothing else. Shifts that only varied the wording, the queue length or one
  blanked line were merged away (old L02, L06, L08, L12–L14, L15–L16, L22,
  L25, L27–L28, L30).
- **Act IV holds the hard shifts.** Every Act IV shift adds one odd rule that
  the Act III programs can't handle, and that needs changes to more than one
  robot: take-away orders, only four cups, customers in a hurry, and closing
  time, then all of them at once. They are café problems, not "fix Niko's old
  code" debugging puzzles.
- **One unlock table.** `src/domain/unlocks.ts` names the shift where each
  robot and each part of the language arrives. The compiler, the robots, the
  reference programs, the rail and the saves all read from it.
- **Save v4.** v1–v3 saves were indexed against 32 shifts. `parseSave` maps
  them through `LEGACY_COUNTERPARTS`: a new shift keeps the stars and programs
  of the old shift that played the same way, and play resumes at the first new
  shift whose counterpart wasn't served. Merged shifts drop their stars rather
  than grant stars for content the player hasn't seen.

## Consequences

Cutscenes open before shifts 1, 2, 9, 13, 14 and 17, and after 21. A finished
32-shift save resumes at the start of Act IV. The Act I level documents in
`docs/game_design/levels/` still describe the older 14-shift Act I.
