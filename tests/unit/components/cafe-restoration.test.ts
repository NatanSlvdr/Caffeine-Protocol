import { describe, expect, it } from 'vitest';
import { OPEN_BOARD, OPEN_BOARD_REACH, STREET_WALL_FACE } from '../../../src/components/cafe/dressing';
import { CAMPAIGN_LENGTH } from '../../../src/data';
import { cutscenes } from '../../../src/data/campaign/cutscenes';
import {
  ENTRANCE,
  PEDESTRIAN_LANE_X,
  RESTORATIONS,
  SIDEWALK_X,
  customerApproach,
  customerExit,
  restoredBy,
  sillGrowth,
  type Restoration,
} from '../../../src/domain';
import { restoredShift } from '../../../src/shell/homePreview';

/** The scene that puts each change in the café; the sidewalk board answers the first morning's CLOSED sign. */
const SCENES: Record<Exclude<Restoration, 'open-sign'>, string> = {
  'employee-photo': 'a-second-pair-of-hands',
  'moka-apron': 'ninety-two-degrees',
  'string-lights': 'the-floor-robot',
  'niko-apron': 'back-to-school',
  'lou-postcard': 'closing-time',
};

const shifts = Array.from({ length: CAMPAIGN_LENGTH + 1 }, (_, i) => i + 1);

describe('the café put back together', () => {
  it('opens shut, puts the board out on the second morning, and has it all once the campaign is served', () => {
    expect([...restoredBy(1)]).toEqual([]);
    expect([...restoredBy(2)]).toEqual(['open-sign']);
    expect(restoredBy(CAMPAIGN_LENGTH).has('lou-postcard')).toBe(false);
    expect(restoredBy(CAMPAIGN_LENGTH + 1).size).toBe(Object.keys(RESTORATIONS).length);
  });

  it('shows each change from the shift its scene opens, and keeps it from then on', () => {
    for (const [id, scene] of Object.entries(SCENES) as [Restoration, string][]) {
      const opens = cutscenes.find((c) => c.id === scene)!.before + 1;
      expect(RESTORATIONS[id], id).toBe(opens);
      expect(restoredBy(opens - 1).has(id), id).toBe(false);
      for (const shift of shifts.filter((s) => s >= opens)) expect(restoredBy(shift).has(id), id).toBe(true);
    }
  });

  it('hangs Moka’s apron before Niko’s goes up beside it', () => {
    expect(RESTORATIONS['moka-apron']).toBeLessThan(RESTORATIONS['niko-apron']);
  });

  it('brings the herbs on the sills back a stage at a time, never wilting again', () => {
    const growth = shifts.map(sillGrowth);
    expect(growth[0]).toBe(0);
    expect(growth.at(-1)).toBe(3);
    expect(new Set(growth)).toEqual(new Set([0, 1, 2, 3]));
    growth.slice(1).forEach((stage, i) => expect(stage).toBeGreaterThanOrEqual(growth[i]));
  });

  it('dresses the shell’s café as the furthest shift opened, and fully once Closing Time has played', () => {
    expect(restoredShift({ unlocked: 0, complete: false })).toBe(1);
    expect(restoredShift({ unlocked: 13, complete: false })).toBe(14);
    expect(restoredBy(restoredShift({ unlocked: 13, complete: false })).has('string-lights')).toBe(true);
    expect(restoredShift({ unlocked: CAMPAIGN_LENGTH + 4, complete: false })).toBe(CAMPAIGN_LENGTH);
    expect(restoredBy(restoredShift({ unlocked: CAMPAIGN_LENGTH - 1, complete: true })).has('lou-postcard')).toBe(true);
  });

  it('stands the sidewalk board clear of the door and of everyone walking by', () => {
    const [x, z] = OPEN_BOARD;
    expect(x + OPEN_BOARD_REACH.x).toBeLessThan(STREET_WALL_FACE - 0.2);
    expect(x - OPEN_BOARD_REACH.x).toBeGreaterThan(SIDEWALK_X + 0.3);
    expect(PEDESTRIAN_LANE_X).toBeLessThan(SIDEWALK_X);
    expect(z + OPEN_BOARD_REACH.z).toBeLessThan(ENTRANCE[1] - 1.5);
    for (const path of [customerApproach(0), customerApproach(1), customerExit(ENTRANCE, 0), customerExit(ENTRANCE, 1)])
      path.slice(1).forEach((to, i) => {
        const from = path[i];
        if (from[0] === to[0] && from[0] < STREET_WALL_FACE) expect(Math.abs(to[0] - x)).toBeGreaterThan(0.5);
        if (from[1] === to[1] && from[0] < STREET_WALL_FACE) expect(Math.abs(to[1] - z)).toBeGreaterThan(1.5);
      });
  });
});
