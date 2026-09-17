import { CAMPAIGN_LENGTH } from '../data';
import { ROBOT_UNLOCK_LEVELS } from '../data/extension';

export const TRAIL_WIDTH = 760;
export const TRAIL_UNITS = 40;
export const TRAIL_ELEVATION = .8;
export const TRAIL_STOP_HEIGHT = .3;
export type TrailLandmarkKind = 'register' | 'query' | 'tea' | 'sugar' | 'tables' | 'brew' | 'machine' | 'recipe' | 'cups' | 'porter' | 'sink' | 'crew';
export const trailLandmarks: { level: number; name: string; kind: TrailLandmarkKind; side?: 'right' }[] = [
  { level: 1, name: 'The first order', kind: 'register' },
  { level: ROBOT_UNLOCK_LEVELS.query, name: 'Meet Query', kind: 'query' },
  { level: 4, name: 'Tea joins the menu', kind: 'tea', side: 'right' },
  { level: 6, name: 'Something sweet', kind: 'sugar' },
  { level: 9, name: 'Coffee with friends', kind: 'tables' },
  { level: 12, name: 'The regulars', kind: 'tables' },
  { level: ROBOT_UNLOCK_LEVELS.prep, name: 'Meet Brew', kind: 'brew' },
  { level: 17, name: 'From bean to cup', kind: 'machine' },
  { level: 19, name: 'Just enough sugar', kind: 'recipe' },
  { level: 21, name: 'Two cups in hand', kind: 'cups' },
  { level: ROBOT_UNLOCK_LEVELS.floor, name: 'Meet Porter', kind: 'porter' },
  { level: 26, name: 'A clean table', kind: 'sink' },
  { level: 29, name: 'A tray for two', kind: 'cups' },
  { level: 31, name: 'Your whole café', kind: 'crew' },
];

/** Shared map coordinates keep the 3D road, scenery, and accessible buttons together. */
export function trailPoint(index: number) {
  return { x: 380 + 195 * Math.sin(index * .43 - .8) + 28 * Math.sin(index * .91), y: 130 + index * 94 };
}
export function landmarkPoint(landmark: typeof trailLandmarks[number]) {
  const point = trailPoint(landmark.level - 1);
  return { x: landmark.side === 'right' ? 655 : point.x > 380 ? Math.max(115, point.x - 225) : Math.min(635, point.x + 225), y: point.y };
}
export function trailWorld(point: { x: number; y: number }): [number, number, number] {
  return [(point.x - TRAIL_WIDTH / 2) / TRAIL_UNITS, 0, point.y / (TRAIL_UNITS * TRAIL_ELEVATION)];
}
export const TRAIL_HEIGHT = trailPoint(CAMPAIGN_LENGTH - 1).y + 150;
