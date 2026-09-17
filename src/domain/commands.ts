import { DIRECTIONS, normalizeDirection } from './directions';
import type { Direction } from './directions';

/** Single source of truth for movement command shapes shared by compilers and runtimes. */
const DIRECTION_ALTERNATION = DIRECTIONS.join('|');
export const MOVE_RE = new RegExp(`^MOVE (${DIRECTION_ALTERNATION}) ([1-9]|1[0-9])$`);
export const TAKE_RE = new RegExp(`^(TAKE|PICKUP) (${DIRECTION_ALTERNATION})$`);
export const DEPOSIT_RE = new RegExp(`^DEPOSIT (${DIRECTION_ALTERNATION})$`);

export interface MoveCommand {
  direction: Direction;
  count: number;
}

/** Parse a whole-tile MOVE command; undefined when the shape does not match. */
export function parseMoveCommand(command: string): MoveCommand | undefined {
  const match = MOVE_RE.exec(command);
  return match ? { direction: match[1] as Direction, count: Number(match[2]) } : undefined;
}

export const isMoveCommand = (command: string): boolean => MOVE_RE.test(command);

/** Parse a directional TAKE/PICKUP command; undefined when the shape does not match. */
export function parseTakeCommand(command: string): { verb: 'TAKE' | 'PICKUP'; direction: Direction } | undefined {
  const match = TAKE_RE.exec(command);
  return match ? { verb: match[1] as 'TAKE' | 'PICKUP', direction: match[2] as Direction } : undefined;
}

/** Parse a directional DEPOSIT command; undefined when the shape does not match. */
export function parseDepositCommand(command: string): { direction: Direction } | undefined {
  const match = DEPOSIT_RE.exec(command);
  return match ? { direction: match[1] as Direction } : undefined;
}

/** Facing direction carried by a movement or handling command, if the operand is valid. */
export function commandDirection(command: string): Direction | undefined {
  const match = /^(MOVE|TAKE|PICKUP|DEPOSIT) (\S+)/.exec(command);
  return match ? normalizeDirection(match[2]) : undefined;
}
