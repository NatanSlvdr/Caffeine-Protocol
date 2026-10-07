import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { repairById, repairIn, repairOpen, repairs } from '../../../src/data/repairs';
import { repairsFr } from '../../../src/data/repairs.fr';
import { CAST_IDS } from '../../../src/domain/dialogue';
import { exampleHolds, firedActions, fires, wiringMends } from '../../../src/domain/repair';
import { UNLOCKS } from '../../../src/domain/unlocks';

const NBSP = '\u00a0';
const ids = (repair: (typeof repairs)[number]) => repair.actions.map((action) => action.id);

describe('the repair bench', () => {
  it('fires an action only when it is wired, and every terminal on it holds', () => {
    const on = new Set(['tea']);
    expect(fires([], on)).toBe(false);
    expect(fires([{ sensor: 'tea' }], on)).toBe(true);
    expect(fires([{ sensor: 'tea', not: true }], on)).toBe(false);
    expect(fires([{ sensor: 'sugar', not: true }], on)).toBe(true);
    expect(fires([{ sensor: 'tea' }, { sensor: 'sugar' }], on)).toBe(false);
  });

  it('asks for exactly the actions a case names, no more and no less', () => {
    const wiring = { coffee: [{ sensor: 'tea', not: true }], sugar: [{ sensor: 'sugar' }] };
    const example = { input: '“coffee”', sensors: [], actions: ['coffee'] };
    expect(firedActions(wiring, ['coffee', 'tea', 'sugar'], ['sugar'])).toEqual(['coffee', 'sugar']);
    expect(exampleHolds(wiring, ['coffee', 'tea', 'sugar'], example)).toBe(true);
    expect(exampleHolds(wiring, ['coffee', 'tea', 'sugar'], { ...example, sensors: ['sugar'] })).toBe(false);
    expect(exampleHolds({}, ['coffee'], example)).toBe(false);
  });

  it.each(repairs.map((repair) => [repair.id, repair] as const))(
    'has %s come broken, with a wiring that mends it',
    (_, repair) => {
      expect(wiringMends(repair.solution, ids(repair), repair.examples)).toBe(true);
      expect(wiringMends(repair.starter, ids(repair), repair.examples)).toBe(false);
      // Not one case left already right would be a puzzle with no foothold; every case right, none at all.
      const right = repair.examples.filter((example) => exampleHolds(repair.starter, ids(repair), example)).length;
      expect(right).toBeGreaterThan(0);
      expect(right).toBeLessThan(repair.examples.length);
      // Every action is asked for somewhere, and every case reads differently.
      for (const action of ids(repair)) expect(repair.examples.some((e) => e.actions.includes(action))).toBe(true);
      expect(new Set(repair.examples.map((e) => [...e.sensors].sort().join())).size).toBe(repair.examples.length);
    },
  );

  it('brings out one bench per robot, in campaign order, once the shift teaching its last sensor is served', () => {
    expect(repairs.map((repair) => repair.robot)).toEqual(['query', 'prep', 'floor']);
    expect(repairs.map((repair) => repair.opens)).toEqual([UNLOCKS.sugar, UNLOCKS.prepSugar, UNLOCKS.clearing]);
    for (const repair of repairs) expect(repair.opens).toBeLessThanOrEqual(levels.length);
    const query = repairById('query')!;
    const served = (shifts: number) => ({
      stars: Object.fromEntries(Array.from({ length: shifts }, (_, i) => [i, 1])),
    });
    expect(repairOpen(served(query.opens - 1), query)).toBe(false);
    expect(repairOpen(served(query.opens), query)).toBe(true);
  });

  it('closes each panel on a scene with only Niko and the robot, ending on its mend', () => {
    for (const repair of repairs) {
      const speakers = new Set(repair.scene.map((each) => each.who).filter(Boolean));
      expect([...speakers].sort()).toEqual(['niko', repair.id].sort());
      for (const who of speakers) expect(CAST_IDS).toContain(who);
    }
  });
});

describe('the repair bay in French', () => {
  it('tells every bench the English does, and none it doesn’t', () => {
    expect(Object.keys(repairsFr)).toEqual(repairs.map((repair) => repair.id));
  });

  it.each(repairs.map((repair) => [repair.id, repair] as const))(
    '%s: says every sensor, action, case and line, on the same board',
    (_, en) => {
      const told = repairsFr[en.id];
      expect(Object.keys(told.sensors)).toEqual(en.sensors.map((sensor) => sensor.id));
      expect(Object.keys(told.actions)).toEqual(ids(en));
      expect(told.examples).toHaveLength(en.examples.length);
      expect(told.scene).toHaveLength(en.scene.length);
      const fr = repairIn(en, 'fr');
      // Only the words change: the wiring, what each case reads and asks for, and who speaks are the same.
      expect(fr.starter).toBe(en.starter);
      expect(fr.solution).toBe(en.solution);
      expect(fr.examples.map(({ sensors, actions }) => ({ sensors, actions }))).toEqual(
        en.examples.map(({ sensors, actions }) => ({ sensors, actions })),
      );
      expect(fr.scene.map(({ who, mood }) => ({ who, mood }))).toEqual(
        en.scene.map(({ who, mood }) => ({ who, mood })),
      );
      expect(new Set(fr.examples.map((example) => example.input)).size).toBe(en.examples.length);
      for (const [index, line] of fr.scene.entries())
        expect((line.text.match(/\*[^*]+\*/g) ?? []).length, `line ${index + 1}`).toBe(
          (en.scene[index].text.match(/\*[^*]+\*/g) ?? []).length,
        );
      expect(repairIn(en, 'en')).toBe(en);
      expect(repairIn(en, 'fr')).toBe(fr);
    },
  );

  it('keeps the words Query hears as the guest says them, in French quotation marks', () => {
    const query = repairIn(repairById('query')!, 'fr');
    expect(query.sensors[0].is).toBe(`entend «${NBSP}tea${NBSP}»`);
    expect(query.examples.at(-1)!.input).toBe(`«${NBSP}tea without sugar${NBSP}»`);
    expect(query.fault).toContain(`n’importe comment${NBSP}: il écrit`);
  });
});
