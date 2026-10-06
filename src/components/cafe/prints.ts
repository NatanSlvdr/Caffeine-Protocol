import type { PrintId } from '@/domain';
import { CAFE_COLORS } from './primitives';

/**
 * A flat shape on a print's paper, in metres from the middle of the mount, y up: a band of colour, or a disc that a
 * smaller second radius squashes into a leaf. The café draws it on the wall and the shelf draws it as a thumbnail, so
 * the print picked is the print hung.
 */
export interface PrintShape {
  shape: 'band' | 'disc';
  at: readonly [number, number];
  /** A band's width and height, or a disc's two radii. */
  size: readonly [number, number];
  color: string;
  /** Radians, anticlockwise about the shape's middle. */
  turn?: number;
}

/** The walnut frame and the cream mount inside it, both centred on the picture. */
export const PRINT_FRAME = { frame: [0.86, 0.64], mount: [0.74, 0.52] } as const;

/** The harbour's sky and sea, and the coffee branch's ripe cherries. */
const SKY = '#cfe2dc';
const SEA = '#5f8297';
const CHERRY = '#a3403a';

const band = (at: [number, number], size: [number, number], color: string, turn?: number): PrintShape => ({
  shape: 'band',
  at,
  size,
  color,
  turn,
});
const disc = (at: [number, number], radius: number, color: string): PrintShape => ({
  shape: 'disc',
  at,
  size: [radius, radius],
  color,
});

/** Turns a drawing about the middle of the paper, shapes and all. */
const turned = (angle: number, shapes: readonly PrintShape[]): PrintShape[] =>
  shapes.map(({ at: [x, y], turn = 0, ...shape }) => ({
    ...shape,
    at: [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)],
    turn: turn + angle,
  }));

/** Each print's picture, back to front: Lou's hills, the harbour, and a coffee branch. */
export const PRINTS: Record<PrintId, readonly PrintShape[]> = {
  // Hills, a field and a sun.
  hills: [
    band([0.08, -0.03], [0.44, 0.08], CAFE_COLORS.wall),
    band([0, -0.12], [0.6, 0.14], CAFE_COLORS.sage),
    disc([-0.16, 0.1], 0.07, CAFE_COLORS.clay),
  ],
  // A pale sky over the sea, a lighthouse on the point and a sail far out.
  harbour: [
    band([0, 0.07], [0.6, 0.24], SKY),
    band([0, -0.12], [0.6, 0.14], SEA),
    band([0.19, -0.15], [0.22, 0.08], CAFE_COLORS.sage),
    band([0.2, -0.02], [0.05, 0.2], CAFE_COLORS.cream),
    band([0.2, -0.07], [0.05, 0.035], CAFE_COLORS.terracotta),
    band([0.2, 0.03], [0.05, 0.035], CAFE_COLORS.terracotta),
    band([0.2, 0.1], [0.07, 0.03], CAFE_COLORS.charcoal),
    band([-0.12, -0.075], [0.1, 0.022], CAFE_COLORS.walnut),
    band([-0.12, -0.02], [0.012, 0.09], CAFE_COLORS.cream, -0.18),
    disc([-0.18, 0.13], 0.045, CAFE_COLORS.brass),
  ],
  // A branch across the paper, its leaves in pairs and its cherries ripe.
  'coffee-branch': turned(0.42, [
    band([0, 0], [0.56, 0.018], CAFE_COLORS.walnut),
    ...[-0.18, 0, 0.18].flatMap((x, i) =>
      [-1, 1].map((side): PrintShape => ({
        shape: 'disc',
        at: [x + 0.03, side * 0.06],
        size: [0.065, 0.027],
        color: i % 2 ? CAFE_COLORS.leafLight : CAFE_COLORS.leaf,
        turn: side * 0.5,
      })),
    ),
    ...[-0.1, 0.08].flatMap((x) =>
      [
        [0, 0],
        [0.026, 0.012],
        [0.012, -0.022],
      ].map(([dx, dy]) => disc([x + dx, dy], 0.017, CHERRY)),
    ),
  ]),
};
