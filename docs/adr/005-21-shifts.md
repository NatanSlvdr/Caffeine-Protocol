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
  the Act III programs can't handle: take-away orders (17), only four cups
  (18), customers in a rush (19) and closing time (20), then all of them at
  once (21). They are café problems, not "fix Niko's old code" debugging
  puzzles, so each shift starts from the previous shift's programs rather than
  a blanked line. To Go, In a Hurry and Last Orders need changes to all three
  robots; Four Cups mostly to Brew, with Porter's clearing keeping it fed. The
  rules are in [robots.md](../game_design/robots.md#act-iv-the-whole-crew).
- **Rules only add work.** Handling a rule that isn't active is harmless
  (washing an empty sink, an If that never matches), so a player's programs
  carry forward from shift to shift. The Act IV reference programs carry
  forward the same way: each one keeps handling every rule met since shift 17,
  so the star targets of shifts 18–20 leave room for the code a player brings
  in, and the finale is served by the Last Orders programs. They make and
  serve one drink at a time; batching still works, but has to make room for
  rush orders and for a half-full batch at closing.
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
32-shift save resumes at the start of Act IV. Act IV adds two stations to the
café: a stack of paper cups and lids between the sugar and pickup, and a to-go
shelf on the counter corner by the door. The hand-written Act I level documents
in `docs/game_design/levels/` described the older 14-shift Act I; they were
replaced by one generated page per shift in
[docs/campaign/shifts/](../campaign/shifts/README.md).
