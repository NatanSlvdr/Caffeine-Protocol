import { describe, expect, it } from 'vitest';
import { recipeStepError } from '../../../src/domain/drinks';
import { tilesAway } from '../../../src/domain/directions';

describe('recipe step errors', () => {
  it('names the step that comes next, in the words the blocks use', () => {
    expect(recipeStepError('FILL WATER', { stage: 'beans', item: 'coffee' })).toBe(
      'Take up water at the sink can’t come next for this coffee. Next step: Use the coffee machine to grind the beans.',
    );
    expect(recipeStepError('TAKE BEANS', { stage: 'water', item: 'tea' })).toBe(
      'Take up the beans can’t come next for this tea. Next step: Use the coffee machine to steep the tea.',
    );
    expect(recipeStepError('TAKE UP', { stage: 'leaves', item: 'tea' })).toBe(
      'Take up can’t come next for this tea. Next step: Take up water at the sink.',
    );
  });

  it('points a finished drink toward sugar or the counter', () => {
    expect(recipeStepError('FILL WATER', { stage: 'brewed', item: 'coffee' })).toBe(
      'Take up water at the sink can’t come next for this coffee. It’s brewed: take up sugar or deposit it up at pickup.',
    );
  });
});

describe('tile distances', () => {
  it('says how far a station is in the directions Move uses', () => {
    expect(tilesAway([0, 0], [3, 0])).toBe('3 tiles right');
    expect(tilesAway([2, 5], [1, 3])).toBe('1 tile left and 2 tiles up');
    expect(tilesAway([0, 0], [0, 1])).toBe('1 tile down');
  });
});
