import { describe, expect, it } from 'vitest';
import {
  DAY,
  EVENING,
  LAMP_REACH,
  LIGHT_POOLS,
  TABLE_CANDLES,
  WALL_SCONCES,
  lightMood,
} from '@/components/three/lightMoods';
import { BOUNDS, TABLE_LAYOUT } from '@/domain';

describe('café light moods', () => {
  it('picks the evening mood after dark, the day mood otherwise', () => {
    expect(lightMood(false)).toBe(DAY);
    expect(lightMood(true)).toBe(EVENING);
  });

  it('dims the sky in the evening so the lamps carry the warmth', () => {
    expect(EVENING.ambient.intensity).toBeLessThan(DAY.ambient.intensity / 2);
    expect(EVENING.key.intensity).toBeLessThan(DAY.key.intensity / 2);
  });

  it('lights every table from a pool of lamp light', () => {
    for (const table of TABLE_LAYOUT) {
      const nearest = Math.min(
        ...LIGHT_POOLS.map(({ at }) => Math.hypot(at[0] - table.x, at[1] - 1.3, at[2] - table.z)),
      );
      expect(nearest).toBeLessThan(LAMP_REACH * 0.6);
    }
  });

  it('keeps the light pools inside the room and above head height', () => {
    for (const { at } of LIGHT_POOLS) {
      expect(at[0]).toBeGreaterThanOrEqual(BOUNDS.minX);
      expect(at[0]).toBeLessThanOrEqual(BOUNDS.maxX);
      expect(at[2]).toBeGreaterThanOrEqual(BOUNDS.minZ);
      expect(at[2]).toBeLessThanOrEqual(BOUNDS.maxZ);
      expect(at[1]).toBeGreaterThan(2.5);
    }
    for (const at of WALL_SCONCES) expect(at[2]).toBe(BOUNDS.minZ - 0.5);
  });

  it('sets each candle on its own table, clear of the drinks at the centre', () => {
    expect(TABLE_CANDLES).toHaveLength(TABLE_LAYOUT.length);
    TABLE_CANDLES.forEach(([x, , z], i) => {
      const table = TABLE_LAYOUT[i];
      expect(x).toBe(table.x);
      expect(Math.abs(z - table.z)).toBeGreaterThan(0.25);
      expect(Math.abs(z - table.z)).toBeLessThan(table.depth / 2);
    });
  });
});
