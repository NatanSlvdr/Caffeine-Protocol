import type { Program, RobotRole } from './types';
import {
  VARIABLES,
  availableCommands,
  compileProgram,
  parseConditionExpression,
  parseStore,
  parseTimes,
} from './program';
import { comparisonUnlocked, parseWorkerComparison } from './robotConditions';
import { DIRECTIONS } from './directions';
import { DEPOSIT_RE, MOVE_RE, TAKE_RE, USE_RE, parseMoveTo } from './commands';
import { ROBOT_STAND_IN_LEVEL, ROBOT_MAX_BLOCKS } from './constants';
import { ROBOT_DISPLAY_NAMES } from './robots';
import { UNLOCKS } from './unlocks';

/** What a kitchen or floor robot can read on its current order. */
export const ROBOT_CONDITION_VALUES = ['coffee', 'tea', 'sugar'] as const;

/**
 * Query's language, shared by every robot: wait for orders, move, take, deposit, branch, jump and repeat.
 * The first TAKE and DEPOSIT listed are the ones a robot's library offers.
 */
function sharedCommands(take: string, deposit: string): string[] {
  return [
    'LISTEN',
    ...DIRECTIONS.map((direction) => `MOVE ${direction} 1`),
    `TAKE ${take}`,
    ...DIRECTIONS.filter((direction) => direction !== take).map((direction) => `TAKE ${direction}`),
    `DEPOSIT ${deposit}`,
    ...DIRECTIONS.filter((direction) => direction !== deposit).map((direction) => `DEPOSIT ${direction}`),
    ...ROBOT_CONDITION_VALUES.map((value) => `IF ${value} IN CUSTOMER SPEECH`),
    'ELSE',
    'END',
    'POSITION listen',
    'JUMP listen',
    'REPEAT',
  ];
}
/** Brew runs the coffee machine with Use, and from the sugar shift on counts cubes from the order into memory. */
function prepCommands(level: number): string[] {
  return [
    ...sharedCommands('UP', 'UP'),
    'USE UP',
    ...DIRECTIONS.filter((direction) => direction !== 'UP').map((direction) => `USE ${direction}`),
    ...(level >= UNLOCKS.prepSugar ? ['STORE var1 FROM sugar', 'FOR var1 TIMES'] : []),
    ...(level >= UNLOCKS.functions ? ['FUNCTION recipe', 'CALL recipe', 'RETURN'] : []),
  ];
}
/** Porter reads each order's table into memory and walks there by itself; it also clears dirty cups. */
function floorCommands(level: number): string[] {
  return [
    ...sharedCommands('DOWN', 'UP'),
    'MOVE var1',
    'STORE var1 FROM table',
    'STORE var1 FROM here',
    'FUNCTION deliver',
    'CALL deliver',
    'FUNCTION clear',
    'CALL clear',
    'RETURN',
    ...(level >= UNLOCKS.floor ? ['WAIT DIRTY'] : []),
  ];
}
/** Where each robot's Store can read from. */
const ROBOT_STORE_SOURCES: Record<Exclude<RobotRole, 'query'>, readonly string[]> = {
  prep: ['sugar'],
  floor: ['table', 'here'],
};
/** Memory blocks reach any variable slot; the library shows Var A and the editor picks the rest. */
function memoryInstruction(command: string, role: Exclude<RobotRole, 'query'>, level: number): boolean {
  const stored = parseStore(command);
  if (stored)
    return (
      (VARIABLES as readonly string[]).includes(stored.variable) &&
      ROBOT_STORE_SOURCES[role].includes(stored.value) &&
      (role === 'floor' || level >= UNLOCKS.prepSugar)
    );
  if (parseTimes(command)) return role === 'prep' && level >= UNLOCKS.prepSugar;
  return (role === 'floor' && !!parseMoveTo(command)) || (role === 'prep' && USE_RE.test(command));
}
/** Order conditions read like Query's, against the order a robot is working on. */
const robotCondition = (command: string) =>
  parseConditionExpression(command)?.conditions.every(
    (condition) =>
      condition.right === 'CUSTOMER SPEECH' && (ROBOT_CONDITION_VALUES as readonly string[]).includes(condition.left),
  ) ?? false;
/** Commands are role-gated; numbered MOVE operands are edited separately in the block editor. */
export function robotCommands(role: RobotRole, level: number): string[] {
  if (role === 'query') return availableCommands(level);
  return role === 'prep' ? prepCommands(level) : floorCommands(level);
}
export function compileRobot(source: string, role: RobotRole, level = ROBOT_STAND_IN_LEVEL): Program {
  if (role === 'query') return compileProgram(source, level);
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
    allowed = robotCommands(role, level);
  const fail = (message: string, line: number) => {
    p.compile_error = message;
    p.error_line = line;
    return p;
  };
  for (const [line, raw] of source.split('\n').entries()) {
    const c = raw.trim();
    if (!c || c.startsWith('#')) continue;
    if (
      !allowed.includes(c) &&
      !MOVE_RE.test(c) &&
      !TAKE_RE.test(c) &&
      !DEPOSIT_RE.test(c) &&
      !/^(POSITION|JUMP) [a-z][a-z0-9_]*$/.test(c) &&
      !robotCondition(c) &&
      !memoryInstruction(c, role, level) &&
      // Porter's older saves still route by table checks; new programs store the order's table instead.
      !(role === 'floor' && /^IF TABLE ([1-9]|1[0-6])$/.test(c)) &&
      !comparisonUnlocked(c, level)
    )
      return fail(`Unknown or locked instruction for ${ROBOT_DISPLAY_NAMES[role]}: ${c}`, line);
    const i = p.instructions.length;
    p.instructions.push(c);
    p.source_lines.push(line);
    if (c.startsWith('POSITION ')) {
      if (c.slice(9) in p.positions) return fail('Duplicate position: ' + c.slice(9), line);
      p.positions[c.slice(9)] = i;
    } else if (c.startsWith('IF ') || c.startsWith('FUNCTION ') || parseTimes(c)) {
      if (c.startsWith('FUNCTION ')) {
        if (stack.length || p.functions[c.slice(9)] !== undefined)
          return fail('Functions must be unique and outside other blocks.', line);
        p.functions[c.slice(9)] = i;
      }
      stack.push(i);
    } else if (c === 'ELSE') {
      const opening = stack.at(-1);
      if (opening === undefined || !p.instructions[opening].startsWith('IF ') || opening in p.alternatives)
        return fail('ELSE requires one matching IF.', line);
      p.alternatives[opening] = i;
    } else if (c === 'END') {
      const opening = stack.pop();
      if (opening === undefined) return fail('END requires an opening block.', line);
      p.ends[opening] = i;
      p.ends[i] = opening;
      if (opening in p.alternatives) p.ends[p.alternatives[opening]] = i;
    }
  }
  if (stack.length) return fail('Close each IF, FOR and FUNCTION with END.', p.source_lines[stack.at(-1)!]);
  for (const [i, c] of p.instructions.entries()) {
    if (c.startsWith('CALL ') && !(c.slice(5) in p.functions))
      return fail('Define the called function.', p.source_lines[i]);
    if (c.startsWith('JUMP ') && !(c.slice(5) in p.positions))
      return fail('Jump target has no matching Position block.', p.source_lines[i]);
  }
  p.block_count = p.instructions.length;
  if (p.block_count > ROBOT_MAX_BLOCKS) return fail('Moving robots have room for 512 blocks.', p.source_lines[512]);
  if (!p.block_count) return fail('Add instructions for this robot.', 0);
  return p;
}

/** Brew's and Porter's retired station verbs, each now a Take or Deposit toward that station. */
const RETIRED_ROBOT_COMMANDS: Record<Exclude<RobotRole, 'query'>, Record<string, string>> = {
  prep: {
    'WAIT TICKET': 'LISTEN',
    'TAKE BEANS': 'TAKE UP',
    'TAKE LEAVES': 'TAKE UP',
    'FILL WATER': 'TAKE UP',
    'ADD SUGAR': 'TAKE UP',
    DEPOSIT: 'DEPOSIT UP',
    // The coffee machine above Brew now picks grinding, brewing or steeping from the cup it's given.
    GRIND: 'USE UP',
    BREW: 'USE UP',
    STEEP: 'USE UP',
  },
  floor: {
    'WAIT DRINK': 'LISTEN',
    PICKUP: 'TAKE DOWN',
    SERVE: 'DEPOSIT UP',
    COLLECT: 'TAKE UP',
    'RETURN CUPS': 'DEPOSIT DOWN',
  },
};
/** Retired order checks and the Query condition each became. */
function migrateRobotCondition(command: string): string {
  const bare = /^IF (coffee|tea|sugar)$/.exec(command);
  if (bare) return `IF ${bare[1]} IN CUSTOMER SPEECH`;
  const comparison = parseWorkerComparison(command);
  if (!comparison || !(ROBOT_CONDITION_VALUES as readonly string[]).includes(comparison.left)) return command;
  const { left, operator, right } = comparison;
  const present =
    right === 'CUSTOMER SPEECH'
      ? operator === '='
        ? true
        : operator === '!='
          ? false
          : undefined
      : left === 'sugar' && (right === 'TRUE' || right === 'FALSE') && (operator === '=' || operator === '!=')
        ? (right === 'TRUE') === (operator === '=')
        : undefined;
  return present === undefined ? command : `IF ${left} ${present ? 'IN' : 'NOT IN'} CUSTOMER SPEECH`;
}
/** Rewrite a saved Brew or Porter program into the shared language, keeping indentation and comments. */
export function migrateRobotSource(source: string, role: Exclude<RobotRole, 'query'>): string {
  return source
    .split('\n')
    .map((raw) => {
      const command = raw.trim();
      const next = RETIRED_ROBOT_COMMANDS[role][command] ?? migrateRobotCondition(command);
      return next === command ? raw : raw.replace(command, next);
    })
    .join('\n');
}
