import { describe, expect, it } from 'vitest';
import { campaignNarrative } from '@/data/campaign/narrative';
import { campaignNarrativeFr } from '@/data/campaign/narrative.fr';

/** The game's own words a lesson note names: blocks, conditions and what a robot hears, English in either language. */
const CODE_WORDS = [
  'Wait for Orders',
  'Wait for Dirty cups',
  'Take up',
  'Take down',
  'Deposit up',
  'Deposit down',
  'Deposit right',
  'Move right 1',
  'Move left 1',
  'Move to',
  'Use up',
  'Write',
  'If',
  'Else',
  'Jump',
  'For item in order',
  'For Var A times',
  'Store',
  'Help',
  'Function recipe',
  'Call recipe',
  'Stop',
  'Closed',
  'Rush',
  'To go',
  'Ambiguous',
  'Negation',
];

describe('the shifts in French', () => {
  it('has a row for every shift, every field filled', () => {
    expect(campaignNarrativeFr).toHaveLength(campaignNarrative.length);
    for (const row of campaignNarrativeFr)
      for (const text of Object.values(row)) expect(text.trim().length).toBeGreaterThan(0);
  });

  it('names every block its English lesson note does, in the block’s own words', () => {
    campaignNarrative.forEach(({ level, lessonNote }, index) => {
      const named = CODE_WORDS.filter((word) => new RegExp(`\\b${word}\\b`).test(lessonNote));
      const missing = named.filter((word) => !campaignNarrativeFr[index].lessonNote.includes(word));
      expect(missing, `shift ${level}`).toEqual([]);
    });
  });

  it('gives every shift a title of its own', () => {
    const titles = campaignNarrativeFr.map((row) => row.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
