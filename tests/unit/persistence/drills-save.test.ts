import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { completeDrill, newSave, parseSave } from '../../../src/features/campaign/save/persistence';

/** The drills got right on a first pick are kept with the café, through a reload and an export, apart from its stars. */
describe('drills done in the save', () => {
  it('leaves a café that has done none without the list', () => {
    expect(newSave()).not.toHaveProperty('drills');
    expect(parseSave(JSON.stringify({ ...newSave(), drills: [] }), lessons)).not.toHaveProperty('drills');
  });

  it('keeps each drill once, in the order done, and touches nothing else', () => {
    const before = newSave();
    let save = completeDrill(before, 'paper-first');
    save = completeDrill(save, 'tea-or-coffee');
    expect(completeDrill(save, 'paper-first')).toBe(save);
    expect(save.drills).toEqual(['paper-first', 'tea-or-coffee']);
    expect({ ...save, drills: undefined }).toEqual({ ...before, drills: undefined });
  });

  it('round-trips through an export, keeping ids a later version may have dropped', () => {
    const save = { ...newSave(), drills: ['paper-first', 'a-retired-drill'] };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it.each([
    ['a map', { 'paper-first': true }],
    ['an id twice', ['paper-first', 'paper-first']],
    ['an id that is not a word', ['Paper First!']],
    ['an id that is not text', [3]],
    ['a list far longer than the drills', Array.from({ length: 501 }, (_, i) => `drill-${i}`)],
  ])('turns away %s', (_, drills) => {
    expect(() => parseSave(JSON.stringify({ ...newSave(), drills }), lessons)).toThrow('Invalid drills done.');
  });
});
