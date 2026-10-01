import type { Furniture, Point } from './geometry';

/** Corners of each connected counter run, traced around the tile edges with the inside on the left. */
export function counterOutlines(pieces: readonly Furniture[]): Point[][] {
  const key = (x: number, z: number) => `${x},${z}`;
  const cells = new Map<string, Point>();
  for (const f of pieces)
    for (let x = f.x; x < f.x + f.width; x++) for (let z = f.z; z < f.z + f.depth; z++) cells.set(key(x, z), [x, z]);
  const seen = new Set<string>();
  const outlines: Point[][] = [];
  for (const [start, first] of cells) {
    if (seen.has(start)) continue;
    const run: Point[] = [];
    const stack = [first];
    seen.add(start);
    while (stack.length) {
      const cell = stack.pop()!;
      run.push(cell);
      for (const [dx, dz] of SIDES) {
        const next = key(cell[0] + dx, cell[1] + dz);
        if (cells.has(next) && !seen.has(next)) {
          seen.add(next);
          stack.push(cells.get(next)!);
        }
      }
    }
    outlines.push(traceRun(run, (x, z) => cells.has(key(x, z))));
  }
  return outlines;
}

const SIDES = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

function traceRun(run: Point[], filled: (x: number, z: number) => boolean): Point[] {
  // Each exposed tile side becomes one directed edge; walking them in order yields the outline.
  const edges = new Map<string, Point>();
  const at = (p: Point) => `${p[0]},${p[1]}`;
  for (const [x, z] of run) {
    const corners: Point[] = [
      [x - 0.5, z - 0.5],
      [x + 0.5, z - 0.5],
      [x + 0.5, z + 0.5],
      [x - 0.5, z + 0.5],
    ];
    SIDES.forEach(([dx, dz], i) => {
      if (!filled(x + dx, z + dz)) edges.set(at(corners[i]), corners[(i + 1) % 4]);
    });
  }
  const loop: Point[] = [];
  let corner = edges.keys().next().value as string;
  for (let guard = edges.size; guard > 0; guard--) {
    const next = edges.get(corner)!;
    loop.push(next);
    corner = at(next);
  }
  return loop.filter((p, i) => {
    const prev = loop[(i + loop.length - 1) % loop.length];
    const next = loop[(i + 1) % loop.length];
    return (prev[0] - p[0]) * (next[1] - p[1]) !== (prev[1] - p[1]) * (next[0] - p[0]);
  });
}

/** Pulls every edge of a traced outline inward by `distance`, keeping its right angles. */
export function insetOutline(outline: readonly Point[], distance: number): Point[] {
  return outline.map((p, i) => {
    const prev = outline[(i + outline.length - 1) % outline.length];
    const next = outline[(i + 1) % outline.length];
    const inward = (from: Point, to: Point): Point => [-Math.sign(to[1] - from[1]), Math.sign(to[0] - from[0])];
    const a = inward(prev, p);
    const b = inward(p, next);
    return [p[0] + distance * (a[0] + b[0]), p[1] + distance * (a[1] + b[1])];
  });
}
