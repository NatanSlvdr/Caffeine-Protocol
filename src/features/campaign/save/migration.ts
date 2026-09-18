import type { ProgressSave, RobotPrograms, Settings } from '@/domain/types';
import { migrateQuerySource } from '@/domain/program';
import { isRecord, isShiftIndex } from './validate';

/** Campaign starters injected by the caller so the save layer never imports data. */
export interface LessonCatalog {
  readonly length: number;
  readonly [index: number]: { readonly starter: string; readonly robotStarter?: RobotPrograms };
}

/** Migrate retired payment instructions without changing comments or other commands. */
function removeOrderCharge(source: string) {
  return source
    .split('\n')
    .filter((line) => line.trim() !== 'CHARGE ORDER')
    .join('\n');
}
/** Retire charging from saved floor routines while keeping comments and non-charging branches. */
function cleanFloor(source: string) {
  const lines = source.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== 'IF BATTERY < 40') continue;
    let depth = 1,
      end = i + 1,
      alternative = -1;
    for (; end < lines.length; end++) {
      const command = lines[end].trim();
      if (/^(IF |FUNCTION |EACH$)/.test(command)) depth++;
      if (command === 'ELSE' && depth === 1) alternative = end;
      if (command === 'END' && !--depth) break;
    }
    if (end < lines.length) lines.splice(i, end - i + 1, ...(alternative < 0 ? [] : lines.slice(alternative + 1, end)));
  }
  return lines.filter((line) => line.trim() !== 'CHARGE').join('\n');
}
const cleanQuery = (source: string) => migrateQuerySource(removeOrderCharge(source));
const cleanQueryMap = (programs: Record<string, string>) =>
  Object.fromEntries(Object.entries(programs).map(([shift, source]) => [shift, cleanQuery(source)]));

export { cleanFloor, cleanQuery };

function validateProgress(v: Record<string, unknown>, lessons: LessonCatalog): void {
  const index = (value: unknown): value is number => isShiftIndex(value, lessons.length);
  if (!index(v.selected) || !index(v.unlocked) || v.selected > v.unlocked || typeof v.complete !== 'boolean')
    throw new Error('Invalid campaign progress.');
  if (v.version === 1 && v.unlocked > 13) throw new Error('Invalid campaign progress.');
  if (v.version !== 1 && v.complete && v.unlocked !== lessons.length - 1) throw new Error('Invalid campaign progress.');
}

function validateMaps(v: Record<string, unknown>, lessons: LessonCatalog): void {
  const index = (value: unknown): value is number => isShiftIndex(value, lessons.length);
  for (const key of ['drafts', 'solutions', 'stars', 'story']) {
    const entries = v[key];
    if (!isRecord(entries)) throw new Error(`Missing ${key} data.`);
    for (const [k, value] of Object.entries(entries)) {
      if (!/^(0|[1-9]\d*)$/.test(k) || !index(Number(k)) || (v.version === 1 && Number(k) > 13))
        throw new Error('Invalid shift in save.');
      if ((key === 'drafts' || key === 'solutions') && (typeof value !== 'string' || value.length > 100_000))
        throw new Error('Invalid program in save.');
      if (key === 'stars' && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3))
        throw new Error('Invalid star count.');
      if (key === 'story' && typeof value !== 'boolean') throw new Error('Invalid story state.');
    }
  }
}

function validateSettingsMap(v: Record<string, unknown>): Settings {
  const settings = v.settings;
  if (!isRecord(settings)) throw new Error('Missing settings.');
  for (const k of ['volume', 'music', 'effects']) {
    const n = settings[k];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) throw new Error('Invalid audio setting.');
  }
  for (const k of ['reduced_motion', 'fullscreen'])
    if (typeof settings[k] !== 'boolean') throw new Error('Invalid display setting.');
  if (settings.pixel_art !== undefined && typeof settings.pixel_art !== 'boolean')
    throw new Error('Invalid display setting.');
  return {
    volume: settings.volume as number,
    music: settings.music as number,
    effects: settings.effects as number,
    reduced_motion: settings.reduced_motion as boolean,
    pixel_art: (settings.pixel_art as boolean | undefined) ?? true,
    fullscreen: settings.fullscreen as boolean,
  };
}

function validateRobotMaps(
  v: Record<string, unknown>,
  lessons: LessonCatalog,
): { robotDrafts: Record<string, RobotPrograms>; robotSolutions: Record<string, RobotPrograms> } {
  const index = (value: unknown): value is number => isShiftIndex(value, lessons.length);
  const robotMaps: { robotDrafts: Record<string, RobotPrograms>; robotSolutions: Record<string, RobotPrograms> } = {
    robotDrafts: {},
    robotSolutions: {},
  };
  if (v.version === 1)
    for (const [flat, mapped] of [
      ['drafts', 'robotDrafts'],
      ['solutions', 'robotSolutions'],
    ] as const)
      for (const [shift, query] of Object.entries(v[flat] as Record<string, string>))
        robotMaps[mapped][shift] = { query: cleanQuery(query), prep: '', floor: '' };
  else
    for (const key of ['robotDrafts', 'robotSolutions'] as const) {
      const entries = v[key];
      if (!isRecord(entries)) throw new Error(`Missing ${key} data.`);
      for (const [shift, programs] of Object.entries(entries)) {
        if (!/^\d+$/.test(shift) || !index(Number(shift)) || !isRecord(programs))
          throw new Error('Invalid robot program collection.');
        for (const role of ['query', 'prep', 'floor'])
          if (typeof programs[role] !== 'string' || programs[role].length > 100_000)
            throw new Error('Invalid robot source.');
        robotMaps[key][shift] = {
          query: cleanQuery(programs.query as string),
          prep: programs.prep as string,
          floor: cleanFloor(programs.floor as string),
        };
      }
    }
  return robotMaps;
}

function migrateLegacyVersion(
  v: Record<string, unknown>,
  robotMaps: { robotDrafts: Record<string, RobotPrograms>; robotSolutions: Record<string, RobotPrograms> },
  lessons: LessonCatalog,
): void {
  // Semantic-copy programs cannot be translated into the new token puzzles.
  // Preserve unlocks and other robots, but retire Query drafts, scores and story beats.
  if (v.version === 3) return;
  for (const key of ['robotDrafts', 'robotSolutions'] as const) {
    for (const [shift, programs] of Object.entries(robotMaps[key])) {
      if (key === 'robotSolutions' && Number(shift) < 14) delete robotMaps[key][shift];
      else programs.query = lessons[Number(shift)].starter;
    }
  }
  const keepLater = (entries: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(entries).filter(([shift]) => Number(shift) >= 14));
  v.drafts = {};
  v.solutions = {};
  v.stars = keepLater(v.stars as Record<string, unknown>);
  v.story = keepLater(v.story as Record<string, unknown>);
}

/** Validate an entire import before replacing anything in the active save. */
export function parseSave(text: string, lessons: LessonCatalog): ProgressSave {
  if (text.length > 2_000_000) throw new Error('This save is too large. Choose a Caffeine Protocol JSON export.');
  const v: unknown = JSON.parse(text);
  if (!isRecord(v) || (v.version !== 1 && v.version !== 2 && v.version !== 3))
    throw new Error('Unsupported save version. Your current café has been kept.');
  validateProgress(v, lessons);
  validateMaps(v, lessons);
  const settings = validateSettingsMap(v);
  const robotMaps = validateRobotMaps(v, lessons);
  migrateLegacyVersion(v, robotMaps, lessons);
  return {
    version: 3,
    ...robotMaps,
    selected: v.selected as number,
    unlocked: v.version === 1 && v.complete ? 14 : (v.unlocked as number),
    complete: v.version !== 1 && (v.complete as boolean),
    drafts: cleanQueryMap(v.drafts as Record<string, string>),
    solutions: cleanQueryMap(v.solutions as Record<string, string>),
    stars: { ...(v.stars as Record<string, number>) },
    story: { ...(v.story as Record<string, boolean>) },
    settings,
  };
}
