import { describe, expect, it } from 'vitest';
import { CAFE_COLORS, finishFor } from '@/components/cafe/primitives';

describe('café material finishes', () => {
  it('lets steel and ceramic shine while fabric and paint stay matte', () => {
    const rough = (color: string) => finishFor(color, 0.8).roughness;
    expect(rough(CAFE_COLORS.steel)).toBeLessThan(rough(CAFE_COLORS.walnut));
    expect(rough(CAFE_COLORS.cream)).toBeLessThan(rough(CAFE_COLORS.walnut));
    expect(rough(CAFE_COLORS.walnut)).toBeLessThan(rough(CAFE_COLORS.clay));
    expect(rough(CAFE_COLORS.wall)).toBeGreaterThan(0.9);
  });

  it('keeps metals partly dielectric, since nothing in the scene is there to reflect', () => {
    for (const color of Object.values(CAFE_COLORS)) expect(finishFor(color, 0.8).metalness).toBeLessThanOrEqual(0.5);
    expect(finishFor(CAFE_COLORS.brass, 0.8).metalness).toBeGreaterThan(0);
  });

  it("falls back to the primitive's own roughness outside the palette", () => {
    expect(finishFor('#123456', 0.7)).toEqual({ roughness: 0.7, metalness: 0 });
  });
});
