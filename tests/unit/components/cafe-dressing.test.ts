import { describe, expect, it } from 'vitest';
import { KITCHEN_FLOOR, cushionIsSage, onPatch } from '@/components/cafe/dressing';
import { ENTRANCE, QUERY_TILES, STATIONS, TABLE_LAYOUT, tableFront, type Point } from '@/domain';

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
    const sage = TABLE_LAYOUT.map((_, i) => cushionIsSage(i));
    expect(sage.filter(Boolean)).toHaveLength(TABLE_LAYOUT.length / 2);
    TABLE_LAYOUT.forEach((table, i) =>
      TABLE_LAYOUT.forEach((other, j) => {
        if (Math.abs(table.x - other.x) + Math.abs(table.z - other.z) === 4 && table.x !== other.x)
          expect(sage[i]).not.toBe(sage[j]);
      }),
    );
  });
});
