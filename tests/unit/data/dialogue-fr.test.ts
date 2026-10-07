import { describe, expect, it } from 'vitest';
import { levels } from '@/data';
import { shiftIntro, shiftOutro } from '@/data/campaign/dialogue';
import { introsFr, outrosFr } from '@/data/campaign/dialogue.fr';
import type { DialogueLine } from '@/domain';
import { REACTION_WORDS } from '@/features/workspace/reactionWords';

/** The blocks a line shows, as written: the same block in either language. */
const blocks = (text: string) => text.match(/\[[A-Z][^\]|]*\|[^\]]+\]/g) ?? [];
/** How many sound effects a line makes: the French says its own, as many as the English. */
const sounds = (text: string) => (text.match(/\*[^*]+\*/g) ?? []).length;

const scenes = (say: (index: number, language?: 'en' | 'fr') => DialogueLine[]) =>
  levels.map((_, index) => ({ shift: index + 1, en: say(index), fr: say(index, 'fr') }));

describe('the shifts’ scenes in French', () => {
  it('writes a scene for every shift the English does, and none it doesn’t', () => {
    expect(Object.keys(introsFr).map(Number)).toEqual(levels.map((_, i) => i + 1));
    expect(Object.keys(outrosFr).map(Number)).toEqual(levels.map((_, i) => i + 1));
  });

  for (const [name, said] of [
    ['intro', shiftIntro],
    ['outro', shiftOutro],
  ] as const)
    it(`says each ${name} line for line, by the same speakers, with the same blocks and as many sounds`, () => {
      for (const { shift, en, fr } of scenes(said)) {
        expect(fr.length, `shift ${shift}`).toBe(en.length);
        expect((name === 'intro' ? introsFr : outrosFr)[shift], `shift ${shift}`).toHaveLength(en.length);
        fr.forEach((line, i) => {
          const where = `shift ${shift}, ${name} line ${i + 1}`;
          expect({ who: line.who, mood: line.mood }, where).toEqual({ who: en[i].who, mood: en[i].mood });
          expect(line.text.trim(), where).not.toBe('');
          expect(blocks(line.text), where).toEqual(blocks(en[i].text));
          expect(sounds(line.text), where).toBe(sounds(en[i].text));
        });
      }
    });

  it('closes the watched first shift with the words Niko says after any watched service', () => {
    const spaced = (text: string) => text.replace(/\s/g, ' ');
    expect(spaced(shiftOutro(0, 'fr')[0].text)).toBe(spaced(REACTION_WORDS.fr.watched));
    expect(shiftOutro(0)[0].text).toBe(REACTION_WORDS.en.watched);
  });
});

describe('the crew’s reactions in French', () => {
  it('cheers in each robot’s voice, and counts stars as French does', () => {
    for (const role of ['query', 'prep', 'floor'] as const) {
      expect(REACTION_WORDS.fr.cheers[role]).toHaveLength(REACTION_WORDS.en.cheers[role].length);
      expect(REACTION_WORDS.fr.newBest[role](2, 1)).toMatch(/2 étoiles.*1 étoile|1 étoile.*2 étoiles/);
    }
    expect(REACTION_WORDS.fr.verdict.one(9, 6)).toContain('9 blocs, et 6 suffiraient');
    expect(REACTION_WORDS.fr.verdict.two(40, 30)).toContain('40 pas là où 30 suffiraient');
  });
});
