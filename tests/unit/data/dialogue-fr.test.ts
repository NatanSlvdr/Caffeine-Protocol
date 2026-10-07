import { describe, expect, it } from 'vitest';
import { levels } from '@/data';
import { shiftIntro, shiftOutro } from '@/data/campaign/dialogue';
import { introsFr, outrosFr } from '@/data/campaign/dialogue.fr';
import { FAILURE_WORDS } from '@/features/workspace/failureWords';
import { REACTION_WORDS } from '@/features/workspace/reactionWords';
import { failureHint, failureLines } from '@/features/workspace/reactions';
import type { DialogueLine, FailureCode, RunResult } from '@/domain';

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

  it('reacts to every failure the English does, quoting what a guest said as they said it', () => {
    const codes = Object.keys(REACTION_WORDS.en.failed) as FailureCode[];
    expect(Object.keys(REACTION_WORDS.fr.failed).sort()).toEqual([...codes].sort());
    for (const code of codes) {
      const [en, fr] = [REACTION_WORDS.en.failed[code], REACTION_WORDS.fr.failed[code]];
      expect(fr === undefined, code).toBe(en === undefined);
      if (!en || !fr) continue;
      const quotes = en('two teas').includes('two teas');
      expect(fr('two teas').includes('⟪two teas⟫'), code).toBe(quotes);
      expect(sounds(fr('two teas')), code).toBe(sounds(en('two teas')));
    }
  });

  it('tells a failed run in French, Niko nudging with the card’s own hint', () => {
    const result = {
      passed: false,
      observation: false,
      stars: 0,
      events: [],
      first_failure: {
        role: 'query',
        phrase: 'Two teas, please.',
        code: 'ticket-item',
        reason: 'Ticket 1 has the wrong item.',
      },
    } as unknown as RunResult;
    const [guest, niko, restore] = failureLines(
      result,
      'query',
      false,
      { query: 'listen' },
      REACTION_WORDS.fr,
      FAILURE_WORDS.fr.hints,
    );
    expect(guest.text).toBe('J’ai dit «\u00a0⟪Two teas, please.⟫\u00a0». Ce n’est pas ce que j’ai commandé.');
    expect(niko.text).toBe(failureHint('ticket-item', FAILURE_WORDS.fr.hints));
    expect(restore.text).toContain('Options → Restaurer la routine de Query');
    const robot = failureLines(
      { ...result, first_failure: { ...result.first_failure!, code: 'compile' } },
      'query',
      true,
      undefined,
      REACTION_WORDS.fr,
    );
    expect(robot[0]).toMatchObject({ who: 'query', text: 'Instruction pas claire. *bzzt* Arrêt.' });
  });
});
