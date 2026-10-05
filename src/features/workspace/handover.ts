import { UNLOCKS } from '@/domain';
import type { RobotRole } from '@/domain';

/** One part of the job a robot takes over: what the helper did, and the block a routine does it with. */
export interface HandoverStep {
  /** A word or two for the step, as it sits in the row. */
  short: string;
  text: string;
  /** The block as its tile names it. */
  block: string;
  /** Whether a routine's command does this step. */
  matches: (command: string) => boolean;
}

/** The job a robot takes over from a human helper on its first shift, and who still does the rest. */
export interface Handover {
  role: Exclude<RobotRole, 'query'>;
  helper: string;
  /** The level the robot takes over on. */
  level: number;
  /** What the helper or the crew still does, so the routine needn't. */
  still: string;
  steps: HandoverStep[];
}

const is = (command: string) => (line: string) => line === command;

export const HANDOVERS: readonly Handover[] = [
  {
    role: 'prep',
    helper: 'Moka',
    level: UNLOCKS.prep,
    still: 'Query hands the tickets over, and Pip still serves the room.',
    steps: [
      {
        short: 'Ticket',
        text: 'Wait for a ticket at the order handoff',
        block: 'Wait for Orders',
        matches: is('LISTEN'),
      },
      { short: 'Beans', text: 'Take the beans from storage', block: 'Take up', matches: is('TAKE UP') },
      { short: 'Grind', text: 'Grind them in the coffee machine', block: 'Use up', matches: is('USE UP') },
      { short: 'Water', text: 'Take water at the sink', block: 'Take up', matches: is('TAKE UP') },
      { short: 'Brew', text: 'Brew the coffee in the machine', block: 'Use up', matches: is('USE UP') },
      { short: 'Pickup', text: 'Leave the drink at pickup', block: 'Deposit up', matches: is('DEPOSIT UP') },
      {
        short: 'Again',
        text: 'Go back for the next ticket',
        block: 'Jump',
        matches: (line) => line.startsWith('JUMP '),
      },
    ],
  },
  {
    role: 'floor',
    helper: 'Pip',
    level: UNLOCKS.floor,
    still: 'Pip still clears the tables, just for today.',
    steps: [
      { short: 'Drink', text: 'Wait for a drink to be ready', block: 'Wait for Orders', matches: is('LISTEN') },
      { short: 'Pick up', text: 'Pick it up from pickup', block: 'Take down', matches: is('TAKE DOWN') },
      {
        short: 'Table',
        text: 'Read the table off its ticket',
        block: 'Store table',
        matches: (line) => /^STORE var\d FROM table$/.test(line),
      },
      {
        short: 'Walk there',
        text: 'Walk to that table',
        block: 'Move to',
        matches: (line) => /^MOVE var\d$/.test(line),
      },
      { short: 'Serve', text: 'Serve the drink', block: 'Deposit up', matches: is('DEPOSIT UP') },
      {
        short: 'Walk back',
        text: 'Walk back to the counter',
        block: 'Move',
        matches: (line) => line.startsWith('MOVE '),
      },
      {
        short: 'Again',
        text: 'Go back for the next drink',
        block: 'Jump',
        matches: (line) => line.startsWith('JUMP '),
      },
    ],
  },
];

/** The handover on a shift's first service, when one of the robots takes a helper's job over there. */
export const handoverFor = (level: number) => HANDOVERS.find((handover) => handover.level === level);

/**
 * A routine's commands in the order it runs them: notes and blank lines left out, and every Call replaced by the
 * function it calls, so a step written inside a function counts where it happens.
 */
function runOrder(source: string): string[] {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const functions = new Map<string, string[]>(),
    main: string[] = [];
  let open: string[] | undefined,
    depth = 0;
  for (const line of lines) {
    if (!open && line.startsWith('FUNCTION ')) {
      open = [];
      functions.set(line.slice(9).trim(), open);
      depth = 0;
    } else if (open) {
      if (/^(IF|FOR) /.test(line)) depth++;
      if (line === 'END' && depth-- === 0) open = undefined;
      else open.push(line);
    } else main.push(line);
  }
  const inline = (body: string[], calling: Set<string>): string[] =>
    body.flatMap((line) => {
      const name = line.startsWith('CALL ') ? line.slice(5).trim() : undefined;
      const called = name !== undefined && !calling.has(name) ? functions.get(name) : undefined;
      return called ? inline(called, new Set(calling).add(name!)) : [line];
    });
  return inline(main, new Set());
}

/**
 * Which of the job's steps the routine does, in order: the steps are lined up against the routine's commands as it
 * runs them, so two steps done by the same block (Take up the beans, Take up the water) each need a block of their
 * own, in the right place, and a step left out shows up as the one that is missing.
 */
export function handoverCovered(steps: readonly HandoverStep[], source: string): boolean[] {
  const commands = runOrder(source);
  // Longest common subsequence, filled from the end so the walk below can go forwards.
  const lcs = Array.from({ length: steps.length + 1 }, () => new Array<number>(commands.length + 1).fill(0));
  for (let i = steps.length - 1; i >= 0; i--)
    for (let j = commands.length - 1; j >= 0; j--)
      lcs[i][j] = steps[i].matches(commands[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const covered = steps.map(() => false);
  let i = 0,
    j = 0;
  while (i < steps.length && j < commands.length) {
    if (steps[i].matches(commands[j]) && lcs[i][j] === lcs[i + 1][j + 1] + 1) {
      covered[i++] = true;
      j++;
    } else if (lcs[i + 1][j] > lcs[i][j + 1]) i++;
    else j++;
  }
  return covered;
}
