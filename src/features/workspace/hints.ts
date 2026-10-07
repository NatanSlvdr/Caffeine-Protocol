import { blockFields, familyFor, ROBOT_DISPLAY_NAMES, spokenBlock } from '@/domain';
import type { FailureCode, ProgressSave, RobotRole } from '@/domain';
import type { RunEvidence } from './evidence';
import { HELP_WORDS } from './modals/helpWords';

/** How many tiers Help's hints have, each asked for in turn: the idea, a clue about the routine, the worked example. */
export const HINT_TIERS = HELP_WORDS.en.tiers.length;

/** A clue about the open routine: one sentence, and the block it points at when there is one to show. */
export interface Clue {
  text: string;
  /** The robot and source line to put focus on, when the clue points at a block. */
  show?: { role: RobotRole; line: number };
}

/** A routine's blocks as source lines and the commands on them, leaving out blank lines and notes. */
const blocksOf = (source: string) =>
  source
    .split('\n')
    .map((text, line) => ({ line, command: text.trim() }))
    .filter(({ command }) => command && !command.startsWith('#'));

/** The library block a command comes from, as its tile names it: Wait for Orders and Wait for Dirty cups apart. */
function blockName(command: string): string {
  const { family, verb, value } = blockFields(command);
  if (family === 'POSITION') return 'Jump destination';
  return family === 'WAIT' ? `${verb} ${value}` : verb;
}

/** Which library block a command is, telling the two kinds of Wait apart. */
const kindOf = (command: string) => (familyFor(command) === 'WAIT' ? command : familyFor(command));

/** Items said as a list: “a”, “a and b”, “a, b and c”, with the language's own “and”. */
export const andList = (items: readonly string[], and = 'and') =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;

/**
 * Where to look, short of the answer. A last run that stopped in another robot's routine comes first: that's where
 * the trouble is. Otherwise the open routine is set against the worked example: the blocks the example uses that the
 * routine has none of, then the first block where the two part ways. A different routine can still be right, so the
 * clue says where they differ, never that the routine is wrong.
 */
export function clueFor(
  role: RobotRole,
  source: string,
  example: string,
  evidence: RunEvidence | null,
  stale: boolean,
  say = HELP_WORDS.en.clue,
): Clue {
  const robot = ROBOT_DISPLAY_NAMES[role];
  const stopped = evidence && !stale ? (evidence.failure.role ?? 'query') : undefined;
  if (stopped && stopped !== role) {
    const other = ROBOT_DISPLAY_NAMES[stopped];
    return {
      text: say.elsewhere(other, robot),
      show: evidence!.failure.error_line >= 0 ? { role: stopped, line: evidence!.failure.error_line } : undefined,
    };
  }
  const mine = blocksOf(source),
    theirs = blocksOf(example);
  // End only closes what an If, For or Function opened: the block it closes is the clue.
  const have = new Set(mine.map((b) => kindOf(b.command)));
  const missing = [
    ...new Set(
      theirs.filter((b) => b.command !== 'END' && !have.has(kindOf(b.command))).map((b) => blockName(b.command)),
    ),
  ];
  if (missing.length) return { text: say.missing(andList(missing, say.and), robot) };
  const at = mine.findIndex((block, i) => block.command !== theirs[i]?.command);
  if (at < 0 && mine.length === theirs.length) return { text: say.matches(robot) };
  const words = (i: number) => say.quote(spokenBlock(mine[i].command));
  if (at < 0) {
    const last = mine.length - 1;
    return {
      text: say.ends(robot, words(last)),
      show: { role, line: mine[last].line },
    };
  }
  const where =
    at >= theirs.length
      ? say.beyond(robot, words(at))
      : at === 0
        ? say.first(robot, words(0))
        : say.parts(robot, words(at - 1), words(at));
  return { text: where, show: { role, line: mine[at].line } };
}

/** A drill away from the rail, as Help names it when a run fails the way the drill's idea is missed. */
export interface WorkspaceDrill {
  title: string;
  shift: number;
  misses: readonly FailureCode[];
}

/**
 * The drill on the idea the last failed run missed, from a shift already served, so the drill is open and gives
 * nothing away. When two would do, the newer: it's the one nearest what the shift asks now.
 */
export function drillFor(
  drills: readonly WorkspaceDrill[],
  stars: ProgressSave['stars'],
  evidence: RunEvidence | null,
  stale: boolean,
): WorkspaceDrill | undefined {
  if (!evidence || stale) return undefined;
  return drills.findLast(
    (drill) => stars[drill.shift - 1] !== undefined && drill.misses.includes(evidence.failure.code),
  );
}
