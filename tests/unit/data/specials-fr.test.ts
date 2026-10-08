import { describe, expect, it } from 'vitest';
import { FRESH_SECONDS, menuById, menuIn, specialIn, specials, TOGETHER_SECONDS } from '@/data/specials';
import { menusFr, specialsFr } from '@/data/specials.fr';
import { typeset } from '@/shared/typography';

const NBSP = '\u00a0';
/** The blocks a line shows, as written: the same block in either language. */
const blocks = (text: string) => text.match(/\[[A-Z][^\]|]*\|[^\]]+\]/g) ?? [];
/** How many sound effects a line makes: the French says its own, as many as the English. */
const sounds = (text: string) => (text.match(/\*[^*]+\*/g) ?? []).length;

describe('the specials in French', () => {
  it('tells every special and menu the English does, and none it doesn’t', () => {
    expect(Object.keys(specialsFr)).toEqual(specials.map((special) => special.id));
    const menus = [...new Set(specials.flatMap((special) => (special.card ? [special.card.menu] : [])))];
    expect(Object.keys(menusFr)).toEqual(menus);
    // A card's French is the card's, and a special on its own has a note of its own.
    for (const special of specials) {
      expect(!!specialsFr[special.id].card, special.id).toBe(!!special.card);
      expect(specialsFr[special.id].note === undefined, special.id).toBe(!!special.card);
    }
  });

  it('tells each special’s scenes line for line, by the same speakers, with the same blocks and as many sounds', () => {
    for (const en of specials) {
      const fr = specialIn(en, 'fr');
      for (const scene of ['intro', 'outro'] as const) {
        expect(fr[scene], `${en.id} ${scene}`).toHaveLength(en[scene].length);
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

  it('opens every card of a menu on the menu’s own lines, then the card’s', () => {
    const cards = specials.filter((special) => special.card);
    const opening = menusFr.saturday.opening.length;
    for (const card of cards) {
      const fr = specialIn(card, 'fr');
      expect(fr.intro.slice(0, opening).map((line) => line.text)).toEqual(
        specialIn(cards[0], 'fr')
          .intro.slice(0, opening)
          .map((line) => line.text),
      );
      expect(fr.intro[opening].text).toBe(typeset(specialsFr[card.id].intro[0]));
    }
  });

  it('keeps a special’s level, routines, rules and save key, and only its words change', () => {
    for (const en of specials) {
      const fr = specialIn(en, 'fr');
      expect(specialIn(en, 'en')).toBe(en);
      expect(specialIn(en, 'fr')).toBe(fr);
      expect({ id: fr.id, by: fr.by, level: fr.level, menu: fr.card?.menu }).toEqual({
        id: en.id,
        by: en.by,
        level: en.level,
        menu: en.card?.menu,
      });
      expect({ ...fr.lesson, note: '' }).toEqual({ ...en.lesson, note: '' });
      for (const key of ['title', 'hint', 'thanks'] as const) expect(fr[key], `${en.id} ${key}`).not.toBe(en[key]);
      expect(fr.lesson.note).not.toBe(en.lesson.note);
      for (const key of ['story', 'objective', 'concept'] as const)
        expect(fr.brief[key], `${en.id} ${key}`).not.toBe(en.brief[key]);
      if (fr.card) expect(fr.lesson.note).toBe(`${fr.card.recipes} ${fr.card.demand} ${fr.card.constraint}`);
    }
  });

  it('says the same timings as the rules the shifts are served by, and sets its French typography', () => {
    const [together, fresh] = ['together', 'fresh'].map((id) =>
      specialIn(
        specials.find((s) => s.id === id)!,
        'fr',
      ),
    );
    expect(together.brief.objective).toContain(`dans les ${TOGETHER_SECONDS} secondes`);
    expect(together.lesson.note).toContain(`${TOGETHER_SECONDS} secondes`);
    expect(fresh.brief.objective).toContain(`dans les ${FRESH_SECONDS} secondes`);
    expect(fresh.lesson.note).toContain(`${FRESH_SECONDS} secondes`);
    expect(fresh.hint).toBe('Rien n’attend au comptoir de retrait.');
    expect(fresh.brief.story).toContain(`comme Dot aime son sucre${NBSP}: pile comme il faut.`);
  });

  it('puts a menu up in the reader’s language, set with French typography', () => {
    const saturday = menuById('saturday')!;
    expect(menuIn(saturday, 'en')).toBe(saturday);
    const fr = menuIn(saturday, 'fr');
    expect(menuIn(saturday, 'fr')).toBe(fr);
    expect({ id: fr.id, by: fr.by }).toEqual({ id: saturday.id, by: saturday.by });
    expect(fr.title).toBe('Le marché du samedi');
    expect(fr.hint).toBe(`Choisissez un menu, puis programmez pour ce qu’il apporte.`);
    expect(menuIn(saturday, 'fr').story).toMatch(/^Le marché de la rue revient le samedi/);
  });
});
