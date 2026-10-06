import { describe, expect, it } from 'vitest';
import { lessons } from '../../../src/data';
import { answerChoice, newSave, parseSave } from '../../../src/features/campaign/save/persistence';

/** What Niko said at each choice is kept with the café, through a reload and an export; nothing is scored by it. */
describe('story choices in the save', () => {
  it('leaves a café that has answered none without the map', () => {
    expect(newSave()).not.toHaveProperty('choices');
    expect(parseSave(JSON.stringify({ ...newSave(), choices: {} }), lessons)).not.toHaveProperty('choices');
  });

  it('keeps the latest answer to each choice, and touches nothing else', () => {
    const before = newSave();
    let save = answerChoice(before, 'hello-query', 'minding');
    save = answerChoice(save, 'hot-chocolate', 'ours');
    expect(answerChoice(save, 'hot-chocolate', 'ours')).toBe(save);
    save = answerChoice(save, 'hello-query', 'mine');
    expect(save.choices).toEqual({ 'hello-query': 'mine', 'hot-chocolate': 'ours' });
    expect({ ...save, choices: undefined }).toEqual({ ...before, choices: undefined });
  });

  it('round-trips through an export, keeping choices a later version may have dropped', () => {
    const save = { ...newSave(), choices: { 'hello-query': 'minding', 'a-retired-choice': 'yes' } };
    expect(parseSave(JSON.stringify(save), lessons)).toEqual(save);
  });

  it.each([
    ['a list', ['hello-query']],
    ['an answer that is not text', { 'hello-query': 2 }],
    ['an answer that is not a word', { 'hello-query': 'Mine!' }],
    ['a choice that is not a word', { 'Hello Query': 'mine' }],
    ['a map far longer than the story', Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`c-${i}`, 'a']))],
  ])('turns away %s', (_, choices) => {
    expect(() => parseSave(JSON.stringify({ ...newSave(), choices }), lessons)).toThrow('Invalid story choices.');
  });
});
