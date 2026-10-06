import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { completeLevel, newSave, parseSave } from '../../../src/features/campaign/save/persistence';

/** The optional challenges a café has met are kept with it, through a reload, an export and a lesser service. */
describe('challenges met in the save', () => {
  it('leaves a café that has met none without the map', () => {
    const save = completeLevel(newSave(), 14, 3, '', lessons, []);
    expect(save).not.toHaveProperty('challenges');
    expect(parseSave(JSON.stringify(save), lessons)).not.toHaveProperty('challenges');
  });

  it('keeps a challenge met, whatever later services do', () => {
    let save = completeLevel(newSave(), 14, 3, '', lessons, ['walk']);
    expect(save.challenges).toEqual({ 14: ['walk'] });
    save = completeLevel(save, 14, 2, '', lessons, []);
    expect(save.challenges).toEqual({ 14: ['walk'] });
    save = completeLevel(save, 20, 3, '', lessons, ['close', 'walk']);
    save = completeLevel(save, 20, 3, '', lessons, ['walk']);
    expect(save.challenges).toEqual({ 14: ['walk'], 20: ['close', 'walk'] });
  });

  it('round-trips through an export', () => {
    const save = completeLevel(newSave(), 18, 3, '', lessons, ['rush']);
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it('drops shifts with none met', () => {
    const save = { ...newSave(), challenges: { 14: [], 16: ['wait'] } };
    expect(parseSave(JSON.stringify(save), lessons).challenges).toEqual({ 16: ['wait'] });
    expect(parseSave(JSON.stringify({ ...newSave(), challenges: { 14: [] } }), lessons)).not.toHaveProperty(
      'challenges',
    );
  });

  it.each([
    ['a list', []],
    ['an unknown measure', { 14: ['speed'] }],
    ['a measure twice', { 14: ['walk', 'walk'] }],
    ['a shift past the last', { [lessons.length]: ['walk'] }],
    ['a shift that is not a number', { first: ['walk'] }],
    ['measures that are not a list', { 14: 'walk' }],
  ])('turns away %s', (_, challenges) => {
    expect(() => parseSave(JSON.stringify({ ...newSave(), challenges }), lessons)).toThrow();
  });
});
