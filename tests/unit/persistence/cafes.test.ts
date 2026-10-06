import { beforeEach, describe, expect, it } from 'vitest';
import {
  CAFES_KEY,
  MAX_CAFES,
  SAVE_KEY,
  addCafe,
  cafeKey,
  freeCafeName,
  nextCafeName,
  openCafeId,
  readCafes,
  removeCafe,
  renameCafe,
  settleCafe,
  writeCafes,
  type CafeList,
} from '../../../src/features/campaign/save/persistence';

beforeEach(() => {
  localStorage.clear();
  settleCafe(localStorage);
});

const first: CafeList = { open: 'first', cafes: [{ id: 'first', name: 'First café' }] };

describe('the cafés in a browser', () => {
  it('starts with the first café alone, kept where a café always was', () => {
    localStorage.setItem(SAVE_KEY, '{"version":2}');
    expect(readCafes(localStorage)).toEqual(first);
    expect(cafeKey('first')).toBe(SAVE_KEY);
    expect(cafeKey('2')).toBe(`${SAVE_KEY}.cafe-2`);
    // Reading the list writes nothing, so a café from before there could be several is left as it was.
    expect(localStorage.getItem(CAFES_KEY)).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).toBe('{"version":2}');
  });

  it('reads a damaged list as the first café alone, and drops entries it can’t trust', () => {
    for (const raw of ['nonsense', '{"cafes":[]}', '{"cafes":"all"}', '{"cafes":[{"id":"../x","name":"Odd"}]}']) {
      localStorage.setItem(CAFES_KEY, raw);
      expect(readCafes(localStorage)).toEqual(first);
    }
    localStorage.setItem(
      CAFES_KEY,
      JSON.stringify({
        open: '9',
        cafes: [
          { id: '3', name: '  Night   shift  ' },
          { id: '3', name: 'Again' },
          { id: 'first', name: '' },
          { id: 'first', name: 'Mine' },
        ],
      }),
    );
    expect(readCafes(localStorage)).toEqual({
      open: '3',
      cafes: [
        { id: '3', name: 'Night shift' },
        { id: 'first', name: 'Mine' },
      ],
    });
  });

  it('settles the café a tab plays as it opens, and keys everything by it', () => {
    writeCafes(localStorage, { open: '2', cafes: [...first.cafes, { id: '2', name: 'Two' }] });
    expect(openCafeId()).toBe('first');
    settleCafe(localStorage);
    expect(openCafeId()).toBe('2');
    expect(cafeKey()).toBe(`${SAVE_KEY}.cafe-2`);
    settleCafe(undefined);
    expect(openCafeId()).toBe('first');
  });

  it('adds cafés under keys never used before, with names nobody has', () => {
    const { list, id } = addCafe(first, 'First café');
    expect(id).toBe('2');
    expect(list.cafes[1]).toEqual({ id: '2', name: 'First café 2' });
    expect(nextCafeName(list)).toBe('Café 3');
    const removed = removeCafe(localStorage, list, '2');
    expect(addCafe(addCafe(removed, 'A').list, 'B').id).toBe('3');
    expect(freeCafeName(first, ' first CAFÉ ')).toBe('first CAFÉ 2');
    expect(freeCafeName(first, '   ')).toBe('Café');
    expect(freeCafeName(first, 'x'.repeat(40), undefined)).toHaveLength(32);
    expect(freeCafeName({ ...first, cafes: [{ id: 'first', name: 'x'.repeat(32) }] }, 'x'.repeat(40))).toBe(
      `${'x'.repeat(30)} 2`,
    );
  });

  it('renames a café, keeping its own name free to take back', () => {
    const { list } = addCafe(first, 'Two');
    expect(renameCafe(list, '2', 'two').cafes[1].name).toBe('two');
    expect(renameCafe(list, '2', 'First café').cafes[1].name).toBe('First café 2');
  });

  it('removes a café with everything it kept, and nothing of another', () => {
    const { list } = addCafe(first, 'Two');
    for (const part of ['', '.backup', '.seen', '.bench']) {
      localStorage.setItem(`${SAVE_KEY}.cafe-2${part}`, 'kept');
      localStorage.setItem(`${SAVE_KEY}${part}`, 'mine');
    }
    localStorage.setItem(`${SAVE_KEY}.notebook`, 'shared');
    const next = removeCafe(localStorage, { ...list, open: '2' }, '2');
    expect(next).toEqual(first);
    expect(Object.keys(localStorage).filter((key) => key.includes('cafe-2'))).toEqual([]);
    expect(localStorage.getItem(`${SAVE_KEY}.bench`)).toBe('mine');
    expect(localStorage.getItem(`${SAVE_KEY}.notebook`)).toBe('shared');
  });

  it('keeps a list no longer than a browser holds', () => {
    const cafes = Array.from({ length: MAX_CAFES + 2 }, (_, i) => ({ id: String(i + 2), name: `C${i}` }));
    localStorage.setItem(CAFES_KEY, JSON.stringify({ open: '2', cafes }));
    expect(readCafes(localStorage).cafes).toHaveLength(MAX_CAFES);
  });
});
