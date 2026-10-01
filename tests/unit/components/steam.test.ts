import { describe, expect, it } from 'vitest';
import { machineSteaming } from '@/components/cafe/Steam';

describe('coffee machine steam', () => {
  const events = [
    { action: 'GRIND', start: 0, end: 2 },
    { action: 'BREW', start: 4, end: 10 },
    { action: undefined, start: 10, end: 12 },
  ];

  it('steams only while brewing or steeping, not while grinding', () => {
    expect(machineSteaming(events, 1)).toBe(false);
    expect(machineSteaming(events, 4)).toBe(true);
    expect(machineSteaming(events, 9.9)).toBe(true);
    expect(machineSteaming(events, 10)).toBe(false);
    expect(machineSteaming([{ action: 'STEEP', start: 0, end: 7 }], 3)).toBe(true);
  });
});
