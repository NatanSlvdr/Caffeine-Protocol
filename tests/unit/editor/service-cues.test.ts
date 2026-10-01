import { describe, expect, it } from 'vitest';
import { serviceCues } from '../../../src/features/workspace/serviceCues';
import type { RunResult } from '../../../src/domain';

const result = {
  execution: [
    {
      seed_id: 's1',
      start: 10,
      duration: 30,
      events: [
        { action: 'BREW', start: 2, end: 6 },
        { action: 'SERVE', start: 8, end: 9 },
        { action: 'HAND OVER', start: 8.5, end: 9.5 },
        { start: 1, end: 3 },
      ],
    },
  ],
} as unknown as RunResult;

describe('serviceCues', () => {
  it('pours when brewing starts and serves when a drink lands, once per stretch', () => {
    expect(serviceCues(result, 0, 11)).toEqual([]);
    expect(serviceCues(result, 11, 12)).toEqual(['pour']);
    expect(serviceCues(result, 12, 18)).toEqual([]);
    expect(serviceCues(result, 18, 20)).toEqual(['serve']);
    expect(serviceCues(result, 0, 30).sort()).toEqual(['pour', 'serve']);
    expect(serviceCues(result, 20, 20)).toEqual([]);
  });
});
