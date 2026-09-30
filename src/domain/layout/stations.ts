import { BOUNDS, TABLE_LAYOUT, tableFront } from './geometry';
import type { Point } from './geometry';
import type { RobotRole } from '../types';

/** The bottom border is a shared public/prep aisle; all appliance cells sit directly above it. */
export const STATIONS = {
  orders: {
    cell: [-3, 5],
    customerCounter: [-6, 5],
    query: [-5, 5],
    prep: [-2, 5],
    floor: [-7, 5],
    label: 'ORDER HANDOFF',
  },
  ingredients: { cell: [-1, 4], prep: [-1, 5], label: 'STORAGE' },
  grinder: { cell: [2, 4], prep: [2, 5], label: 'COFFEE MACHINE' },
  water: { cell: [7, 4], prep: [7, 5], label: 'SINK' },
  brewer: { cell: [2, 4], prep: [2, 5], label: 'COFFEE MACHINE' },
  sugar: { cell: [4, 4], prep: [4, 5], label: 'SUGAR' },
  lids: { cell: [5, 4], prep: [5, 5], label: 'LIDS' },
  pickup: { cell: [6, 4], prep: [6, 5], floor: [6, 3], label: 'DRINK PICKUP' },
  returns: { cell: [7, 4], prep: [7, 5], floor: [7, 3], label: 'SINK' },
  /** Porter leaves take-away drinks on the counter corner by the door; their customers wait beside it. */
  togo: { cell: [-6, 4], floor: [-6, 3], customer: [-7, 4], label: 'TO-GO SHELF' },
} as const;
export type StationId = keyof typeof STATIONS;
export const STARTS: Record<RobotRole, Point> = {
  query: STATIONS.orders.query,
  prep: STATIONS.orders.prep,
  floor: STATIONS.pickup.floor,
};
export const ENTRANCE: Point = [BOUNDS.minX, BOUNDS.maxZ];
export const QUERY_TILES: readonly Point[] = [
  [-5, 5],
  [-4, 5],
];
/** Before Query arrives, Niko serves the public counter from the same customer tile. */
export const MANUAL_INTAKE: Point = STATIONS.orders.floor;
/** The one opening from the room into the prep aisle is left of the first appliance. */
export const STAFF_ENTRY: Point = [-2, 4];
/** A place a robot stored in memory, named after what's there: "Pickup", "Table 3", or its tile. */
export function placeLabel(place: Point): string {
  const [x, z] = place;
  if (x === STATIONS.pickup.floor[0] && z === STATIONS.pickup.floor[1]) return 'Pickup';
  if (x === STATIONS.returns.floor[0] && z === STATIONS.returns.floor[1]) return 'Sink';
  if (x === STATIONS.togo.floor[0] && z === STATIONS.togo.floor[1]) return 'To-go shelf';
  const table = TABLE_LAYOUT.findIndex((_, i) => tableFront(i)[0] === x && tableFront(i)[1] === z);
  return table >= 0 ? `Table ${table + 1}` : `Tile ${x}, ${z}`;
}
