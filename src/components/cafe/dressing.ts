import { BOUNDS, ENTRANCE, QUERY_TILES, STATIONS, TABLE_LAYOUT, type CushionId, type Point } from '@/domain';
import { CAFE_COLORS } from './primitives';

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
/** The sidewalk board's centre, under the window beside the door, between the wall and the guests' way in. */
export const OPEN_BOARD: Point = [STREET_WALL_FACE - 0.54, ENTRANCE[1] - 2.05];
/** The board's footprint from its centre: its width along the wall's normal, and its legs' splay along the street. */
export const OPEN_BOARD_REACH = { x: 0.23, z: 0.16 } as const;
/** Wainscot height: just under the window sills, so the panelling runs unbroken beneath them. */
export const WAINSCOT_HEIGHT = 0.78;

/** Each table row and column has its own x or z, so a table's place in the grid is its rank along both. */
const TABLE_COLUMNS = [...new Set(TABLE_LAYOUT.map((t) => t.x))].sort((a, b) => a - b);
const TABLE_ROWS = [...new Set(TABLE_LAYOUT.map((t) => t.z))].sort((a, b) => a - b);

/** Each pair of cushion colours the café can pick, muted to sit with the walnut and the green walls. */
export const CUSHIONS: Record<CushionId, readonly [string, string]> = {
  'clay-sage': [CAFE_COLORS.clay, CAFE_COLORS.sage],
  'mustard-teal': ['#c19a4f', '#5c8a84'],
  'berry-oat': ['#93566a', '#d4c4a3'],
};

/** Chair cushions alternate the pair's two colours across the dining room like a checkerboard. */
export function cushionColor(cushions: CushionId, tableIndex: number): string {
  const table = TABLE_LAYOUT[tableIndex];
  return CUSHIONS[cushions][(TABLE_COLUMNS.indexOf(table.x) + TABLE_ROWS.indexOf(table.z)) % 2];
}
