import { describe, expect, it } from 'vitest';
import {
  collectBuiltExtensionErrors,
  collectNarrativeErrors,
  collectSeedErrors,
  extensionAct,
  extensionActiveTables,
  extensionServiceForLevel,
  validateCampaign,
  validateExtensionSeedData,
  validateLessonData,
  validateLevelData,
  validateManifestData,
} from '../../../src/data/campaign/validate';
import { extensionSeeds } from '../../../src/data/campaign/extension-seeds';
import { campaignNarrative } from '../../../src/data/campaign/narrative';
import { extensionSeed } from '../../../src/data/campaign/generators/extensionCustomers';
import { extensionLessons, extensionLevels } from '../../../src/data/extension';
import { lessons, levels } from '../../../src/data';
import manifestData from '../../../src/data/campaign/manifest.json';
import type { LevelDefinition } from '../../../src/domain/types';

function customer(customerId: string, arrival: number, extra: Record<string, unknown> = {}) {
  return {
    customer_id: customerId,
    arrival,
    phrase: 'coffee',
    heard_orders: [{ tokens: ['coffee'] }],
    intent: {},
    expected: { item: 'coffee' },
    ...extra,
  };
}

function observationLevel(id = 'L01'): Record<string, unknown> {
  return {
    id,
    title: `Level ${Number(id.slice(1))}: Reopening`,
    summary: 'A calm opening shift.',
    programming_enabled: false,
    active_tables: 2,
    block_target: 0,
    instruction_target: 0,
    reference_block_count: 0,
    seeds: [
      { id: `${id}_A`, customers: [customer('C1', 0), customer('C2', 8)] },
      { id: `${id}_B`, customers: [customer('C1', 0)] },
    ],
  };
}

function programmableLevel(id = 'L03'): Record<string, unknown> {
  return {
    ...(observationLevel(id) as object),
    programming_enabled: true,
    active_tables: 3,
    block_target: 8,
    instruction_target: 14,
    reference_block_count: 6,
  };
}

describe('unified campaign validation', () => {
  it('accepts the shipped Act I and extension campaign without errors', () => {
    const actLevels = levels.slice(0, 14);
    const actLessons = lessons.slice(0, 14);
    for (const level of actLevels) expect(validateLevelData(level)).toEqual([]);
    for (const lesson of actLessons) expect(validateLessonData(lesson)).toEqual([]);
    expect(validateManifestData(manifestData)).toEqual([]);
    expect(collectNarrativeErrors(campaignNarrative)).toEqual([]);
    for (const seed of extensionSeeds) expect(validateExtensionSeedData(seed)).toEqual([]);
    expect(
      validateCampaign({
        manifestOrder: (manifestData as { order: string[] }).order,
        actLevels,
        actLessons,
        narrative: campaignNarrative,
        extensionSeeds,
      }),
    ).toEqual([]);
    extensionLevels.forEach((level, index) => {
      expect(validateLevelData(level)).toEqual([]);
      expect(validateLessonData(extensionLessons[index])).toEqual([]);
      expect(
        collectBuiltExtensionErrors({
          levelNumber: Number(extensionSeeds[index].id.slice(1)),
          level,
          lesson: extensionLessons[index],
          seed: extensionSeeds[index],
        }),
      ).toEqual([]);
    });
  });

  it('rejects bad table counts and worker capacities', () => {
    for (const activeTables of [0, 17, 1.5, -1]) {
      expect(validateLevelData({ ...programmableLevel(), active_tables: activeTables }).length).toBeGreaterThan(0);
    }
    const withService = (service: unknown) => validateLevelData({ ...programmableLevel(), service });
    expect(
      withService({ prepCapacity: 0, floorCapacity: 1, clearing: true, objective: 'serve' }).length,
    ).toBeGreaterThan(0);
    expect(
      withService({ prepCapacity: 1, floorCapacity: -1, clearing: true, objective: 'serve' }).length,
    ).toBeGreaterThan(0);
    expect(
      withService({ prepCapacity: 1.5, floorCapacity: 1, clearing: true, objective: 'serve' }).length,
    ).toBeGreaterThan(0);
    expect(
      withService({ prepCapacity: 1, floorCapacity: 1, clearing: true, objective: 'serve', minLoad: -1 }).length,
    ).toBeGreaterThan(0);
    expect(withService({ prepCapacity: 2, floorCapacity: 2, clearing: true, objective: 'serve', minLoad: 2 })).toEqual(
      [],
    );
  });

  it('rejects negative, fractional, and unordered arrivals', () => {
    const withCustomers = (customers: unknown[]) =>
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_A', customers }] });
    expect(withCustomers([customer('C1', -1)]).length).toBeGreaterThan(0);
    expect(withCustomers([customer('C1', 1.5)]).length).toBeGreaterThan(0);
    expect(withCustomers([customer('C1', 8), customer('C2', 0)]).length).toBeGreaterThan(0);
    expect(withCustomers([customer('C1', 0), customer('C2', 0)]).length).toBeGreaterThan(0);
    expect(withCustomers([customer('C1', 0), customer('C2', 8)] as unknown[])).toEqual([]);
  });

  it('rejects malformed and mismatched level/seed/customer ids', () => {
    expect(validateLevelData({ ...observationLevel(), id: 'X1' }).length).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L02_A', customers: [customer('C1', 0)] }] }).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_a', customers: [customer('C1', 0)] }] }).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_A', customers: [customer('X9', 0)] }] }).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_A', customers: [customer('C2', 0)] }] }).length,
    ).toBeGreaterThan(0);
    const dupCustomers = validateLevelData({
      ...observationLevel(),
      seeds: [{ id: 'L01_A', customers: [customer('C1', 0), customer('C1', 8)] }],
    });
    expect(dupCustomers.length).toBeGreaterThan(0);
    const dupSeeds = validateLevelData({
      ...observationLevel(),
      seeds: [
        { id: 'L01_A', customers: [customer('C1', 0)] },
        { id: 'L01_A', customers: [customer('C1', 0)] },
      ],
    });
    expect(dupSeeds.length).toBeGreaterThan(0);
  });

  it('rejects empty seeds and empty customer collections', () => {
    expect(validateLevelData({ ...observationLevel(), seeds: [] }).length).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_A', customers: [] }] }).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...observationLevel(), seeds: [{ id: 'L01_A', customers: [customer('C1', 0)] }] }),
    ).toEqual([]);
  });

  it('rejects invalid block and instruction targets', () => {
    expect(validateLevelData({ ...programmableLevel(), block_target: -1 }).length).toBeGreaterThan(0);
    expect(validateLevelData({ ...programmableLevel(), instruction_target: 2.5 }).length).toBeGreaterThan(0);
    expect(
      validateLevelData({ ...programmableLevel(), block_target: 5, reference_block_count: 6 }).length,
    ).toBeGreaterThan(0);
    expect(validateLevelData({ ...programmableLevel(), block_target: 0 }).length).toBeGreaterThan(0);
    expect(validateLevelData({ ...observationLevel(), block_target: 1 }).length).toBeGreaterThan(0);
  });

  it('requires clarification data exactly for ambiguous customers', () => {
    const ambiguous = (extra: Record<string, unknown>) =>
      customer('C1', 0, { heard_orders: [{ tokens: ['ambiguous'] }], ...extra });
    const seedWith = (customers: unknown[]) => ({ ...observationLevel(), seeds: [{ id: 'L01_A', customers }] });
    expect(validateLevelData(seedWith([ambiguous({})])).length).toBeGreaterThan(0);
    expect(
      validateLevelData(
        seedWith([
          ambiguous({
            clarification: 'coffee',
            clarification_heard_orders: [{ tokens: ['coffee'] }],
            expected: { item: 'coffee', ask_help: true },
          }),
        ]),
      ),
    ).toEqual([]);
    expect(
      validateLevelData(seedWith([customer('C1', 0, { expected: { item: 'coffee', ask_help: true } })])).length,
    ).toBeGreaterThan(0);
    expect(validateLevelData(seedWith([customer('C1', 0, { clarification: 'extra' })])).length).toBeGreaterThan(0);
    expect(
      validateLevelData(
        seedWith([
          customer('C1', 0, {
            heard_orders: [{ tokens: ['coffee', 'sugar', 'number'] }],
            expected: { item: 'coffee' },
          }),
        ]),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData(seedWith([customer('C1', 0, { heard_orders: [{ tokens: ['coffee'], number: 2 }] })])).length,
    ).toBeGreaterThan(0);
    expect(
      validateLevelData(seedWith([customer('C1', 0, { heard_orders: [{ tokens: ['ambiguous', 'coffee'] }] })])).length,
    ).toBeGreaterThan(0);
  });

  it('rejects incoherent expected tickets', () => {
    const seedWith = (expected: unknown, heard = [{ tokens: ['coffee'] }, { tokens: ['tea'] }]) =>
      validateLevelData({
        ...observationLevel(),
        seeds: [{ id: 'L01_A', customers: [customer('C1', 0, { heard_orders: heard, expected })] }],
      });
    expect(seedWith({ item: 'coffee', tickets: [{ item: 'tea' }] }).length).toBeGreaterThan(0);
    expect(seedWith({}).length).toBeGreaterThan(0);
    expect(seedWith({ tickets: [{ item: 'coffee' }] }).length).toBeGreaterThan(0);
    expect(seedWith({ item: 'coffee', with_sugar: true, sugar_count: 1 }).length).toBeGreaterThan(0);
    expect(seedWith({ item: 'coffee' }).length).toBeGreaterThan(0);
    expect(seedWith({ tickets: [{ item: 'coffee' }, { item: 'tea' }] })).toEqual([]);
  });

  it('rejects bad lessons, manifests, extension seeds, and narrative rows', () => {
    expect(validateLessonData({ solution: 'LISTEN', starter: 'LISTEN' }).length).toBeGreaterThan(0);
    expect(validateLessonData({ note: '', solution: 'LISTEN', starter: 'LISTEN' }).length).toBeGreaterThan(0);
    expect(validateManifestData({ version: 1, order: [] }).length).toBeGreaterThan(0);
    expect(validateManifestData({ version: 1, order: ['L01', 'L01'] }).length).toBeGreaterThan(0);
    expect(validateManifestData({ version: 0, order: ['L01'] }).length).toBeGreaterThan(0);
    expect(
      validateExtensionSeedData({ id: 'L15', title: 'T', note: 'N', omission: '', blocks: 55, instructions: 241 })
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateExtensionSeedData({ id: 'L15', title: 'T', note: 'N', omission: 'TAKE', blocks: 0, instructions: 241 })
        .length,
    ).toBeGreaterThan(0);
    expect(collectNarrativeErrors([]).length).toBeGreaterThan(0);
    expect(
      collectNarrativeErrors([
        { level: 1, title: 'A', story: 'S', objective: 'O', lessonNote: 'L' },
        { level: 1, title: 'B', story: 'S', objective: 'O', lessonNote: 'L' },
      ]).length,
    ).toBeGreaterThan(0);
  });

  it('rejects id correspondence breaks across lessons, levels, and narrative', () => {
    const actLevels = levels.slice(0, 14);
    const actLessons = lessons.slice(0, 14);
    const base = {
      manifestOrder: (manifestData as { order: string[] }).order,
      actLevels,
      actLessons,
      narrative: campaignNarrative,
      extensionSeeds,
    };
    const renamed = actLevels.map((level, index) =>
      index === 0 ? { ...level, title: 'Level 1: Something else' } : level,
    );
    expect(validateCampaign({ ...base, actLevels: renamed as LevelDefinition[] }).length).toBeGreaterThan(0);
    const renoted = actLessons.map((lesson, index) => (index === 0 ? { ...lesson, note: 'drift' } : lesson));
    expect(validateCampaign({ ...base, actLessons: renoted }).length).toBeGreaterThan(0);
    const dupSeeds = actLevels.map((level, index) => (index === 1 ? { ...level, seeds: actLevels[0].seeds } : level));
    expect(validateCampaign({ ...base, actLevels: dupSeeds as LevelDefinition[] }).length).toBeGreaterThan(0);
  });

  it('rejects generated extension customers that break seed invariants', () => {
    const generated = extensionSeed(15, 0);
    expect(collectSeedErrors(generated, 'L15')).toEqual([]);
    expect(collectSeedErrors(generated, 'L16').length).toBeGreaterThan(0);
    const shuffled = {
      ...generated,
      customers: [...generated.customers].reverse().map((c, i) => ({ ...c, customer_id: `C${i + 1}` })),
    };
    expect(collectSeedErrors(shuffled, 'L15').length).toBeGreaterThan(0);
  });

  it('rejects built extension shifts that drift from their seed row', () => {
    const index = extensionSeeds.findIndex((seed) => seed.id === 'L21');
    const seed = extensionSeeds[index];
    const level = extensionLevels[index];
    const lesson = extensionLessons[index];
    const levelNumber = 21;
    expect(collectBuiltExtensionErrors({ levelNumber, level, lesson, seed })).toEqual([]);
    expect(
      collectBuiltExtensionErrors({
        levelNumber,
        level: { ...level, active_tables: extensionActiveTables(levelNumber) + 1 },
        lesson,
        seed,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      collectBuiltExtensionErrors({
        levelNumber,
        level: { ...level, service: extensionServiceForLevel(15) },
        lesson,
        seed,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      collectBuiltExtensionErrors({ levelNumber, level: { ...level, act: extensionAct(25) }, lesson, seed }).length,
    ).toBeGreaterThan(0);
    expect(
      collectBuiltExtensionErrors({ levelNumber, level: { ...level, block_target: seed.blocks + 1 }, lesson, seed })
        .length,
    ).toBeGreaterThan(0);
  });
});
