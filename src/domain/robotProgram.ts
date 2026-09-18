import type { Program, RobotRole } from './types';
import { availableCommands, compileProgram } from './program';
import { comparisonUnlocked } from './robotConditions';
import { TABLE_LAYOUT } from './layout';
import { DIRECTIONS } from './directions';
import { DEPOSIT_RE, MOVE_RE, TAKE_RE } from './commands';
import { QUERY_PROGRAM_LEVEL_CAP, ROBOT_STAND_IN_LEVEL, ROBOT_MAX_BLOCKS } from './constants';
import { ROBOT_UNLOCK_LEVELS } from './robots';
/** Shared motion, branching, and loop scaffolding for the kitchen/floor languages. */
function baseMotionCommands(level: number): string[] {
  return [
    ...DIRECTIONS.map((direction) => `MOVE ${direction} 1`),
    'REPEAT',
    ...(level >= 4 ? ['IF coffee IN CUSTOMER SPEECH'] : []),
    'IF coffee',
    'IF tea',
    'IF sugar',
    'ELSE',
    'END',
  ];
}
/** Kitchen recipe verbs attach to the shared motion scaffolding. */
function prepCommands(level: number): string[] {
  return [
    ...baseMotionCommands(level),
    'WAIT TICKET',
    ...DIRECTIONS.map((direction) => `TAKE ${direction}`),
    'GRIND',
    'FILL WATER',
    'BREW',
    'STEEP',
    'ADD SUGAR',
    'DEPOSIT UP',
    ...DIRECTIONS.filter((direction) => direction !== 'UP').map((direction) => `DEPOSIT ${direction}`),
    ...(level >= 20 ? ['FUNCTION recipe', 'CALL recipe', 'RETURN'] : []),
  ];
}
/** Floor delivery verbs attach to the shared motion scaffolding. */
function floorCommands(level: number): string[] {
  return [
    ...baseMotionCommands(level),
    'FUNCTION deliver',
    'CALL deliver',
    'FUNCTION clear',
    'CALL clear',
    'RETURN',
    'WAIT DRINK',
    'TAKE DOWN',
    ...DIRECTIONS.filter((direction) => direction !== 'DOWN').map((direction) => `TAKE ${direction}`),
    'SERVE',
    ...Array.from({ length: TABLE_LAYOUT.length }, (_, i) => `IF TABLE ${i + 1}`),
    ...(level >= ROBOT_UNLOCK_LEVELS.floor ? ['WAIT DIRTY', 'COLLECT', 'RETURN CUPS'] : []),
  ];
}
/** Commands are role-gated; numbered MOVE operands are edited separately in the block editor. */
export function robotCommands(role: RobotRole, level: number): string[] {
  if (role === 'query') return availableCommands(Math.min(level, QUERY_PROGRAM_LEVEL_CAP));
  return role === 'prep' ? prepCommands(level) : floorCommands(level);
}
export function compileRobot(source: string, role: RobotRole, level = ROBOT_STAND_IN_LEVEL): Program {
  if (role === 'query') return compileProgram(source, Math.min(level, QUERY_PROGRAM_LEVEL_CAP));
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
    const legacyAction = role === 'prep' ? ['DEPOSIT', 'TAKE BEANS', 'TAKE LEAVES'].includes(c) : c === 'PICKUP';
    if (
      !allowed.includes(c) &&
      !MOVE_RE.test(c) &&
      !(role === 'prep' && DEPOSIT_RE.test(c)) &&
      !(role === 'floor' && TAKE_RE.test(c)) &&
      !legacyAction &&
      !comparisonUnlocked(c, level)
    )
      return fail(`Unknown or locked ${role} instruction: ${c}`, line);
    const i = p.instructions.length;
    p.instructions.push(c);
    p.source_lines.push(line);
    if (c.startsWith('IF ') || c.startsWith('FUNCTION ')) {
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
  if (stack.length) return fail('Close each IF and FUNCTION with END.', p.source_lines[stack.at(-1)!]);
  for (const [i, c] of p.instructions.entries())
    if (c.startsWith('CALL ') && !(c.slice(5) in p.functions))
      return fail('Define the called function.', p.source_lines[i]);
  p.block_count = p.instructions.length;
  if (p.block_count > ROBOT_MAX_BLOCKS) return fail('Moving robots have room for 512 blocks.', p.source_lines[512]);
  if (!p.block_count) return fail('Add instructions for this robot.', 0);
  return p;
}
