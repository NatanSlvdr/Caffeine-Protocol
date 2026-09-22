import { describe, expect, it } from 'vitest';
import { HOME_PREVIEW_LEVEL, homePreviewResult } from '../../../src/shell/homePreview';

describe('landing café preview', () => {
  it('replays a complete service with all three robots', () => {
    const result = homePreviewResult();
    const events = result.execution?.[0]?.events ?? [];
    const actors = new Set(events.map((event) => event.actor));

    expect(result.level_id).toBe(`L${HOME_PREVIEW_LEVEL}`);
    expect(result.passed).toBe(true);
    expect(result.execution).toHaveLength(1);
    expect(actors).toEqual(new Set(['query', 'prep', 'floor']));
    expect(events.some((event) => event.command === 'SERVE')).toBe(true);
    expect(result.execution?.[0]?.duration).toBeGreaterThan(0);
  });
});
