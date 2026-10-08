import { compileProgram } from '@/domain/program';
import { indentSource } from '@/domain/scope';
import { runLevel } from '@/domain/simulation';
import { UNLOCKS } from '@/domain/unlocks';
import type { ExecutionEvent, RobotPrograms, RobotRole } from '@/domain/types';
import { lessons, levels } from './index';
import { referencePrograms } from './extension';
import { predictionsFr } from './drills.fr';
import { toldIn } from './told';

/**
 * A moment paused in a served shift: one guest, one robot, the block it has just run. The player calls which block
 * runs next, then the café plays on. The answer is never written down here: it is whatever the shift's worked example
 * actually runs next for that guest, so a changed rule or a reworked example moves the answer with it, and
 * tests/unit/data/predictions.test.ts checks it is still one of the choices.
 */
export interface Prediction {
  id: string;
  /** The shift the moment comes from, as the player numbers it. */
  shift: number;
  /** Whose routine is paused. */
  robot: RobotRole;
  /** The idea, named as a title. */
  title: string;
  /** The guest the moment turns on, by when they arrive in the shift's first round, counting from 1. */
  guest: number;
  /** The line of the worked example the robot has just run, counting from 0 as the routine is written. */
  after: number;
  /** The lines to call between, counted the same way; the one that runs next is among them. */
  choices: number[];
  /** Said once the café plays on: why that block, in a sentence or two. */
  why: string;
}

export const predictions: readonly Prediction[] = [
  {
    id: 'tea-or-coffee',
    shift: 4,
    robot: 'query',
    title: 'Which side of the If',
    guest: 2,
    after: 3,
    choices: [4, 6, 8],
    why: 'The guest said tea, so the check passes: Query runs the If’s own block, and the Else is skipped.',
  },
  {
    id: 'sugar-but-without',
    shift: 5,
    robot: 'query',
    title: 'Sugar, but without',
    guest: 2,
    after: 9,
    choices: [10, 12, 15],
    why: '“Without sugar” has both words in it. The inner check finds the negation, so the ticket says 0 sugar.',
  },
  {
    id: 'second-drink',
    shift: 6,
    robot: 'query',
    title: 'One ticket handed in, one to go',
    guest: 1,
    after: 18,
    choices: [1, 3, 20],
    why: 'The guest asked for two drinks and the loop has only done the coffee, so it goes round again for the tea.',
  },
  {
    id: 'no-number',
    shift: 7,
    robot: 'query',
    title: 'Sugar without a number',
    guest: 4,
    after: 9,
    choices: [10, 13, 21],
    why: '“With sugar” gives no number, so the Else runs, and the older sugar checks inside it decide the ticket.',
  },
  {
    id: 'clear-order',
    shift: 8,
    robot: 'query',
    title: 'Nothing to ask',
    guest: 4,
    after: 2,
    choices: [3, 5, 6],
    why: 'A plain “coffee” is clear, so Help is skipped and the loop over the orders starts straight away.',
  },
  {
    id: 'zero-times',
    shift: 11,
    robot: 'prep',
    title: 'Zero times round',
    guest: 1,
    after: 16,
    choices: [17, 19, 20],
    why: 'The ticket says 0 sugars, so the loop runs zero times: Brew skips the sugar and walks on.',
  },
  {
    id: 'after-return',
    shift: 12,
    robot: 'prep',
    title: 'Where Return goes',
    guest: 1,
    after: 25,
    choices: [0, 3, 5],
    why: 'Return goes back to the block after the call that started the function, here Jump listen in the main loop.',
  },
  {
    id: 'after-deliver',
    shift: 15,
    robot: 'floor',
    title: 'Back from one function, into the next',
    guest: 1,
    after: 12,
    choices: [5, 6, 15],
    why: 'Deliver was called from the main loop, so Return comes back to the block after that call: Call clear.',
  },
  {
    id: 'skip-the-else',
    shift: 17,
    robot: 'floor',
    title: 'Done with the If',
    guest: 2,
    after: 7,
    choices: [9, 10, 12],
    why: 'The drink was to go, so the If’s block ran; once it ends, the Else is skipped and the main loop goes on.',
  },
  {
    id: 'no-lid',
    shift: 17,
    robot: 'prep',
    title: 'No lid to stay',
    guest: 1,
    after: 23,
    choices: [24, 26, 27],
    why: 'This guest is staying, so the to-go check fails and Brew walks past the lids without taking one.',
  },
];

/** A moment in the reader's language: its title and why; the guest, the lines and the answer are the same. */
export const predictionIn = toldIn(predictions, predictionsFr);

/** The shift's worked example, every robot's routine of it. */
const worked = (shift: number): RobotPrograms =>
  shift >= UNLOCKS.prep ? referencePrograms(shift) : { query: lessons[shift - 1].solution, prep: '', floor: '' };

/** End and Else only close or hand over a scope, so they are never what a robot is said to run next. */
const closes = (command: string) => command === 'END' || command === 'ELSE';

/** One line of the paused routine: its block, how deep it sits, and its place in the routine. */
export interface MomentLine {
  command: string;
  depth: number;
  line: number;
}

/** The moment as the café ran it: what the guest said, the block just run, and the one that ran next. */
export interface Moment {
  /** The guest's own words. */
  phrase: string;
  /** The robot's record of the block it has just run: its hands, its paper and its memory once it was done. */
  paused: ExecutionEvent;
  /** The line that actually ran next. */
  next: number;
  /** The whole routine, laid out by nesting; End is left out, as the block editor leaves it out. */
  lines: MomentLine[];
}

/** Serve the prediction's shift with its worked example and find the moment in the first round. */
export function momentOf(prediction: Prediction): Moment {
  const { shift, robot, guest, after } = prediction;
  const programs = worked(shift);
  const level = levels[shift - 1];
  const result = runLevel(level, compileProgram(programs.query, shift), shift >= UNLOCKS.prep ? programs : undefined);
  const customer = level.seeds[0].customers[guest - 1];
  const events = result.execution?.[0]?.events.filter((event) => event.actor === robot) ?? [];
  // The guest's stretch of the routine runs from the first block on their order until a block on someone else's.
  // Walking back after a handoff is on nobody's order, so it still counts as theirs.
  const id = customer?.customer_id;
  const from = events.findIndex((event) => event.customerId === id);
  const until = events.findIndex((event, i) => i > from && !!event.customerId && event.customerId !== id);
  const stretch = from < 0 ? [] : events.slice(from, until < 0 ? undefined : until);
  const at = stretch.findIndex((event) => event.line === after);
  if (at < 0) throw new Error(`${prediction.id}: guest ${guest} never sees line ${after} run`);
  // A walk is one block over several steps, so it is done once its last step is.
  let done = at;
  while (stretch[done + 1]?.line === after) done++;
  const following = events.slice(from + done + 1).find((event) => !closes(event.command));
  if (!following) throw new Error(`${prediction.id}: nothing runs after line ${after}`);
  const lines = indentSource(programs[robot])
    .split('\n')
    .map((text, line) => ({ command: text.trim(), depth: (text.length - text.trimStart().length) / 2, line }))
    .filter(({ command }) => command && command !== 'END');
  return { phrase: customer!.phrase, paused: stretch[done], next: following.line, lines };
}
