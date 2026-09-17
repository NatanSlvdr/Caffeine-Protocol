/** The eight directions available to directional instruction blocks. */
export const DIRECTIONS = ['UP', 'UP_RIGHT', 'RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT'] as const;
export type Direction = typeof DIRECTIONS[number];

export const directionVectors: Record<Direction, readonly [number, number]> = {
  UP: [0, -1],
  UP_RIGHT: [1, -1],
  RIGHT: [1, 0],
  DOWN_RIGHT: [1, 1],
  DOWN: [0, 1],
  DOWN_LEFT: [-1, 1],
  LEFT: [-1, 0],
  UP_LEFT: [-1, -1],
};

export const directionLabel = (direction: string) => direction.toLowerCase().replaceAll('_', ' ');

/** Accept the hyphenated spelling used in older drafts while storing one value. */
export function normalizeDirection(direction: string): Direction | undefined {
  const normalized = direction.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  return (DIRECTIONS as readonly string[]).includes(normalized) ? normalized as Direction : undefined;
}
