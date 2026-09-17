import { BOUNDS } from './geometry';
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
  pickup: { cell: [6, 4], prep: [6, 5], floor: [6, 3], label: 'DRINK PICKUP' },
  returns: { cell: [7, 4], prep: [7, 5], floor: [7, 3], label: 'SINK' },
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
