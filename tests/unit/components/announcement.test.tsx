import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnnouncement } from '../../../src/hooks/useAnnouncement';

describe('useAnnouncement', () => {
  it('changes the text for every message, even one that repeats the last', () => {
    const { result } = renderHook(() => useAnnouncement());
    const said: string[] = [];
    for (const text of ['Saved.', 'Saved.', 'Saved.', 'Done.']) {
      act(() => result.current[1](text));
      said.push(result.current[0]);
    }
    expect(said.map((text) => text.trim())).toEqual(['Saved.', 'Saved.', 'Saved.', 'Done.']);
    expect(said[1]).not.toBe(said[0]);
    expect(said[2]).not.toBe(said[1]);
  });

  it('still changes when a handler clears the line and then says the same thing again', () => {
    const { result } = renderHook(() => useAnnouncement());
    act(() => result.current[1]('Exported.'));
    const first = result.current[0];
    act(() => {
      result.current[1]('');
      result.current[1]('Exported.');
    });
    expect(result.current[0]).not.toBe(first);
    expect(result.current[0].trim()).toBe('Exported.');
  });
});
