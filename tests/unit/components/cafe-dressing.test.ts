import { describe, expect, it } from 'vitest';
import { CUSHIONS, KITCHEN_FLOOR, cushionColor, onPatch } from '@/components/cafe/dressing';
import { PRINTS, PRINT_FRAME } from '@/components/cafe/prints';
import { DECOR_OPTIONS, ENTRANCE, QUERY_TILES, STATIONS, TABLE_LAYOUT, tableFront, type Point } from '@/domain';

const onKitchenFloor = (point: Point) => KITCHEN_FLOOR.some((patch) => onPatch(patch, point));

describe('café floor dressing', () => {
  it('tiles every tile the crew work from behind the counter', () => {
    for (const tile of QUERY_TILES) expect(onKitchenFloor(tile)).toBe(true);
    for (const station of [STATIONS.ingredients, STATIONS.grinder, STATIONS.sugar, STATIONS.lids, STATIONS.water])
      expect(onKitchenFloor(station.prep)).toBe(true);
    expect(onKitchenFloor(STATIONS.orders.prep)).toBe(true);
  });

  it('leaves the customer side on the wooden boards', () => {
    const publicTiles: Point[] = [
      ENTRANCE,
      STATIONS.orders.floor,
      STATIONS.pickup.floor,
      STATIONS.togo.floor,
      STATIONS.togo.customer,
      ...TABLE_LAYOUT.map((_, i) => tableFront(i)),
    ];
    for (const tile of publicTiles) expect(onKitchenFloor(tile)).toBe(false);
  });
});

describe('dining room cushions', () => {
  it('alternates clay and sage like a checkerboard, half and half', () => {
    const sage = TABLE_LAYOUT.map((_, i) => cushionColor('clay-sage', i) === CUSHIONS['clay-sage'][1]);
    expect(sage.filter(Boolean)).toHaveLength(TABLE_LAYOUT.length / 2);
    TABLE_LAYOUT.forEach((table, i) =>
      TABLE_LAYOUT.forEach((other, j) => {
        if (Math.abs(table.x - other.x) + Math.abs(table.z - other.z) === 4 && table.x !== other.x)
          expect(sage[i]).not.toBe(sage[j]);
      }),
    );
  });

  it('lays every pair the café can pick on the same checkerboard', () => {
    for (const [id, pair] of Object.entries(CUSHIONS) as [keyof typeof CUSHIONS, readonly [string, string]][]) {
      expect(pair[0]).not.toBe(pair[1]);
      TABLE_LAYOUT.forEach((_, i) =>
        expect(cushionColor(id, i)).toBe(pair[cushionColor('clay-sage', i) === CUSHIONS['clay-sage'][0] ? 0 : 1]),
      );
    }
  });

  it('has a drawing for every look the café can pick, each on its own colours', () => {
    expect(Object.keys(CUSHIONS).sort()).toEqual(DECOR_OPTIONS.cushions.map(({ id }) => id).sort());
    expect(Object.keys(PRINTS).sort()).toEqual(DECOR_OPTIONS.print.map(({ id }) => id).sort());
    expect(new Set(Object.values(CUSHIONS).flat()).size).toBe(Object.keys(CUSHIONS).length * 2);
  });

  it('keeps every print on its mount, whatever the turn of each shape', () => {
    const [width, height] = PRINT_FRAME.mount;
    for (const shapes of Object.values(PRINTS)) {
      for (const { shape, at, size, turn = 0 } of shapes) {
        // The farthest a corner (or the rim of a disc) reaches from the shape's middle, along x and along y.
        const [w, h] = shape === 'band' ? [size[0] / 2, size[1] / 2] : size;
        const reach = (along: number) =>
          shape === 'band'
            ? Math.abs(w * Math.cos(turn + along)) + Math.abs(h * Math.sin(turn + along))
            : Math.hypot(w * Math.cos(turn + along), h * Math.sin(turn + along));
        expect(Math.abs(at[0]) + reach(0)).toBeLessThanOrEqual(width / 2);
        expect(Math.abs(at[1]) + reach(-Math.PI / 2)).toBeLessThanOrEqual(height / 2);
      }
    }
  });
});
