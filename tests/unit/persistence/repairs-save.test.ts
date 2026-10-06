import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { completeRepair, newSave, parseSave } from '../../../src/features/campaign/save/persistence';

/** The robots mended on the repair bench are kept with the café, through a reload and an export, apart from its stars. */
describe('robots mended in the save', () => {
  it('leaves a café that has mended none without the list', () => {
    expect(newSave()).not.toHaveProperty('repairs');
    expect(parseSave(JSON.stringify({ ...newSave(), repairs: [] }), lessons)).not.toHaveProperty('repairs');
  });

  it('keeps each robot once, in the order mended, and touches nothing else', () => {
    const before = newSave();
    let save = completeRepair(before, 'porter');
    save = completeRepair(save, 'query');
    expect(completeRepair(save, 'porter')).toBe(save);
    expect(save.repairs).toEqual(['porter', 'query']);
    expect({ ...save, repairs: undefined }).toEqual({ ...before, repairs: undefined });
  });

  it('round-trips through an export, keeping ids a later version may have dropped', () => {
    const save = { ...newSave(), repairs: ['query', 'a-retired-bench'] };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it.each([
    ['a map', { query: true }],
    ['an id twice', ['query', 'query']],
    ['an id that is not a word', ['Query!']],
    ['an id that is not text', [3]],
  ])('turns away %s', (_, repairs) => {
    expect(() => parseSave(JSON.stringify({ ...newSave(), repairs }), lessons)).toThrow('Invalid robots mended.');
  });
});
