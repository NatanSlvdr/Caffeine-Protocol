import { TABLE_LAYOUT, STATIONS } from '@/domain';
import { BACK_WALL_FACE } from '../cafe/dressing';

/** One time of day: a soft sky fill, a ground bounce, and a key light that carries the shadows. */
export interface LightMood {
  ambient: { color: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  key: { color: string; intensity: number; position: [number, number, number] };
}

/** Morning sun through the street windows: warm key, neutral fill. */
export const DAY: LightMood = {
  ambient: { color: '#f4f1e8', intensity: 1.05 },
  hemisphere: { sky: '#f1f3ed', ground: '#6f6a5c', intensity: 1.05 },
  key: { color: '#ffe7ca', intensity: 2, position: [-8, 18, 8] },
};

/** Dusk outside: a cool, low key from the street side, so the café's own lamps carry the warmth. */
export const EVENING: LightMood = {
  ambient: { color: '#9a9cc2', intensity: 0.42 },
  hemisphere: { sky: '#a7acd4', ground: '#4f3d38', intensity: 0.55 },
  key: { color: '#aab4e0', intensity: 0.75, position: [-16, 14, 6] },
};

/** Lamp light shared by the light pools, the wall sconces and the table candles. */
export const LAMP_WARM = '#ffb76b';
/** How far a lamp's light reaches before fading out completely. */
export const LAMP_REACH = 5.5;

/**
 * Warm pools of light over the aisles between table pairs, the order counter and the kitchen pass. They are
 * light only, with no visible fixture: the diorama has no ceiling to hang one from, and a shade at that height
 * would cover a table from the overhead camera.
 */
export const LIGHT_POOLS: readonly { at: [number, number, number]; intensity: number }[] = [
  ...[-4, 4].flatMap((x) => [-4, 0].map((z) => ({ at: [x, 3.1, z] as [number, number, number], intensity: 9 }))),
  { at: [STATIONS.orders.customerCounter[0] + 1, 3.1, STATIONS.orders.customerCounter[1] - 0.5], intensity: 7 },
  { at: [4, 3.1, 4], intensity: 7 },
];

/** Brass wall sconces on the back wall, either side of the café's cup mural. */
export const WALL_SCONCES: readonly [number, number, number][] = [
  [-4.5, 2.05, BACK_WALL_FACE],
  [3.5, 2.05, BACK_WALL_FACE],
];

/** A small candle jar on each table's far edge, clear of where the drinks are set down. */
export const TABLE_CANDLES: readonly [number, number, number][] = TABLE_LAYOUT.map((t) => [
  t.x,
  1.32,
  t.z + (t.depth - 1) / 2 - 0.36,
]);

export function lightMood(evening: boolean): LightMood {
  return evening ? EVENING : DAY;
}
