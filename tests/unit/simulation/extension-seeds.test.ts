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

/** A synthetic L22 proves new shifts are data-only: builders derive everything. */
const seed22: LevelSeed = {
  id: 'L22',
  title: 'The whole café is busier',
  note: 'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing at full volume.',
  omission: 'DEPOSIT UP',
  blocks: 420,
  instructions: 5200,
};
/** The one narrative row L22 would add alongside its seed. */
const narrative22: ShiftNarrative = {
  level: 22,
  title: 'The whole café is busier',
  story: 'Another busy day. The team runs the full service at full volume.',
  objective: 'Complete the service: grouped orders, both drinks, sugar, clarification, deliveries, and clearing.',
  hint: 'Everything, at full volume.',
  concept: 'Nothing new: every idea so far, at a busier pace.',
  lessonNote:
    'The final service combines groups, clarification, both recipes, sugar, two-item trays, and clearing at full volume.',
};

describe('extension seeds', () => {
  it('derives a playable L22 from one seed plus one narrative row', () => {
    const level = buildExtensionLevel(seed22);
    expect(level.id).toBe('L22');
    expect(level.title).toBe('Level 22: The whole café is busier');
    expect(level.block_target).toBe(420);
    expect(level.instruction_target).toBe(5200);
    expect(level.seeds).toHaveLength(3);
    expect(level.seeds[0].id).toBe('L22_A');
    const lesson = buildExtensionLesson(seed22);
    expect(lesson.note).toBe(seed22.note);
    expect(lesson.robotStarter.floor).toContain('# TODO: DEPOSIT UP');
    const programs = referencePrograms(22);
    const result = runLevel(level, compileProgram(programs.query), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed).toBe(true);
  });
  it('keeps an L21-complete save importable after appending L22', () => {
    const final = lessons.length - 1;
    const l21Complete = completeLevel(newSave(), final, 3, '', lessons);
    expect(l21Complete.complete).toBe(true);
    expect(l21Complete.unlocked).toBe(final);
    // Synthetic 22-shift catalog: every existing shift plus one appended finale.
    const catalog22: LessonCatalog = {
      ...lessons,
      length: lessons.length + 1,
      [lessons.length]: { starter: lessons[final].starter },
    };
    const restored = parseSave(JSON.stringify(l21Complete), catalog22);
    expect(restored.stars).toEqual(l21Complete.stars);
    expect(restored.solutions).toEqual(l21Complete.solutions);
    expect(restored.drafts).toEqual(l21Complete.drafts);
    expect(restored.complete).toBe(false);
    expect(restored.selected).toBe(l21Complete.selected);
    // L22 becomes the next playable shift while earlier progress is preserved.
    expect(restored.unlocked).toBe(lessons.length);
    expect(parseSave(JSON.stringify(restored), catalog22)).toEqual(restored);
    const finale = completeLevel(restored, lessons.length, 3, '', catalog22);
    expect(finale.complete).toBe(true);
    expect(finale.unlocked).toBe(lessons.length);
    expect(parseSave(JSON.stringify(finale), catalog22)).toEqual(finale);
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

  it('keeps L09-L21 mechanics identical through the shared config', () => {
    expect(extensionShiftConfig(9)).toEqual({
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
      toGo: false,
      cups: 0,
      rush: false,
      closing: false,
    });
    expect(extensionShiftConfig(12)).toMatchObject({ customers: 2, tea: true, sugar: true, prepBatch: 1 });
    expect(extensionShiftConfig(13)).toMatchObject({ customers: 4, prepBatch: 2, minLoad: 2 });
    expect(extensionShiftConfig(14)).toMatchObject({ tables: 2, minLoad: 0 });
    expect(extensionShiftConfig(16)).toMatchObject({ customers: 8, floorBatch: 2, tables: 4, minLoad: 2 });
    expect(extensionShiftConfig(17)).toMatchObject({
      customers: 12,
      arrivalGap: 4,
      tables: 16,
      fullHouse: true,
      finale: false,
    });
    expect(extensionShiftConfig(17)).toMatchObject({ toGo: true, cups: 0, rush: false, closing: false });
    expect(extensionShiftConfig(18)).toMatchObject({ toGo: false, cups: 4, rush: false, closing: false });
    expect(extensionShiftConfig(19)).toMatchObject({ toGo: false, cups: 0, rush: true, closing: false });
    expect(extensionShiftConfig(20)).toMatchObject({ toGo: false, cups: 0, rush: false, closing: true });
    expect(extensionShiftConfig(21)).toMatchObject({
      finale: true,
      fullHouse: true,
      toGo: true,
      cups: 4,
      rush: true,
      closing: true,
    });
    expect(extensionShiftConfig(22)).toEqual(extensionShiftConfig(21));
    expect(extensionSeed(16, 0).customers[1].arrival).toBe(10);
    expect(extensionSeed(17, 0).customers[1].arrival).toBe(4);
    expect(extensionSeed(17, 0).customers[0].expected.ask_help).toBeUndefined();
    expect(extensionSeed(21, 0).customers[0].expected.ask_help).toBe(true);
    expect(extensionSeed(22, 0).customers[0].expected.ask_help).toBe(true);
  });

  it('carries a synthetic L22 through assembly, narrative, save, docs, reference, and sim', () => {
    // Assembly: one seed derives the full shift with finale mechanics.
    const level = buildExtensionLevel(seed22);
    expect(level.seeds.map((s) => s.id)).toEqual(['L22_A', 'L22_B', 'L22_C']);
    expect(level.active_tables).toBe(16);
    expect(level.service).toEqual({
      prepCapacity: 2,
      floorCapacity: 2,
      clearing: true,
      objective: 'serve',
      minLoad: 0,
      cups: 4,
      closing: true,
    });
    expect(level.act).toBe(4);
    const lesson = buildExtensionLesson(seed22);
    expect(lesson.robotStarter.floor).toContain('# TODO: DEPOSIT UP');

    // Narrative: every extension seed (plus synthetic L22) pairs with a narrative row.
    for (const seed of extensionSeeds)
      expect(campaignNarrative.map((n) => n.level)).toContain(Number(seed.id.slice(1)));
    const narrativeLevels = [...campaignNarrative.map((n) => n.level), narrative22.level];
    for (const id of [...extensionSeeds.map((s) => s.id), seed22.id])
      expect(narrativeLevels).toContain(Number(id.slice(1)));

    // Save: validation follows the injected catalog length, so an L22 save
    // round-trips with the extended catalog and is rejected by the stock one.
    const extendedLessons = [...lessons, lesson];
    let save = newSave();
    save = completeLevel(save, extendedLessons.length - 1, 3, lesson.solution, extendedLessons);
    expect(save.unlocked).toBe(extendedLessons.length - 1);
    expect(save.complete).toBe(true);
    expect(parseSave(JSON.stringify(save), extendedLessons)).toEqual(save);
    expect(() => parseSave(JSON.stringify(save), lessons)).toThrow();

    // Docs: docs-gen reads extension-config.json with no seed-count gate, and the
    // generated table matches the shared config for every shift including L22.
    const docsGenSrc = readFileSync(join(process.cwd(), 'tools/docs-gen.mjs'), 'utf8');
    expect(docsGenSrc).toContain('extension-config.json');
    expect(docsGenSrc).not.toMatch(/expected 18 extension seeds|!== 18/);
    const readme = readFileSync(join(process.cwd(), 'docs/campaign/README.md'), 'utf8');
    expect(readme.split('\n').filter((line) => line.startsWith('| L')).length).toBe(lessons.length);
    for (const seed of extensionSeeds) {
      const tables = extensionShiftConfig(Number(seed.id.slice(1))).tables;
      expect(readme).toContain(`| ${seed.id} | ${seed.title} | ${tables} | 3 |`);
    }
    expect(extensionShiftConfig(22).tables).toBe(16);

    // Reference: the generated L22 routines compile unlocked at full volume.
    const programs = referencePrograms(22);
    expect(compileProgram(programs.query).compile_error).toBe('');
    expect(compileRobot(programs.prep, 'prep', 22).compile_error).toBe('');
    expect(compileRobot(programs.floor, 'floor', 22).compile_error).toBe('');
    // Act IV references make and serve one drink at a time.
    expect(programs.prep.split('\n').filter((line) => line === 'LISTEN')).toHaveLength(1);
    expect(programs.floor).toContain('MOVE var1');

    // Sim: the reference clears every synthetic seed.
    const result = runLevel(level, compileProgram(programs.query), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed).toBe(true);
    expect(result.passed_seeds).toBe(3);
  });
});
