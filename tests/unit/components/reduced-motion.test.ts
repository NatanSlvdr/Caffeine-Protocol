import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from '../../../src/hooks/useReducedMotion';

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.motion;
});

describe('useReducedMotion', () => {
  it('honours the player setting, the page mark, or the system preference', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(useReducedMotion()).toBe(false);
    expect(useReducedMotion(true)).toBe(true);
    document.documentElement.dataset.motion = 'reduced';
    expect(useReducedMotion()).toBe(true);
    delete document.documentElement.dataset.motion;
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }));
    expect(useReducedMotion()).toBe(true);
  });
});
