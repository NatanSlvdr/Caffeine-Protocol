import { describe, expect, it } from 'vitest';
import { drillIn, drills, drillsIn } from '../../../src/data/drills';
import { drillsFr, flightsFr, kitsFr, predictionsFr } from '../../../src/data/drills.fr';
import { flightIn, flights } from '../../../src/data/flights';
import { kitIn, kits } from '../../../src/data/kits';
import { predictionIn, predictions } from '../../../src/data/predictions';

const NBSP = ' ';
const NARROW = ' ';

describe('the drills in French', () => {
  it('tells every drill, moment, kit and flight the English does, and none it doesn’t', () => {
    expect(Object.keys(drillsFr)).toEqual(drills.map((each) => each.id));
    expect(Object.keys(predictionsFr)).toEqual(predictions.map((each) => each.id));
    expect(Object.keys(kitsFr)).toEqual(kits.map((each) => each.id));
    expect(Object.keys(flightsFr)).toEqual(flights.map((each) => each.id));
  });

  it('changes only the words: the gaps, choices, moments, tiles and flights’ drills are the same', () => {
    for (const drill of drills) {
      const fr = drillIn(drill, 'fr');
      expect({ ...fr, title: '', question: '', idea: '' }).toEqual({ ...drill, title: '', question: '', idea: '' });
      expect(fr.title).not.toBe(drill.title);
      expect(drillIn(drill, 'en')).toBe(drill);
    }
    for (const moment of predictions)
      expect({ ...predictionIn(moment, 'fr'), title: '', why: '' }).toEqual({ ...moment, title: '', why: '' });
    for (const kit of kits) {
      const fr = kitIn(kit, 'fr');
      expect({ ...fr, title: '', question: '', rule: '', idea: '' }).toEqual({
        ...kit,
        title: '',
        question: '',
        rule: '',
        idea: '',
      });
      // A kit leaves out the same block, named as the blocks are everywhere.
      expect(fr.rule).toBe(kit.rule.replace('No', 'Sans'));
    }
    for (const flight of flights) expect(flightIn(flight, 'fr').items).toBe(flight.items);
  });

  it('sets the French with French typography, and gives Help the same list each time', () => {
    const first = drillIn(drills[0], 'fr');
    expect(first.question).toBe(
      `Query écrit chaque commande sur un ticket. Dans quel ordre vont ces deux blocs${NARROW}?`,
    );
    expect(
      drillIn(
        drills.find((each) => each.id === 'without-sugar')!,
        'fr',
      ).title,
    ).toBe('Sans, c’est aucun');
    expect(predictionIn(predictions[0], 'fr').why).toMatch(new RegExp(`^Le client a dit «${NBSP}tea${NBSP}», donc`));
    expect(drillsIn('fr')).toBe(drillsIn('fr'));
    expect(drillsIn('fr')[0]).toBe(first);
    expect(drillsIn('en')).toBe(drills);
  });
});
