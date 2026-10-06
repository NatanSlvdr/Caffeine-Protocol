import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LENGTH, lessons } from '../../../src/data';
import { DECOR_OPTIONS, LOUS_DECOR, UNLOCKS, decorOf, type ProgressSave } from '../../../src/domain';
import { newSave, parseSave, pickDecor } from '../../../src/features/campaign/save/persistence';
import { acts } from '../../../src/shell/rail/acts';
import { shelved } from '../../../src/shell/shelf';

/** The first `served` shifts served (the hand-served prologue too, as the save keeps it). */
const servedThrough = (served: number, more: Partial<ProgressSave> = {}): ProgressSave => ({
  ...newSave(),
  stars: Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 2])),
  ...more,
});
const earned = (save: ProgressSave) =>
  Object.values(DECOR_OPTIONS)
    .flat()
    .filter((option) => option.earned(save))
    .map(({ id }) => id);

describe('the café’s looks', () => {
  it('starts with Lou’s, and brings one more with each act served and one at closing time', () => {
    expect(decorOf(newSave())).toEqual(LOUS_DECOR);
    expect(earned(newSave())).toEqual(['clay-sage', 'hills']);
    expect(earned(servedThrough(acts[1].to - 1))).toEqual(['clay-sage', 'hills']);
    expect(earned(servedThrough(acts[1].to))).toEqual(['clay-sage', 'hills', 'harbour']);
    expect(earned(servedThrough(acts[2].to))).toEqual(['clay-sage', 'mustard-teal', 'hills', 'harbour']);
    expect(earned(servedThrough(acts[3].to))).toEqual([
      'clay-sage',
      'mustard-teal',
      'hills',
      'harbour',
      'coffee-branch',
    ]);
    expect(earned(servedThrough(CAMPAIGN_LENGTH, { complete: true }))).toHaveLength(6);
  });

  it('arrives with the act’s keepsake, so the shelf has something new on it whenever a look does', () => {
    for (const act of [1, 2, 3]) {
      const before = servedThrough(acts[act].to - 1);
      const after = servedThrough(acts[act].to);
      expect(earned(after).length).toBe(earned(before).length + 1);
      expect(shelved(after).length).toBeGreaterThan(shelved(before).length);
    }
  });

  it('shows a look picked only once the café has earned it, and Lou’s for anything it doesn’t know', () => {
    const picked = { cushions: 'mustard-teal', print: 'harbour' };
    expect(decorOf({ ...servedThrough(acts[1].to), decor: picked })).toEqual({
      cushions: 'clay-sage',
      print: 'harbour',
    });
    expect(decorOf({ ...servedThrough(acts[2].to), decor: picked })).toEqual(picked);
    expect(decorOf({ ...servedThrough(UNLOCKS.toGo), decor: { cushions: 'velvet', print: 'a-later-print' } })).toEqual(
      LOUS_DECOR,
    );
  });
});

describe('the café’s looks in the save', () => {
  it('keeps a pick per spot, and keeps nothing for Lou’s', () => {
    const before = servedThrough(CAMPAIGN_LENGTH, { complete: true });
    let save = pickDecor(before, 'print', 'harbour');
    save = pickDecor(save, 'cushions', 'berry-oat');
    expect(save.decor).toEqual({ print: 'harbour', cushions: 'berry-oat' });
    save = pickDecor(save, 'print', 'hills');
    expect(save.decor).toEqual({ cushions: 'berry-oat' });
    save = pickDecor(save, 'cushions', 'clay-sage');
    expect(save).not.toHaveProperty('decor');
    expect(save).toEqual(before);
  });

  it('round-trips through an export, keeping looks a later version may have added', () => {
    const save = { ...newSave(), decor: { print: 'coffee-branch', awning: 'striped' } };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
    expect(parseSave(JSON.stringify({ ...newSave(), decor: {} }), lessons)).not.toHaveProperty('decor');
  });

  it.each([
    ['a list', ['harbour']],
    ['a look that is not text', { print: 2 }],
    ['a look that is not a word', { print: 'The Harbour' }],
    ['a spot that is not a word', { 'Back wall': 'hills' }],
    ['a map far longer than the café', Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`spot-${i}`, 'a']))],
  ])('turns away %s', (_, decor) => {
    expect(() => parseSave(JSON.stringify({ ...newSave(), decor }), lessons)).toThrow('Invalid café looks.');
  });
});
