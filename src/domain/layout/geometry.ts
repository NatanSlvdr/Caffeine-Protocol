export type Point = readonly [number, number];
export const ROOM = [16, 12] as const;
export const BOUNDS = { minX: -8, maxX: 7, minZ: -6, maxZ: 5 } as const;
export type Furniture = {
  id: string;
  kind: 'counter' | 'table' | 'chair' | 'plant';
  x: number;
  z: number;
  width: number;
  depth: number;
};
/** Four tables on each of four rows, with clear aisles between rows and beside the counter. */
export const TABLE_LAYOUT = [-5, -3, -1, 1]
  .flatMap((z) => [-6, -2, 2, 6].map((x) => [x, z]))
  .map(([x, z], i) => ({ id: `T${String(i + 1).padStart(2, '0')}`, x, z, width: 1, depth: 1 }));
export const tableFront = (index: number): Point => {
  const t = TABLE_LAYOUT[index];
  return [t.x, t.z + 1];
};
export const tableSeat = (index: number, side: 0 | 1): Point => {
  const t = TABLE_LAYOUT[index];
  return [t.x + (side === 0 ? -1 : 1), t.z + (t.depth - 1) / 2];
};
export const FURNITURE: Furniture[] = [
  { id: 'storage', kind: 'counter', x: -1, z: 4, width: 2, depth: 1 },
  { id: 'equipment', kind: 'counter', x: 1, z: 4, width: 7, depth: 1 },
  { id: 'query-customer', kind: 'counter', x: -6, z: 5, width: 1, depth: 1 },
  { id: 'register-corner', kind: 'counter', x: -6, z: 4, width: 1, depth: 1 },
  { id: 'handoff', kind: 'counter', x: -3, z: 5, width: 1, depth: 1 },
  { id: 'handoff-corner', kind: 'counter', x: -3, z: 4, width: 1, depth: 1 },
  { id: 'query-back', kind: 'counter', x: -5, z: 4, width: 2, depth: 1 },
  { id: 'plant', kind: 'plant', x: -8, z: -6, width: 1, depth: 1 },
  ...TABLE_LAYOUT.flatMap((t) => [
    { ...t, kind: 'table' as const },
    ...[-1, 1].map((side) => ({
      id: `${t.id}-chair-${side}`,
      kind: 'chair' as const,
      x: t.x + side,
      z: t.z,
      width: 1,
      depth: 1,
    })),
  ]),
];
