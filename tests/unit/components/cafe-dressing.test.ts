import { describe, expect, it } from 'vitest';
import { KITCHEN_FLOOR, onPatch } from '@/components/cafe/dressing';
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
