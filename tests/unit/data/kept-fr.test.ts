import { describe, expect, it } from 'vitest';
import { guestbook, noteText } from '@/data/campaign/guestbook';
import { guestbookFr } from '@/data/campaign/guestbook.fr';
import { memories, memoryIn } from '@/data/memories';
import { memoriesFr } from '@/data/memories.fr';

const NBSP = '\u00a0';
/** The blocks a line shows, as written: the same block in either language. */
const blocks = (text: string) => text.match(/\[[A-Z][^\]|]*\|[^\]]+\]/g) ?? [];
/** How many sound effects a line makes: the French says its own, as many as the English. */
const sounds = (text: string) => (text.match(/\*[^*]+\*/g) ?? []).length;

describe('the guestbook in French', () => {
  it('writes every note the English does, and none it doesn’t', () => {
    expect(Object.keys(guestbookFr).map(Number)).toEqual(guestbook.map((note) => note.shift));
  });

  it('reads each note in the reader’s language, set with French typography', () => {
    for (const note of guestbook) {
      expect(noteText(note, 'en')).toBe(note.text);
      expect(noteText(note, 'fr')).not.toBe(note.text);
    }
    expect(noteText(guestbook[1], 'fr')).toMatch(
      new RegExp(`^Au petit robot du comptoir${NBSP}: .*Le «${NBSP}sans${NBSP}»`),
    );
  });
});

describe('the memories in French', () => {
  it('tells every memory the English does, and none it doesn’t', () => {
    expect(Object.keys(memoriesFr)).toEqual(memories.map((memory) => memory.id));
  });

  it('tells each memory’s scenes line for line, by the same speakers, with the same blocks and as many sounds', () => {
    for (const en of memories) {
      const fr = memoryIn(en, 'fr');
      for (const scene of ['intro', 'outro'] as const) {
        expect(memoriesFr[en.id][scene], `${en.id} ${scene}`).toHaveLength(en[scene].length);
        fr[scene].forEach((line, i) => {
          const where = `${en.id} ${scene} line ${i + 1}`;
          expect({ who: line.who, mood: line.mood }, where).toEqual({ who: en[scene][i].who, mood: en[scene][i].mood });
          expect(line.text, where).not.toBe(en[scene][i].text);
          expect(blocks(line.text), where).toEqual(blocks(en[scene][i].text));
          expect(sounds(line.text), where).toBe(sounds(en[scene][i].text));
        });
      }
    }
  });

  it('keeps a memory’s level, routines and save key, and only its words change', () => {
    for (const en of memories) {
      const fr = memoryIn(en, 'fr');
      expect(memoryIn(en, 'en')).toBe(en);
      expect(memoryIn(en, 'fr')).toBe(fr);
      expect({ id: fr.id, opens: fr.opens, level: fr.level }).toEqual({ id: en.id, opens: en.opens, level: en.level });
      expect({ starter: fr.lesson.starter, solution: fr.lesson.solution }).toEqual({
        starter: en.lesson.starter,
        solution: en.lesson.solution,
      });
      for (const key of ['title', 'from', 'hint', 'thanks'] as const) expect(fr[key], key).not.toBe(en[key]);
      expect(fr.lesson.note).not.toBe(en.lesson.note);
      expect(fr.brief.story).not.toBe(en.brief.story);
    }
    expect(memoryIn(memories[0], 'fr').thanks).toBe(
      `Dernière ligne du journal, de la main de Lou${NBSP}: «${NBSP}Bon robot. Même heure samedi prochain.${NBSP}»`,
    );
  });
});
