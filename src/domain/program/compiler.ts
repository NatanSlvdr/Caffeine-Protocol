/** Query language: command unlocks and the finite-instruction compiler. */
import type { Program } from '../types';
import { DIRECTIONS } from '../directions';
import { DEPOSIT_RE, MOVE_RE, TAKE_RE } from '../commands';
import { QUERY_MAX_BLOCKS, ROBOT_STAND_IN_LEVEL } from '../constants';
import { UNLOCKS } from '../unlocks';
import { isOpening } from '../scope';
import { QUERY_CONDITION_SOURCES, QUERY_CONDITION_VALUES, parseConditionExpression } from './conditions';
import { legacyQueryAction } from './migration';
import { ROBOT_STORE_VALUES, VARIABLES, parseStore, parseSugarWrite } from './vars';

const writePattern = /^ITEM ([1-9]|1[0-9]) (coffee|tea)$/;

const tokenUnlocks: Record<string, number> = {
  coffee: UNLOCKS.choices,
  tea: UNLOCKS.choices,
  sugar: UNLOCKS.sugar,
  negation: UNLOCKS.sugar,
  number: UNLOCKS.numbers,
  ambiguous: UNLOCKS.help,
  togo: UNLOCKS.toGo,
  rush: UNLOCKS.rush,
  closed: UNLOCKS.closing,
  together: UNLOCKS.together,
  soldout: UNLOCKS.soldOut,
  later: UNLOCKS.later,
};
function comparisonUnlocked(command: string, level: number) {
  const expression = parseConditionExpression(command);
  return (
    !!expression &&
    expression.conditions.every(
      (condition) =>
        QUERY_CONDITION_SOURCES.some((source) => source === condition.right) &&
        level >= (tokenUnlocks[condition.left] ?? Infinity),
    )
  );
}

export function availableCommands(level: number): string[] {
  const c = ['LISTEN', 'TAKE UP', 'ITEM coffee', 'MOVE RIGHT 1', 'DEPOSIT RIGHT'];
  if (level >= UNLOCKS.query)
    c.push(
      ...DIRECTIONS.filter((direction) => direction !== 'UP').map((direction) => `TAKE ${direction}`),
      ...DIRECTIONS.filter((direction) => direction !== 'RIGHT').map((direction) => `DEPOSIT ${direction}`),
      ...DIRECTIONS.filter((direction) => direction !== 'RIGHT').map((direction) => `MOVE ${direction} 1`),
    );
  if (level >= UNLOCKS.choices)
    c.push(
      ...QUERY_CONDITION_VALUES.filter((token) => level >= tokenUnlocks[token]).map(
        (token) => `IF ${token} IN CUSTOMER SPEECH`,
      ),
      'ELSE',
      'END',
      'ITEM tea',
    );
  if (level >= UNLOCKS.loop) c.push('POSITION listen', 'JUMP listen');
  if (level >= UNLOCKS.sugar) c.push('WRITE 1 sugar', 'WRITE 0 sugar');
  if (level >= UNLOCKS.forEach) c.push('FOR item IN heard orders');
  if (level >= UNLOCKS.numbers) c.push('STORE var1 FROM number', 'WRITE var1 sugar');
  if (level >= UNLOCKS.help) c.push('HELP', 'ERROR');
  if (level >= UNLOCKS.toGo) c.push('WRITE togo');
  if (level >= UNLOCKS.rush) c.push('WRITE rush');
  if (level >= UNLOCKS.closing) c.push('STOP');
  if (level >= UNLOCKS.together) c.push('WRITE together');
  return c;
}
/** Whether Query reads one line on a shift, with that shift's library of commands. */
export const queryReads = (c: string, level: number) => recognised(c, level, availableCommands(level));
/** Whether Query reads a line at a level, given that level's library of commands. */
function recognised(c: string, level: number, allowed: readonly string[]): boolean {
  const sugar = parseSugarWrite(c);
  const stored = parseStore(c);
  const dataInstruction =
    (level >= UNLOCKS.numbers &&
      !!stored &&
      VARIABLES.some((variable) => variable === stored.variable) &&
      !(ROBOT_STORE_VALUES as readonly string[]).includes(stored.value)) ||
    (level >= UNLOCKS.sugar &&
      sugar !== undefined &&
      (/^\d+$/.test(sugar) || (level >= UNLOCKS.numbers && VARIABLES.some((variable) => variable === sugar)))) ||
    (level >= UNLOCKS.sugar && /^SUGAR (true|false)$/.test(c)) ||
    (level >= UNLOCKS.numbers && ['READ number', 'SUGAR number'].includes(c));
  return (
    dataInstruction ||
    allowed.includes(c) ||
    !!legacyQueryAction(c) ||
    (level >= UNLOCKS.loop && /^(POSITION|JUMP) [a-z][a-z0-9_]*$/.test(c)) ||
    (level >= UNLOCKS.query && (TAKE_RE.test(c) || DEPOSIT_RE.test(c) || MOVE_RE.test(c))) ||
    (level >= UNLOCKS.query && writePattern.test(c) && (level >= UNLOCKS.choices || c.endsWith('coffee'))) ||
    comparisonUnlocked(c, level)
  );
}

/** Every block unlocked, to tell a block the player meets later apart from a line no robot reads. */
export const EVERY_UNLOCK = Infinity;

/**
 * Why a robot can't read a line: either its block joins the library on a later shift, or the line is
 * no block at all, most often a typo in the text editor. A line that only has its letters in the wrong case
 * ("move right 1", "ITEM 1 TEA") says so, with the line it means; `known` is whether the robot ever reads a line.
 */
export function unreadable(robot: string, c: string, later: boolean, known: (line: string) => boolean): string {
  if (later) return `${robot} can’t use “${c}” yet: that block joins the library on a later shift.`;
  const recased = recase(c, known);
  return recased
    ? `${robot} doesn’t know “${c}”. Block words go in capitals and values in small letters: try “${recased}”.`
    : `${robot} doesn’t know “${c}”. Check it against the block library.`;
}

/** The one way of casing a line's words that a robot reads, trying each word in capitals and in small letters. */
function recase(c: string, known: (line: string) => boolean): string | undefined {
  const words = c.split(/\s+/);
  if (words.length > 8) return undefined;
  for (let mask = 0; mask < 2 ** words.length; mask++) {
    const line = words.map((word, i) => (mask & (1 << i) ? word.toUpperCase() : word.toLowerCase())).join(' ');
    if (line !== c && known(line)) return line;
  }
  return undefined;
}

/** Structure errors shared by every robot, naming blocks as their tiles do ("If", not "IF"). */
export const STRUCTURE = {
  strayElse: 'Else needs an If above it.',
  secondElse: 'An If takes only one Else.',
  strayEnd: 'End needs an If, For or Function above it.',
  /** An If, For or Function left open, by its opening command. */
  unclosed: (opening: string) => {
    const verb = opening.slice(0, opening.indexOf(' '));
    return `This ${verb[0]}${verb.slice(1).toLowerCase()} needs an End to close it.`;
  },
};

/** Compile the finite instruction language; player text is never evaluated as JavaScript. */
export function compileProgram(source: string, level = ROBOT_STAND_IN_LEVEL): Program {
  const p: Program = {
    source,
    instructions: [],
    source_lines: [],
    ends: {},
    alternatives: {},
    positions: {},
    functions: {},
    compile_error: '',
    error_line: 0,
    block_count: 0,
  };
  const stack: number[] = [],
    allowed = availableCommands(level),
    everyCommand = availableCommands(EVERY_UNLOCK);
  const fail = (message: string) => {
    p.compile_error = message;
    return p;
  };
  for (const [line, raw] of source.split('\n').entries()) {
    const c = raw.trim();
    p.error_line = line;
    if (!c || c.startsWith('#')) continue;
    if (!recognised(c, level, allowed))
      return fail(
        unreadable('Query', c, recognised(c, EVERY_UNLOCK, everyCommand), (line) =>
          recognised(line, EVERY_UNLOCK, everyCommand),
        ),
      );
    if (
      parseConditionExpression(c)?.conditions.some((condition) => condition.right === 'item') &&
      !stack.some((i) => p.instructions[i].startsWith('FOR '))
    )
      return fail('Only an If inside For item in order can check the item. Out here, check Orders.');
    const at = p.instructions.length;
    p.instructions.push(c);
    p.source_lines.push(line);
    if (c.startsWith('POSITION ')) {
      const label = c.slice(9);
      if (label in p.positions) return fail(`Two jump destinations are named ${label}; give each its own name.`);
      p.positions[label] = at;
    }
    if (isOpening(c)) {
      if (c.startsWith('FOR ') && stack.some((i) => p.instructions[i].startsWith('FOR ')))
        return fail('A For loop can’t go inside another For loop.');
      if (c.startsWith('FUNCTION ')) {
        const label = c.slice(9);
        if (stack.length) return fail('A function can’t go inside another block.');
        if (label in p.functions) return fail(`Two functions are named ${label}; give each its own name.`);
        p.functions[label] = at;
      }
      stack.push(at);
    } else if (c === 'ELSE') {
      const start = stack.at(-1);
      if (start === undefined || !p.instructions[start].startsWith('IF ')) return fail(STRUCTURE.strayElse);
      if (start in p.alternatives) return fail(STRUCTURE.secondElse);
      p.alternatives[start] = at;
    } else if (c === 'END') {
      const start = stack.pop();
      if (start === undefined) return fail(STRUCTURE.strayEnd);
      p.ends[start] = at;
      p.ends[at] = start;
      if (start in p.alternatives) p.ends[p.alternatives[start]] = at;
    }
  }
  // Whole-routine checks report the first problem, on the line of the block it concerns.
  p.block_count = p.instructions.length;
  const failAt = (message: string, index: number) => {
    p.error_line = p.source_lines[index] ?? 0;
    return fail(message);
  };
  if (stack.length) return failAt(STRUCTURE.unclosed(p.instructions[stack.at(-1)!]), stack.at(-1)!);
  if (p.instructions[0] !== 'LISTEN' && !p.instructions[0]?.startsWith('POSITION '))
    return failAt('Start with Wait for Orders, or a jump destination.', 0);
  const listens = p.instructions.flatMap((c, i) => (c === 'LISTEN' ? [i] : []));
  if (listens.length !== 1)
    return failAt('Use one Wait for Orders; jump back to it for continuous service.', listens[1] ?? 0);
  for (const [i, c] of p.instructions.entries()) {
    const missing = missingTarget(c, p);
    if (missing) return failAt(missing, i);
  }
  if (p.block_count > QUERY_MAX_BLOCKS)
    return failAt(`Query has room for at most ${QUERY_MAX_BLOCKS} blocks.`, QUERY_MAX_BLOCKS);
  return p;
}

/** Why a Jump or Call has nowhere to go, or nothing when its destination or function exists. */
export function missingTarget(command: string, p: Pick<Program, 'positions' | 'functions'>) {
  const label = command.slice(command.indexOf(' ') + 1);
  if (command.startsWith('JUMP ') && !(label in p.positions))
    return `Jump ${label} needs a jump destination named ${label}.`;
  if (command.startsWith('CALL ') && !(label in p.functions)) return `Call ${label} needs a Function ${label} to run.`;
}
