import { describe, expect, it } from 'vitest';
import { longDay, longDayIn, waveThanks } from '@/data/longDay';
import { longDayFr } from '@/data/longDay.fr';
import { TOGETHER_SECONDS } from '@/data/specials';

const NBSP = '\u00a0';
/** The blocks a line shows, as written: the same block in either language. */
const blocks = (text: string) => text.match(/\[[A-Z][^\]|]*\|[^\]]+\]/g) ?? [];
/** How many sound effects a line makes: the French says its own, as many as the English. */
const sounds = (text: string) => (text.match(/\*[^*]+\*/g) ?? []).length;

describe('the Long Day in French', () => {
  const day = longDayIn('fr');

  it('tells every wave, in order, and keeps the day’s save key, version and regular', () => {
    expect(longDayFr.waves).toHaveLength(longDay.waves.length);
    expect(longDayIn('en')).toBe(longDay);
    expect(longDayIn('fr')).toBe(day);
    expect({ id: day.id, by: day.by, version: day.version }).toEqual({
      id: longDay.id,
      by: longDay.by,
      version: longDay.version,
    });
    expect(day.title).toBe('La longue journée');
    expect(day.story).toBe(
      `Semaine d’examens, et la bibliothèque est fermée${NBSP}: toute la promo de Juno révise au café, par vagues, de l’ouverture à la fermeture.`,
    );
    for (const key of ['title', 'story', 'hint'] as const) expect(day[key]).not.toBe(longDay[key]);
  });

  it('keeps each wave’s number, level and routines, and only its words change', () => {
    day.waves.forEach((fr, i) => {
      const en = longDay.waves[i];
      expect(fr.number).toBe(en.number);
      expect(fr.level).toBe(en.level);
      expect({ ...fr.lesson, note: '' }).toEqual({ ...en.lesson, note: '' });
      expect(fr.lesson.note).toBe(fr.adds);
      for (const key of ['hour', 'title', 'adds'] as const)
        expect(fr[key], `wave ${en.number} ${key}`).not.toBe(en[key]);
      for (const key of ['story', 'objective', 'concept'] as const)
        expect(fr.brief[key], `wave ${en.number} ${key}`).not.toBe(en.brief[key]);
    });
  });

  it('tells each wave’s scenes line for line, by the same speakers, with the same blocks and as many sounds', () => {
    day.waves.forEach((fr, i) => {
      const en = longDay.waves[i];
      for (const scene of ['intro', 'outro'] as const) {
        expect(fr[scene], `wave ${en.number} ${scene}`).toHaveLength(en[scene].length);
        fr[scene].forEach((line, k) => {
          const where = `wave ${en.number} ${scene} line ${k + 1}`;
          expect({ who: line.who, mood: line.mood }, where).toEqual({ who: en[scene][k].who, mood: en[scene][k].mood });
          expect(line.text, where).not.toBe(en[scene][k].text);
          expect(blocks(line.text), where).toEqual(blocks(en[scene][k].text));
          expect(sounds(line.text), where).toBe(sounds(en[scene][k].text));
        });
      }
    });
  });

  it('builds each goal around what the wave adds, and reminds of the waves before it after the first', () => {
    const [first, second] = day.waves;
    expect(first.brief.objective).toBe(
      `Servez chaque client et débarrassez chaque table. Nouveau dans cette vague${NBSP}: café et thé, le sucre compté, et de temps en temps deux boissons pour un client.`,
    );
    expect(second.brief.objective).toMatch(/^Servez chaque client.*vague\u00a0: certains prennent le leur à emporter/);
    expect(second.brief.objective).toMatch(/ Tout ce que demandaient les vagues d’avant revient aussi\.$/);
    expect(day.waves[4].adds).toContain(`à ${TOGETHER_SECONDS} secondes d’écart`);
    expect(day.waves[4].brief.concept).toContain(`dans les ${TOGETHER_SECONDS} secondes`);
  });

  it('names the next wave on the receipt in French, and thanks the café after the last', () => {
    expect(waveThanks(1, 'fr')).toBe(
      `Vague 1 sur 6 servie. Ensuite, à dix heures${NBSP}: certains prennent le leur à emporter, pour retourner en salle d’examen.`,
    );
    expect(waveThanks(2, 'fr')).toMatch(/^Vague 2 sur 6 servie\. Ensuite, à midi\u00a0: des clients pressés/);
    expect(waveThanks(6, 'fr')).toBe('Merci. Même table demain\u202f? Je plaisante. Enfin, presque.');
    expect(waveThanks(1, 'en')).toMatch(/^Wave 1 of 6 served\. Next, at ten o’clock: /);
  });
});
