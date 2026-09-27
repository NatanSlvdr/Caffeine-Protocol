/** The eight directions available to directional instruction blocks. */
export const DIRECTIONS = ['UP', 'UP_RIGHT', 'RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT'] as const;
export type Direction = (typeof DIRECTIONS)[number];

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

/** How far one tile is from another in screen directions, e.g. "2 tiles right and 1 tile up". */
export function tilesAway(from: readonly [number, number], to: readonly [number, number]) {
  const tiles = (n: number) => `${Math.abs(n)} tile${Math.abs(n) === 1 ? '' : 's'}`;
  const [dx, dz] = [to[0] - from[0], to[1] - from[1]];
  return [dx && `${tiles(dx)} ${dx > 0 ? 'right' : 'left'}`, dz && `${tiles(dz)} ${dz > 0 ? 'down' : 'up'}`]
    .filter(Boolean)
    .join(' and ');
}

export const directionLabel = (direction: string) => direction.toLowerCase().replaceAll('_', ' ');

/** Accept the hyphenated spelling used in older drafts while storing one value. */
export function normalizeDirection(direction: string): Direction | undefined {
  const normalized = direction.toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
  return (DIRECTIONS as readonly string[]).includes(normalized) ? (normalized as Direction) : undefined;
}
