import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildExtensionLesson,
  buildExtensionLevel,
  referenceBlockCount,
  referencePrograms,
} from '../../../src/data/extension';
import { lessons } from '../../../src/data';
import { extensionSeeds } from '../../../src/data/campaign/extension-seeds';
import type { LevelSeed } from '../../../src/data/campaign/extension-seeds';
import { extensionShiftConfig } from '../../../src/data/campaign/extension-config';
import { extensionSeed } from '../../../src/data/campaign/generators/extensionCustomers';
import { campaignNarrative } from '../../../src/data/campaign/narrative';
import type { ShiftNarrative } from '../../../src/data/campaign/narrative';
import { compileProgram } from '../../../src/domain/program';
import { countProgramBlocks } from '../../../src/domain/scoring';
import { compileRobot } from '../../../src/domain/robotProgram';
import { runLevel } from '../../../src/domain/simulation';
import { completeLevel, newSave, parseSave } from '../../../src/features/campaign/save/persistence';
import type { LessonCatalog } from '../../../src/features/campaign/save/migration';

/** A synthetic L33 proves new shifts are data-only: builders derive everything. */
const seed33: LevelSeed = {
  id: 'L33',
  title: 'The whole café is busier',
  note: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing at full volume.',
  omission: 'SERVE',
  blocks: 420,
  instructions: 5200,
};
/** The one narrative row L33 would add alongside its seed. */
const narrative33: ShiftNarrative = {
  level: 33,
  title: 'The whole café is busier',
  story: 'Another busy day. The team runs the full service at full volume.',
  objective: 'Complete the service: grouped orders, both drinks, sugar, clarification, deliveries, and clearing.',
  lessonNote:
    'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing at full volume.',
};

describe('extension seeds', () => {
  it('derives a playable L33 from one seed plus one narrative row', () => {
    const level = buildExtensionLevel(seed33);
    expect(level.id).toBe('L33');
    expect(level.title).toBe('Level 33: The whole café is busier');
    expect(level.block_target).toBe(420);
    expect(level.instruction_target).toBe(5200);
    expect(level.seeds).toHaveLength(3);
    expect(level.seeds[0].id).toBe('L33_A');
    const lesson = buildExtensionLesson(seed33);
    expect(lesson.note).toBe(seed33.note);
    expect(lesson.robotStarter.floor).toContain('# TODO: SERVE');
    const programs = referencePrograms(33);
    const result = runLevel(level, compileProgram(programs.query), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed).toBe(true);
  });
  it('keeps an L32-complete save importable after appending L33', () => {
    const final = lessons.length - 1;
    const l32Complete = completeLevel(newSave(), final, 3, '', lessons);
    expect(l32Complete.complete).toBe(true);
    expect(l32Complete.unlocked).toBe(final);
    // Synthetic 33-shift catalog: every existing shift plus one appended finale.
    const catalog33: LessonCatalog = {
      ...lessons,
      length: lessons.length + 1,
      [lessons.length]: { starter: lessons[final].starter },
    };
    const restored = parseSave(JSON.stringify(l32Complete), catalog33);
    expect(restored.stars).toEqual(l32Complete.stars);
    expect(restored.solutions).toEqual(l32Complete.solutions);
    expect(restored.drafts).toEqual(l32Complete.drafts);
    expect(restored.complete).toBe(true);
    expect(restored.selected).toBe(l32Complete.selected);
    // L33 becomes the next playable shift while earlier progress is preserved.
    expect(restored.unlocked).toBe(lessons.length);
    const finale = completeLevel(restored, lessons.length, 3, '', catalog33);
    expect(finale.complete).toBe(true);
    expect(finale.unlocked).toBe(lessons.length);
  });

  it('measures reference_block_count from the reference programs, not the star target', () => {
    for (const seed of extensionSeeds) {
      const levelNumber = Number(seed.id.slice(1));
      const level = buildExtensionLevel(seed);
      const programs = referencePrograms(levelNumber);
      const queryBlocks = programs.query
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#')).length;
      // Same counter the scorer uses for player programs.
      expect(level.reference_block_count).toBe(countProgramBlocks(programs, queryBlocks, levelNumber));
      expect(level.reference_block_count).toBe(referenceBlockCount(levelNumber));
      // The star target keeps a margin above the measured reference.
      expect(level.reference_block_count).toBeLessThanOrEqual(level.block_target);
    }
  });

  it('keeps L15-L32 mechanics identical through the shared config', () => {
    expect(extensionShiftConfig(15)).toEqual({
      customers: 2,
      arrivalGap: 10,
      prepBatch: 1,
      floorBatch: 1,
      tables: 1,
      minLoad: 0,
      tea: false,
      sugar: false,
      fullHouse: false,
      finale: false,
    });
    expect(extensionShiftConfig(20)).toMatchObject({ customers: 2, tea: true, sugar: true, prepBatch: 1 });
    expect(extensionShiftConfig(21)).toMatchObject({ customers: 4, prepBatch: 2, minLoad: 2 });
    expect(extensionShiftConfig(22).minLoad).toBe(0);
    expect(extensionShiftConfig(24)).toMatchObject({ tables: 2 });
    expect(extensionShiftConfig(29)).toMatchObject({ customers: 8, floorBatch: 2, tables: 4, minLoad: 2 });
    expect(extensionShiftConfig(30).minLoad).toBe(0);
    expect(extensionShiftConfig(31)).toMatchObject({
      customers: 12,
      arrivalGap: 4,
      tables: 16,
      fullHouse: true,
      finale: false,
    });
    expect(extensionShiftConfig(32)).toMatchObject({ finale: true, fullHouse: true });
    expect(extensionShiftConfig(33)).toEqual(extensionShiftConfig(32));
    expect(extensionSeed(30, 0).customers[1].arrival).toBe(10);
    expect(extensionSeed(31, 0).customers[1].arrival).toBe(4);
    expect(extensionSeed(31, 0).customers[0].expected.ask_help).toBeUndefined();
    expect(extensionSeed(32, 0).customers[0].expected.ask_help).toBe(true);
    expect(extensionSeed(33, 0).customers[0].expected.ask_help).toBe(true);
  });

  it('carries a synthetic L33 through assembly, narrative, save, docs, reference, and sim', () => {
    // Assembly: one seed derives the full shift with finale mechanics.
    const level = buildExtensionLevel(seed33);
    expect(level.seeds.map((s) => s.id)).toEqual(['L33_A', 'L33_B', 'L33_C']);
    expect(level.active_tables).toBe(16);
    expect(level.service).toEqual({
      prepCapacity: 2,
      floorCapacity: 2,
      clearing: true,
      objective: 'serve',
      minLoad: 0,
    });
    expect(level.act).toBe(4);
    const lesson = buildExtensionLesson(seed33);
    expect(lesson.robotStarter.floor).toContain('# TODO: SERVE');

    // Narrative: every extension seed (plus synthetic L33) pairs with a narrative row.
    for (const seed of extensionSeeds)
      expect(campaignNarrative.map((n) => n.level)).toContain(Number(seed.id.slice(1)));
    const narrativeLevels = [...campaignNarrative.map((n) => n.level), narrative33.level];
    for (const id of [...extensionSeeds.map((s) => s.id), seed33.id])
      expect(narrativeLevels).toContain(Number(id.slice(1)));

    // Save: validation follows the injected catalog length, so an L33 save
    // round-trips with the extended catalog and is rejected by the stock one.
    const extendedLessons = [...lessons, lesson];
    let save = newSave();
    save = completeLevel(save, extendedLessons.length - 1, 3, lesson.solution, extendedLessons);
    expect(save.unlocked).toBe(extendedLessons.length - 1);
    expect(save.complete).toBe(true);
    expect(parseSave(JSON.stringify(save), extendedLessons)).toEqual(save);
    expect(() => parseSave(JSON.stringify(save), lessons)).toThrow();

    // Docs: docs-gen reads extension-config.json with no seed-count gate, and the
    // generated table matches the shared config for every shift including L33.
    const docsGenSrc = readFileSync(join(process.cwd(), 'tools/docs-gen.mjs'), 'utf8');
    expect(docsGenSrc).toContain('extension-config.json');
    expect(docsGenSrc).not.toMatch(/expected 18 extension seeds|!== 18/);
    const readme = readFileSync(join(process.cwd(), 'docs/campaign/README.md'), 'utf8');
    expect(readme.split('\n').filter((line) => line.startsWith('| L')).length).toBe(14 + extensionSeeds.length);
    for (const seed of extensionSeeds) {
      const tables = extensionShiftConfig(Number(seed.id.slice(1))).tables;
      expect(readme).toContain(`| ${seed.id} | ${seed.title} | ${tables} | 3 |`);
    }
    expect(extensionShiftConfig(33).tables).toBe(16);

    // Reference: the generated L33 routines compile unlocked at full volume.
    const programs = referencePrograms(33);
    expect(compileProgram(programs.query).compile_error).toBe('');
    expect(compileRobot(programs.prep, 'prep', 33).compile_error).toBe('');
    expect(compileRobot(programs.floor, 'floor', 33).compile_error).toBe('');
    expect(programs.prep.split('\n').filter((line) => line === 'WAIT TICKET')).toHaveLength(2);
    expect(programs.floor).toContain('IF TABLE 16');

    // Sim: the reference clears every synthetic seed.
    const result = runLevel(level, compileProgram(programs.query), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed).toBe(true);
    expect(result.passed_seeds).toBe(3);
  });
});
