import { BOUNDS, FURNITURE } from './geometry';
import type { Point } from './geometry';
import type { RobotRole } from '../types';

export function zoneAt([x, z]: Point): RobotRole | 'room' {
  return z === BOUNDS.maxZ && (x === -5 || x === -4) ? 'query' : z === BOUNDS.maxZ && x >= -2 ? 'prep' : 'room';
}
export const samePoint = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
export function isWalkable([x, z]: Point, role?: RobotRole) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(z) &&
    x >= BOUNDS.minX &&
    x <= BOUNDS.maxX &&
    z >= BOUNDS.minZ &&
    z <= BOUNDS.maxZ &&
    !FURNITURE.some((f) => x >= f.x && x < f.x + f.width && z >= f.z && z < f.z + f.depth) &&
    (!role || (role === 'floor' ? zoneAt([x, z]) === 'room' : zoneAt([x, z]) === role))
  );
}
const cache = new Map<string, Point[]>();
/** Scripted humans and reference programs use cardinal routes; MOVE itself never pathfinds. */
export function gridRoute(start: Point, end: Point, role?: RobotRole): Point[] {
  const key = (p: Point) => p.join(',');
  const id = `${key(start)}:${key(end)}:${role ?? 'human'}`;
  const found = cache.get(id);
  if (found) return found;
  const queue: Point[][] = [[start]];
  const seen = new Set([key(start)]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const p = path[path.length - 1];
    if (samePoint(p, end)) {
      cache.set(id, path);
      return path;
    }
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const next: Point = [p[0] + dx, p[1] + dz];
      if (!seen.has(key(next)) && isWalkable(next, role)) {
        seen.add(key(next));
        queue.push([...path, next]);
      }
    }
  }
  throw new Error(`No ${role ?? 'human'} route from ${start} to ${end}`);
}
