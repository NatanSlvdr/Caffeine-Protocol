import { BOUNDS, QUERY_TILES, STATIONS, TABLE_LAYOUT, type Point } from '@/domain';

/** A floor area in tile edges: x from `left` to `right`, z from `back` to `front`. */
export interface FloorPatch {
  left: number;
  right: number;
  back: number;
  front: number;
}

const rowPatch = (from: number, to: number, z: number): FloorPatch => ({
  left: from - 0.5,
  right: to + 0.5,
  back: z - 0.5,
  front: z + 0.5,
});

/** Tiled floor where only the crew stand: Query's post and the prep aisle behind the kitchen counter. */
export const KITCHEN_FLOOR: readonly FloorPatch[] = [
  rowPatch(Math.min(...QUERY_TILES.map((t) => t[0])), Math.max(...QUERY_TILES.map((t) => t[0])), QUERY_TILES[0][1]),
  rowPatch(STATIONS.orders.prep[0], BOUNDS.maxX, STATIONS.orders.prep[1]),
];

export function onPatch(patch: FloorPatch, [x, z]: Point): boolean {
  return x > patch.left && x < patch.right && z > patch.back && z < patch.front;
}

/** The back wall's dining-room face and the street wall's inner face. */
export const BACK_WALL_FACE = BOUNDS.minZ - 0.5;
export const STREET_WALL_FACE = BOUNDS.minX - 0.5;
/** Window centres along the street wall, matching the frames drawn by the room. */
export const STREET_WINDOWS = [-4, 0, 2.3] as const;
/** Wainscot height: just under the window sills, so the panelling runs unbroken beneath them. */
export const WAINSCOT_HEIGHT = 0.78;

/** Each table row and column has its own x or z, so a table's place in the grid is its rank along both. */
const TABLE_COLUMNS = [...new Set(TABLE_LAYOUT.map((t) => t.x))].sort((a, b) => a - b);
const TABLE_ROWS = [...new Set(TABLE_LAYOUT.map((t) => t.z))].sort((a, b) => a - b);

/** Chair cushions alternate clay and sage across the dining room like a checkerboard. */
export function cushionIsSage(tableIndex: number): boolean {
  const table = TABLE_LAYOUT[tableIndex];
  return (TABLE_COLUMNS.indexOf(table.x) + TABLE_ROWS.indexOf(table.z)) % 2 === 1;
}
