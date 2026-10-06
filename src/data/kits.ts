import { indentSource } from '@/domain/scope';
import type { RobotRole } from '@/domain/types';
import { drillRoutine, type DrillLine } from './drills';

/**
 * A limited kit: a gap in a shift's worked example, and a handful of blocks to fill it with that leave out the one the
 * example leans on. The player builds the passage from the kit, each block once and in any order, and the café serves
 * the shift with it, so what comes back is the café's own verdict. Each kit teaches another way to write the same
 * thing with blocks the player already has.
 */
export interface Kit {
  id: string;
  /** The shift the kit is served on, as the player numbers it. */
  shift: number;
  /** Whose routine has the gap. */
  robot: RobotRole;
  /** The idea, named as a title. */
  title: string;
  /** What to build, in the café's words. */
  question: string;
  /** What the kit leaves out, shown before a block is placed. */
  rule: string;
  /** The worked example's passage at the gap, which the kit can't build. */
  passage: string;
  /** The kit's blocks, one line each, in the order the tray shows them. */
  tiles: string[];
  /** One passage the kit builds that serves the shift. tests/unit/data/kits.test.ts serves it. */
  answer: string;
  /** Said once a passage from the kit serves the shift: the other way of writing it, in a sentence. */
  idea: string;
}

export const kits: readonly Kit[] = [
  {
    id: 'two-ifs',
    shift: 4,
    robot: 'query',
    title: 'Two Ifs for one Else',
    question: 'Guests ask for tea or coffee, and this kit has no Else. Build the passage that writes the drink.',
    rule: 'No Else',
    passage: 'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nELSE\n  ITEM coffee\nEND',
    tiles: ['ITEM coffee', 'END', 'IF tea IN CUSTOMER SPEECH', 'END', 'IF coffee IN CUSTOMER SPEECH', 'ITEM tea'],
    answer: 'IF tea IN CUSTOMER SPEECH\nITEM tea\nEND\nIF coffee IN CUSTOMER SPEECH\nITEM coffee\nEND',
    idea: 'Every guest asks for one or the other, so an If for each drink does what If and Else did.',
  },
  {
    id: 'last-word',
    shift: 5,
    robot: 'query',
    title: 'The last word on sugar',
    question: 'This kit has no Else, so one If can’t sit inside the other. Build the passage that writes the sugar.',
    rule: 'No Else',
    passage:
      'IF sugar IN CUSTOMER SPEECH\n  IF negation IN CUSTOMER SPEECH\n    WRITE 0 sugar\n  ELSE\n    WRITE 1 sugar\n  END\nEND',
    tiles: [
      'WRITE 0 sugar',
      'IF negation IN CUSTOMER SPEECH',
      'END',
      'IF sugar IN CUSTOMER SPEECH',
      'WRITE 1 sugar',
      'END',
    ],
    answer: 'IF sugar IN CUSTOMER SPEECH\nWRITE 1 sugar\nEND\nIF negation IN CUSTOMER SPEECH\nWRITE 0 sugar\nEND',
    idea: 'A sugar written later replaces the one before, so checking for “without” last gives it the last word.',
  },
  {
    id: 'grinder-if',
    shift: 10,
    robot: 'prep',
    title: 'Tea gets its own If',
    question: 'Only coffee goes by the grinder, and this kit has no Else. Build Brew’s walk to the next station.',
    rule: 'No Else',
    passage: 'IF coffee IN CUSTOMER SPEECH\nMOVE RIGHT 3\nUSE UP\nMOVE RIGHT 5\nELSE\nMOVE RIGHT 8\nEND',
    tiles: [
      'MOVE RIGHT 8',
      'IF coffee IN CUSTOMER SPEECH',
      'END',
      'USE UP',
      'IF tea IN CUSTOMER SPEECH',
      'MOVE RIGHT 5',
      'END',
      'MOVE RIGHT 3',
    ],
    answer:
      'IF coffee IN CUSTOMER SPEECH\nMOVE RIGHT 3\nUSE UP\nMOVE RIGHT 5\nEND\nIF tea IN CUSTOMER SPEECH\nMOVE RIGHT 8\nEND',
    idea: 'Both Ifs end at the same station, so whichever one ran, Brew carries on from the same tile.',
  },
  {
    id: 'no-call',
    shift: 14,
    robot: 'floor',
    title: 'The function, written out',
    question: 'This kit has no Call. Build what Porter does with the drink, right there in the main loop.',
    rule: 'No Call',
    passage: 'CALL deliver',
    tiles: ['MOVE var2', 'DEPOSIT UP', 'STORE var1 FROM table', 'MOVE var1'],
    answer: 'STORE var1 FROM table\nMOVE var1\nDEPOSIT UP\nMOVE var2',
    idea: 'A function is a passage with a name: written out where it was called, it does the same.',
  },
  {
    id: 'jump-past',
    shift: 17,
    robot: 'floor',
    title: 'Jump instead of Else',
    question: 'Drinks to go go to the shelf, and this kit has no Else. Build Porter’s choice between shelf and table.',
    rule: 'No Else',
    passage: 'IF togo IN CUSTOMER SPEECH\nMOVE LEFT 12\nDEPOSIT DOWN\nMOVE var2\nELSE\nCALL deliver\nCALL clear\nEND',
    tiles: [
      'CALL deliver',
      'MOVE var2',
      'IF togo IN CUSTOMER SPEECH',
      'JUMP listen',
      'DEPOSIT DOWN',
      'END',
      'CALL clear',
      'MOVE LEFT 12',
    ],
    answer:
      'IF togo IN CUSTOMER SPEECH\nMOVE LEFT 12\nDEPOSIT DOWN\nMOVE var2\nJUMP listen\nEND\nCALL deliver\nCALL clear',
    idea: 'A Jump at the end of the If’s block goes back to the top for the next order, so the blocks after it are skipped.',
  },
];

/**
 * The blocks built so far as they sit in the gap, nested by the routine around them. End shows here, unlike in the
 * drills, since placing it is part of the build; an End with nothing to close stays at the gap's own depth.
 */
export function kitLines(kit: Kit, built: readonly string[]): DrillLine[] {
  const { before, after } = drillRoutine(kit);
  const from = before.split('\n').length - 1;
  const depth = (line: string) => (line.length - line.trimStart().length) / 2;
  const floor = depth(indentSource(`${before}GAP`).split('\n')[from]);
  return indentSource(before + built.join('\n') + after)
    .split('\n')
    .slice(from, from + built.length)
    .map((line) => ({ command: line.trim(), depth: Math.max(floor, depth(line)) }));
}
