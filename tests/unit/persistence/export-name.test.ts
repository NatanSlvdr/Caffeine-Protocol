import { describe, expect, it } from 'vitest';
import { saveFileName } from '../../../src/shared/lib/download';

describe('café export file name', () => {
  it('dates the file by the local calendar, padded so backups sort by day', () => {
    expect(saveFileName(new Date(2026, 0, 5, 23, 59))).toBe('caffeine-protocol-save-2026-01-05.json');
    expect(saveFileName(new Date(2026, 10, 30, 0, 1))).toBe('caffeine-protocol-save-2026-11-30.json');
  });
});
