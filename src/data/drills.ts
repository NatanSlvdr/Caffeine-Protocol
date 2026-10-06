import { compileProgram } from '@/domain/program';
import { indentSource } from '@/domain/scope';
import { runLevel } from '@/domain/simulation';
import { UNLOCKS } from '@/domain/unlocks';
import type { FailureCode } from '@/domain/failures';
import type { RobotPrograms, RobotRole, RunResult } from '@/domain/types';
import { lessons, levels } from './index';
import { referencePrograms } from './extension';

/**
 * A short drill on one idea a shift teaches, kept apart from the campaign: a gap in a shift's worked example, and a
 * few passages to fill it with. Whichever the player picks goes in, and the café serves the shift with it, so what
 * comes back is the café's own verdict, never an answer key's. Nothing is stored, and no drill unlocks anything.
 */
export interface Drill {
  id: string;
  /** The shift the drill is served on, as the player numbers it: its guests, its rules and its worked example. */
  shift: number;
  /** Whose routine has the gap. */
  robot: RobotRole;
  /** The idea, named as a title. */
  title: string;
  /** What to pick, in the café's words. */
  question: string;
  /** The worked example's passage at the gap: whole lines, written as the routine has them. */
  passage: string;
  /** The passages to choose from, the worked example's among them. tests/unit/data/drills.test.ts runs every one. */
  choices: string[];
  /** Said once the passage that serves the shift is picked: the idea in a sentence. */
  idea: string;
  /**
   * The failures, on any later shift, that mean this idea was missed, so Help can point to the drill. Only ones a wrong
   * choice here is turned away with, and only ones that say little else: running out of steps can be anything.
   */
  misses: FailureCode[];
}

const HELP_FIRST = 'LISTEN\nIF ambiguous IN CUSTOMER SPEECH\n  HELP\nEND\nFOR item IN heard orders';
const SUGAR_LOOP = 'STORE var1 FROM sugar\nFOR var1 TIMES\nTAKE UP\nEND';

export const drills: readonly Drill[] = [
  {
    id: 'paper-first',
    shift: 2,
    robot: 'query',
    title: 'Paper, then pen',
    question: 'Query writes each order on a ticket. Which way round do these two blocks go?',
    passage: 'TAKE UP\nITEM coffee',
    choices: ['ITEM coffee\nTAKE UP', 'TAKE UP\nITEM coffee'],
    idea: 'Query writes on the paper in its hand, so Take up comes before anything is written.',
    misses: ['no-paper'],
  },
  {
    id: 'loop-destination',
    shift: 3,
    robot: 'query',
    title: 'Where the loop comes back to',
    question: 'Jump listen sends Query back to the top for the next guest. Where does the destination go?',
    passage: 'POSITION listen\nLISTEN',
    choices: ['LISTEN\nPOSITION listen', 'POSITION listen\nLISTEN'],
    idea: 'Jump goes back to its destination and runs on from there, so the destination sits above Wait for Orders.',
    misses: [],
  },
  {
    id: 'if-else',
    shift: 4,
    robot: 'query',
    title: 'One or the other',
    question: 'Guests ask for tea or coffee. Which passage writes the right drink?',
    passage: 'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nELSE\n  ITEM coffee\nEND',
    choices: [
      'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nEND\nITEM coffee',
      'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nELSE\n  ITEM coffee\nEND',
      'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nEND',
    ],
    idea: 'Else runs only when the check fails: a tea order never reaches the coffee.',
    misses: ['blank-ticket', 'ticket-item'],
  },
  {
    id: 'without-sugar',
    shift: 5,
    robot: 'query',
    title: 'Without means none',
    question: 'Some guests want sugar, some say “without sugar”. Which passage writes their sugar?',
    passage:
      'IF sugar IN CUSTOMER SPEECH\n  IF negation IN CUSTOMER SPEECH\n    WRITE 0 sugar\n  ELSE\n    WRITE 1 sugar\n  END\nEND',
    choices: [
      'IF sugar IN CUSTOMER SPEECH\n  WRITE 1 sugar\nEND',
      'IF sugar IN CUSTOMER SPEECH\n  IF negation IN CUSTOMER SPEECH\n    WRITE 0 sugar\n  ELSE\n    WRITE 1 sugar\n  END\nEND',
    ],
    idea: '“Without sugar” still says sugar: check for the negation inside the sugar check.',
    misses: ['ticket-sugar'],
  },
  {
    id: 'ticket-per-drink',
    shift: 6,
    robot: 'query',
    title: 'A ticket for every drink',
    question: 'A guest can order more than one drink. Where does Query take up paper?',
    passage: 'FOR item IN heard orders\n  TAKE UP',
    choices: ['TAKE UP\nFOR item IN heard orders', 'FOR item IN heard orders\n  TAKE UP'],
    idea: 'Each drink is its own ticket, so the paper is taken up inside the loop, once for every order.',
    misses: ['no-paper'],
  },
  {
    id: 'help-first',
    shift: 8,
    robot: 'query',
    title: 'Ask before writing',
    question: 'Some guests mumble. Which passage makes sure Query knows the order first?',
    passage: HELP_FIRST,
    choices: ['LISTEN\nFOR item IN heard orders', HELP_FIRST],
    idea: 'An order nobody could make out is cleared up with Help before any ticket is written.',
    misses: ['unclear-order'],
  },
  {
    id: 'sugar-count',
    shift: 11,
    robot: 'prep',
    title: 'As many cubes as asked',
    question: 'Tickets say how many sugars. Which passage puts the right number in?',
    passage: SUGAR_LOOP,
    choices: ['IF sugar IN CUSTOMER SPEECH\nTAKE UP\nEND', 'TAKE UP', SUGAR_LOOP],
    idea: 'Store the ticket’s count, then repeat that many times: zero times is no sugar at all.',
    misses: ['sugar-count', 'too-much-sugar'],
  },
  {
    id: 'back-after-call',
    shift: 12,
    robot: 'prep',
    title: 'Back to the top after the call',
    question: 'The recipe is a function now. What follows the call in the main loop?',
    passage: 'CALL recipe\nJUMP listen',
    choices: ['CALL recipe', 'CALL recipe\nJUMP listen'],
    idea: 'A function returns to the block after its call: without a jump there, Brew runs on into the function.',
    misses: ['end-of-routine'],
  },
  {
    id: 'table-variable',
    shift: 14,
    robot: 'floor',
    title: 'The table, wherever it is',
    question: 'Porter has just stored the drink’s table. How does Porter get there?',
    passage: 'MOVE var1',
    choices: ['MOVE UP 2', 'MOVE var1'],
    idea: 'Move to a stored table walks to whichever table the drink is for, where fixed steps only reach one.',
    misses: ['wrong-table'],
  },
  {
    id: 'wait-for-dirty',
    shift: 15,
    robot: 'floor',
    title: 'Wait until the cup is empty',
    question: 'Porter is about to clear a table. What comes first?',
    passage: 'WAIT DIRTY\nSTORE var1 FROM table',
    choices: ['STORE var1 FROM table', 'WAIT DIRTY\nSTORE var1 FROM table'],
    idea: 'A cup can be cleared once the guest has drunk up: Wait for Dirty cups picks one that’s ready.',
    misses: ['no-job'],
  },
  {
    id: 'lid-to-go',
    shift: 17,
    robot: 'prep',
    title: 'A lid only to go',
    question: 'Take-away drinks need a lid. Which passage puts one on?',
    passage: 'IF togo IN CUSTOMER SPEECH\nTAKE UP\nEND',
    choices: ['TAKE UP', 'IF togo IN CUSTOMER SPEECH\nTAKE UP\nEND'],
    idea: 'Only a drink to go gets a lid: a guest staying in drinks from the open cup.',
    misses: ['lid-extra'],
  },
  {
    id: 'stop-at-closing',
    shift: 20,
    robot: 'floor',
    title: 'Stopping at closing',
    question: 'At closing time the café calls last orders. What does Porter do after Wait for Orders?',
    passage: 'LISTEN\nIF closed IN CUSTOMER SPEECH\nSTOP\nEND\nTAKE DOWN',
    choices: ['LISTEN\nTAKE DOWN', 'LISTEN\nIF closed IN CUSTOMER SPEECH\nSTOP\nEND\nTAKE DOWN'],
    idea: 'The closing call comes in like an order: check for it first, and stop instead of waiting for a drink.',
    misses: ['open-after-closing'],
  },
];

/** The shift's worked example, every robot's routine of it. */
const worked = (shift: number): RobotPrograms =>
  shift >= UNLOCKS.prep ? referencePrograms(shift) : { query: lessons[shift - 1].solution, prep: '', floor: '' };

/** What cuts a gap in a worked example: the shift, whose routine, and the passage the gap leaves out. */
type Gap = Pick<Drill, 'id' | 'shift' | 'robot' | 'passage'>;

/** The drill's robot's routine, around its gap: the worked example before and after the passage. */
export function drillRoutine(drill: Gap): { before: string; after: string } {
  const source = worked(drill.shift)[drill.robot];
  const at = source.indexOf(drill.passage);
  if (at < 0) throw new Error(`${drill.id}: the passage isn't in Shift ${drill.shift}'s worked example`);
  return { before: source.slice(0, at), after: source.slice(at + drill.passage.length) };
}

/** One line of a routine as it reads: a block, and how deep in the routine's scopes it sits. */
export interface DrillLine {
  command: string;
  depth: number;
}

/**
 * The routine laid out by nesting with a choice in its gap, cut in three: the lines above the gap, the choice's own,
 * and the lines below. End only closes a scope, so it's left out, as the block editor leaves it out.
 */
export function drillLines(drill: Gap, choice = drill.passage): Record<'before' | 'gap' | 'after', DrillLine[]> {
  const { before, after } = drillRoutine(drill);
  const lines = indentSource(before + choice + after).split('\n');
  const from = before.split('\n').length - 1,
    to = from + choice.split('\n').length;
  const read = (part: string[]) =>
    part
      .map((line) => ({ command: line.trim(), depth: (line.length - line.trimStart().length) / 2 }))
      .filter(({ command }) => command && command !== 'END');
  return { before: read(lines.slice(0, from)), gap: read(lines.slice(from, to)), after: read(lines.slice(to)) };
}

/** Serve the drill's shift with one of its choices in the gap, and the worked example everywhere else. */
export function tryDrill(drill: Gap, choice: string): RunResult {
  const { before, after } = drillRoutine(drill);
  const programs = { ...worked(drill.shift), [drill.robot]: before + choice + after };
  const level = levels[drill.shift - 1];
  return runLevel(
    level,
    compileProgram(programs.query, drill.shift),
    drill.shift >= UNLOCKS.prep ? programs : undefined,
  );
}
