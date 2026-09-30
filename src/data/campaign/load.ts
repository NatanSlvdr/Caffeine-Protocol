// Prologue and Act I campaign content. Generated file list; run no scripts to edit, only to re-split.
import manifestData from './manifest.json' with { type: 'json' };
import levelL01 from './levels/L01.json' with { type: 'json' };
import levelL02 from './levels/L02.json' with { type: 'json' };
import levelL03 from './levels/L03.json' with { type: 'json' };
import levelL04 from './levels/L04.json' with { type: 'json' };
import levelL05 from './levels/L05.json' with { type: 'json' };
import levelL06 from './levels/L06.json' with { type: 'json' };
import levelL07 from './levels/L07.json' with { type: 'json' };
import levelL08 from './levels/L08.json' with { type: 'json' };
import lessonL01 from './lessons/L01.json' with { type: 'json' };
import lessonL02 from './lessons/L02.json' with { type: 'json' };
import lessonL03 from './lessons/L03.json' with { type: 'json' };
import lessonL04 from './lessons/L04.json' with { type: 'json' };
import lessonL05 from './lessons/L05.json' with { type: 'json' };
import lessonL06 from './lessons/L06.json' with { type: 'json' };
import lessonL07 from './lessons/L07.json' with { type: 'json' };
import lessonL08 from './lessons/L08.json' with { type: 'json' };
import * as v from 'valibot';
import type { LevelDefinition } from '../../domain/types';
import { ManifestSchema } from './schema';
import type { Lesson } from './schema';
import { validateLessonData, validateLevelData, validateManifestData } from './validate';

const levelFiles: Record<string, unknown> = {
  L01: levelL01,
  L02: levelL02,
  L03: levelL03,
  L04: levelL04,
  L05: levelL05,
  L06: levelL06,
  L07: levelL07,
  L08: levelL08,
};
const lessonFiles: Record<string, unknown> = {
  L01: lessonL01,
  L02: lessonL02,
  L03: lessonL03,
  L04: lessonL04,
  L05: lessonL05,
  L06: lessonL06,
  L07: lessonL07,
  L08: lessonL08,
};

const manifest = v.parse(ManifestSchema, manifestData);
const manifestErrors = validateManifestData(manifestData);
if (manifestErrors.length) throw new Error(`Invalid campaign manifest: ${manifestErrors[0]}`);
if (manifest.order.some((id) => !(id in levelFiles) || !(id in lessonFiles)))
  throw new Error(`Campaign manifest references a missing shift file: ${manifest.order.join(',')}`);

function loadLevel(id: string): LevelDefinition {
  const errors = validateLevelData(levelFiles[id]);
  if (errors.length) throw new Error(`Invalid campaign level ${id}: ${errors[0]}`);
  return levelFiles[id] as LevelDefinition;
}

function loadLesson(id: string): Lesson {
  const errors = validateLessonData(lessonFiles[id]);
  if (errors.length) throw new Error(`Invalid campaign lesson ${id}: ${errors[0]}`);
  return lessonFiles[id] as Lesson;
}

/** Prologue and Act I levels and lessons in manifest order; every file is schema-validated, never cast. */
export const levels: LevelDefinition[] = manifest.order.map(loadLevel);
export const lessons: Lesson[] = manifest.order.map(loadLesson);

/** Lesson lookup by shift id (for example L08 or L02), replacing positional indexing. */
export function lessonById(id: string): Lesson {
  const found = manifest.order.indexOf(id);
  if (found < 0) throw new Error(`Unknown campaign shift: ${id}`);
  return lessons[found];
}
