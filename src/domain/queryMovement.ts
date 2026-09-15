import { directionVectors, normalizeDirection } from './directions';
import { isWalkable, STARTS } from './layout';
import type { Point } from './layout';

/** Query moves between the register and handoff tiles, stopping at obstacles. */
export function moveQuery(position: Point, command: string): Point {
  const [, value, count] = command.split(' ');
  const direction = normalizeDirection(value);
  if (!direction) return position;
  const [dx, dz] = directionVectors[direction];
  for (let step = 0; step < Number(count); step++) {
    const next: Point = [position[0] + dx, position[1] + dz];
    if (!isWalkable(next, 'query')) break;
    position = next;
  }
  return position;
}

/** The counter offset persists between customer events. */
export const queryPosition = (counter = 0): Point => [STARTS.query[0] + counter, STARTS.query[1]];

/** Take and Deposit reach exactly one tile in the selected direction. */
export function interactionTarget(position: Point, direction: string): Point | undefined {
  const normalized = normalizeDirection(direction);
  if (!normalized) return undefined;
  const [dx, dz] = directionVectors[normalized];
  return [position[0] + dx, position[1] + dz];
}
