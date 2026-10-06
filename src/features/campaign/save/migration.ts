import type { DialoguePace, ProgressSave, RobotPrograms, Settings, SpecialProgress } from '@/domain/types';
import { CHALLENGE_MEASURES, type ChallengeMeasure } from '@/domain/challenges';
import { DIALOGUE_PACES, MAX_PLAYBACK_SPEED } from '@/domain/constants';
import { count } from '@/domain/tickets';
import { migrateQuerySource } from '@/domain/program';
import { migrateRobotSource } from '@/domain/robotProgram';
import { isRecord, isShiftIndex } from './validate';
import { untouched } from './settings';

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

/** v1–v3 saves were written against the 32-shift campaign; v4 against the 21-shift one. */
const LEGACY_SHIFTS = 32;
/**
 * For each shift of the 21-shift campaign, the 32-shift shift that played the same way, if any.
 * A legacy save keeps stars and programs only for these, and has served a new shift once it
 * served its counterpart. Act IV is new, so it has none.
 */
// prettier-ignore
const LEGACY_COUNTERPARTS: readonly (number | undefined)[] = [
  0, // Prologue
  2, 3, 4, 6, 8, 9, 10, // Act I, Query
  16, 17, 18, 19, 20, // Act II, Brew
  23, 25, 28, // Act III, Porter
  undefined, undefined, undefined, undefined, undefined, // Act IV
];
/**
 * What each saved map holds, in the words a damaged import names it with.
 * importProblem in SettingsWindow shows these messages to the player.
 */
const SAVED_PART: Record<string, string> = {
  drafts: 'routine drafts',
  solutions: 'served routines',
  robotDrafts: 'routine drafts',
  robotSolutions: 'served routines',
  stars: 'star tally',
  story: 'story progress',
  challenges: 'challenges met',
  drills: 'drills done',
  specials: 'specials',
};
/** Scenes are stored under the shift they open; these are the same scenes in the 32-shift campaign. */
const LEGACY_SCENES: Record<string, number> = { 0: 0, 2: 1, 14: 8, 21: 12, 22: 13, 30: 16 };

function validateProgress(v: Record<string, unknown>, shifts: number): void {
  const index = (value: unknown): value is number => isShiftIndex(value, shifts);
  if (!index(v.selected) || !index(v.unlocked) || v.selected > v.unlocked || typeof v.complete !== 'boolean')
    throw new Error('Invalid campaign progress.');
  if (v.version === 1 && v.unlocked > 13) throw new Error('Invalid campaign progress.');
  // A completed save must have earned stars on its final unlocked shift. This
  // also validates saves completed against a shorter catalog before migration.
  if (v.version !== 1 && v.complete) {
    const stars = v.stars;
    if (!isRecord(stars)) throw new Error('Invalid campaign progress.');
    const earned = stars[String(v.unlocked)];
    if (typeof earned !== 'number' || !Number.isInteger(earned) || earned < 0 || earned > 3)
      throw new Error('Invalid campaign progress.');
  }
}

function validateMaps(v: Record<string, unknown>, shifts: number): void {
  const index = (value: unknown): value is number => isShiftIndex(value, shifts);
  for (const key of ['drafts', 'solutions', 'stars', 'story']) {
    const entries = v[key];
    if (!isRecord(entries)) throw new Error(`Missing ${SAVED_PART[key]}.`);
    for (const [k, value] of Object.entries(entries)) {
      if (!/^(0|[1-9]\d*)$/.test(k) || !index(Number(k)) || (v.version === 1 && Number(k) > 13))
        throw new Error('Invalid shift number.');
      if ((key === 'drafts' || key === 'solutions') && (typeof value !== 'string' || value.length > 100_000))
        throw new Error('Invalid routine.');
      if (key === 'stars' && (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3))
        throw new Error('Invalid star count.');
      if (key === 'story' && typeof value !== 'boolean') throw new Error('Invalid story progress.');
    }
  }
}

/**
 * The optional challenges met on each shift: known measures, each once. Only a v4 café can have met any; a shift with
 * none met leaves no entry, and a café with none at all leaves the map out.
 */
function validateChallenges(
  v: Record<string, unknown>,
  shifts: number,
): Record<string, ChallengeMeasure[]> | undefined {
  if (v.challenges === undefined || v.version !== 4) return undefined;
  const entries = v.challenges;
  if (!isRecord(entries)) throw new Error(`Invalid ${SAVED_PART.challenges}.`);
  const kept: Record<string, ChallengeMeasure[]> = {};
  for (const [k, measures] of Object.entries(entries)) {
    if (!/^(0|[1-9]\d*)$/.test(k) || !isShiftIndex(Number(k), shifts)) throw new Error('Invalid shift number.');
    const known = (measure: unknown): measure is ChallengeMeasure =>
      CHALLENGE_MEASURES.includes(measure as ChallengeMeasure);
    if (!Array.isArray(measures) || !measures.every(known) || new Set(measures).size !== measures.length)
      throw new Error(`Invalid ${SAVED_PART.challenges}.`);
    if (measures.length) kept[k] = [...measures];
  }
  return Object.keys(kept).length ? kept : undefined;
}

/**
 * The drills got right on the first pick: ids, each once. Ids no longer in the game are kept, harmlessly, so a café
 * moved between versions loses nothing; a café with none leaves the list out.
 */
function validateDrills(v: Record<string, unknown>): string[] | undefined {
  if (v.drills === undefined || v.version !== 4) return undefined;
  const ids = v.drills;
  const id = (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,47}$/.test(value);
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(id) || new Set(ids).size !== ids.length)
    throw new Error(`Invalid ${SAVED_PART.drills}.`);
  return ids.length ? [...(ids as string[])] : undefined;
}

/**
 * Each special's own progress: its routines, stars and challenges met. Specials no longer in the game are kept,
 * harmlessly, like drills; a special with nothing kept leaves no entry, and a café with none leaves the map out.
 */
function validateSpecials(v: Record<string, unknown>): Record<string, SpecialProgress> | undefined {
  if (v.specials === undefined || v.version !== 4) return undefined;
  const entries = v.specials;
  if (!isRecord(entries) || Object.keys(entries).length > 100) throw new Error(`Invalid ${SAVED_PART.specials}.`);
  const kept: Record<string, SpecialProgress> = {};
  for (const [id, progress] of Object.entries(entries)) {
    if (!/^[a-z][a-z0-9-]{0,47}$/.test(id) || !isRecord(progress)) throw new Error(`Invalid ${SAVED_PART.specials}.`);
    const { draft, solution, stars, challenges } = progress;
    if (stars !== undefined && (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0 || stars > 3))
      throw new Error('Invalid star count.');
    const known = (measure: unknown): measure is ChallengeMeasure =>
      CHALLENGE_MEASURES.includes(measure as ChallengeMeasure);
    if (
      challenges !== undefined &&
      (!Array.isArray(challenges) || !challenges.every(known) || new Set(challenges).size !== challenges.length)
    )
      throw new Error(`Invalid ${SAVED_PART.specials}.`);
    const entry: SpecialProgress = {
      ...(draft !== undefined && { draft: readPrograms(draft) }),
      ...(solution !== undefined && { solution: readPrograms(solution) }),
      ...(stars !== undefined && { stars }),
      ...(challenges?.length && { challenges: [...(challenges as ChallengeMeasure[])] }),
    };
    if (Object.keys(entry).length) kept[id] = entry;
  }
  return Object.keys(kept).length ? kept : undefined;
}

function validateSettingsMap(v: Record<string, unknown>): Settings {
  const settings = v.settings;
  if (!isRecord(settings)) throw new Error('Missing settings.');
  const level = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
  if (!level(settings.music) || (settings.volume !== undefined && !level(settings.volume)))
    throw new Error('Invalid music volume.');
  // Older saves kept a master volume over the music; with music the only sound, the two fold into one.
  const music = Math.round((settings.music as number) * ((settings.volume as number | undefined) ?? 1) * 100) / 100;
  if (typeof settings.reduced_motion !== 'boolean') throw new Error('Invalid display setting.');
  // Older saves also kept a fullscreen flag. The browser decides that on every visit, so it is dropped.
  for (const k of [
    'pixel_art',
    'text_editor',
    'first_routine_tips',
    'short_repeats',
    'block_preview',
    'service_summary',
  ])
    if (settings[k] !== undefined && typeof settings[k] !== 'boolean') throw new Error('Invalid display setting.');
  // Saves from before the speed was kept play at 1×, as every shift used to open.
  const speed = settings.speed ?? 1;
  // Every line was typed out before the pace could be chosen.
  const pace = settings.dialogue_pace ?? 'typed';
  if (!DIALOGUE_PACES.includes(pace as DialoguePace)) throw new Error('Invalid dialogue pace.');
  if (typeof speed !== 'number' || !(speed >= 1 && speed <= MAX_PLAYBACK_SPEED))
    throw new Error('Invalid playback speed.');
  return {
    music,
    reduced_motion: settings.reduced_motion as boolean,
    pixel_art: (settings.pixel_art as boolean | undefined) ?? true,
    text_editor: (settings.text_editor as boolean | undefined) ?? false,
    speed,
    // Saves from before the tips had them on; a café past its first routine never sees them anyway.
    first_routine_tips: (settings.first_routine_tips as boolean | undefined) ?? true,
    // Every scene played in full before the option existed.
    short_repeats: (settings.short_repeats as boolean | undefined) ?? false,
    // The café drew no blocks before it could.
    block_preview: (settings.block_preview as boolean | undefined) ?? false,
    // The service was told only by the café scene before it could be told in words.
    service_summary: (settings.service_summary as boolean | undefined) ?? false,
    dialogue_pace: pace as DialoguePace,
  };
}

type RobotMaps = { robotDrafts: Record<string, RobotPrograms>; robotSolutions: Record<string, RobotPrograms> };

function validateRobotMaps(v: Record<string, unknown>, shifts: number): RobotMaps {
  const index = (value: unknown): value is number => isShiftIndex(value, shifts);
  const robotMaps: RobotMaps = { robotDrafts: {}, robotSolutions: {} };
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
      if (!isRecord(entries)) throw new Error(`Missing ${SAVED_PART[key]}.`);
      for (const [shift, programs] of Object.entries(entries)) {
        if (!/^\d+$/.test(shift) || !index(Number(shift))) throw new Error('Invalid set of robot routines.');
        robotMaps[key][shift] = readPrograms(programs);
      }
    }
  return robotMaps;
}

/** One set of the three robots' routines, brought up to the current blocks. */
function readPrograms(programs: unknown): RobotPrograms {
  if (!isRecord(programs)) throw new Error('Invalid set of robot routines.');
  for (const role of ['query', 'prep', 'floor'])
    if (typeof programs[role] !== 'string' || programs[role].length > 100_000) throw new Error('Invalid routine.');
  return {
    query: cleanQuery(programs.query as string),
    prep: migrateRobotSource(programs.prep as string, 'prep'),
    floor: migrateRobotSource(cleanFloor(programs.floor as string), 'floor'),
  };
}

/**
 * Semantic-copy Query programs (v1, v2) can't be translated into the token puzzles.
 * Keep unlocks and the other robots, but retire their Query code, Act I scores and story beats.
 */
function retireSemanticQuery(v: Record<string, unknown>, robotMaps: RobotMaps): void {
  if (v.version !== 1 && v.version !== 2) return;
  for (const key of ['robotDrafts', 'robotSolutions'] as const) {
    for (const [shift, programs] of Object.entries(robotMaps[key])) {
      if (key === 'robotSolutions' && Number(shift) < 14) delete robotMaps[key][shift];
      else programs.query = '';
    }
  }
  const keepLater = (entries: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(entries).filter(([shift]) => Number(shift) >= 14));
  v.drafts = {};
  v.solutions = {};
  v.stars = keepLater(v.stars as Record<string, unknown>);
  v.story = keepLater(v.story as Record<string, unknown>);
}

/** Move a 32-shift save onto the 21-shift campaign: shifts that played the same keep their work. */
function migrateLegacyShifts(v: Record<string, unknown>, robotMaps: RobotMaps, lessons: LessonCatalog): void {
  const carry = <T>(entries: Record<string, T>) =>
    Object.fromEntries(
      LEGACY_COUNTERPARTS.flatMap((old, shift) =>
        old !== undefined && Object.hasOwn(entries, String(old)) ? [[String(shift), entries[String(old)]]] : [],
      ),
    );
  const semantic = v.version === 1 || v.version === 2;
  for (const key of ['robotDrafts', 'robotSolutions'] as const) {
    robotMaps[key] = carry(robotMaps[key]);
    if (semantic)
      for (const [shift, programs] of Object.entries(robotMaps[key])) programs.query = lessons[Number(shift)].starter;
  }
  v.drafts = carry(v.drafts as Record<string, string>);
  v.solutions = carry(v.solutions as Record<string, string>);
  v.stars = carry(v.stars as Record<string, number>);
  v.story = Object.fromEntries(
    Object.entries(v.story as Record<string, boolean>).flatMap(([old, seen]) =>
      old in LEGACY_SCENES ? [[String(LEGACY_SCENES[old]), seen]] : [],
    ),
  );
  // Served every shift whose counterpart was served; the first one left is where play resumes.
  const served = (old: number | undefined) =>
    old !== undefined && (old < (v.unlocked as number) || (v.complete as boolean));
  let unlocked = LEGACY_COUNTERPARTS.findIndex((old) => !served(old));
  if (unlocked < 0) unlocked = lessons.length - 1;
  v.unlocked = Math.min(unlocked, lessons.length - 1);
  const selected = LEGACY_COUNTERPARTS.indexOf(v.selected as number);
  v.selected = selected >= 0 && selected <= unlocked ? selected : unlocked;
  // The new Act IV was never played, so nobody has finished this campaign yet.
  v.complete = false;
}

/** Validate an entire import before replacing anything in the active save. */
export function parseSave(text: string, lessons: LessonCatalog): ProgressSave {
  if (text.length > 2_000_000) throw new Error('It is too large to be a café export.');
  const v: unknown = JSON.parse(text);
  if (isRecord(v) && typeof v.version === 'number' && v.version > 4)
    throw new Error('It comes from a newer version of Caffeine Protocol.');
  if (!isRecord(v) || (v.version !== 1 && v.version !== 2 && v.version !== 3 && v.version !== 4))
    throw new Error('It isn’t a Caffeine Protocol café export.');
  const legacy = v.version !== 4,
    shifts = legacy ? LEGACY_SHIFTS : lessons.length;
  validateProgress(v, shifts);
  validateMaps(v, shifts);
  const settings = validateSettingsMap(v);
  const robotMaps = validateRobotMaps(v, shifts);
  const challenges = validateChallenges(v, shifts);
  const drills = validateDrills(v);
  const specials = validateSpecials(v);
  // A finished v1 save had served all of Act I, which ended at the 14th shift.
  if (v.version === 1 && v.complete) Object.assign(v, { unlocked: 14, complete: false });
  retireSemanticQuery(v, robotMaps);
  if (legacy) migrateLegacyShifts(v, robotMaps, lessons);
  const storedComplete = v.complete as boolean;
  let unlocked = v.unlocked as number;
  // A save completed against a shorter catalog unlocks the next appended shift.
  // It is no longer complete until the player finishes that shift.
  if (storedComplete && unlocked < lessons.length - 1) unlocked += 1;
  return {
    version: 4,
    ...robotMaps,
    selected: v.selected as number,
    unlocked,
    complete: storedComplete && unlocked === (v.unlocked as number),
    drafts: cleanQueryMap(v.drafts as Record<string, string>),
    solutions: cleanQueryMap(v.solutions as Record<string, string>),
    stars: { ...(v.stars as Record<string, number>) },
    story: { ...(v.story as Record<string, boolean>) },
    ...(challenges && { challenges }),
    ...(drills && { drills }),
    ...(specials && { specials }),
    settings,
  };
}

/** The shifts, numbered as the player reads them, that no 32-shift café ever played. */
const NEW_SHIFTS = LEGACY_COUNTERPARTS.flatMap((old, index) => (old === undefined ? [index + 1] : []));

/**
 * What bringing a café saved by an older version up to this one changed that its player would notice, one sentence
 * each. Empty for a current save, an unreadable one, and a café nobody played in.
 */
export function migrationChanges(raw: string, lessons: LessonCatalog): string[] {
  let stored: unknown, save: ProgressSave;
  try {
    stored = JSON.parse(raw);
    save = parseSave(raw, lessons);
  } catch {
    return [];
  }
  if (!isRecord(stored) || stored.version === 4 || untouched(save)) return [];
  const semantic = stored.version === 1 || stored.version === 2;
  // Act I's stars are accounted for by Query's change, so only the rest are counted against what carried over.
  const served = Object.keys(stored.stars as Record<string, number>).filter(
      (shift) => !semantic || Number(shift) >= 14,
    ).length,
    kept = Object.keys(save.stars).length;
  const changes = [];
  if (semantic)
    changes.push(
      'Query reads orders as token puzzles now, so its old routines couldn’t come along: the Prologue and Act I shifts you’d reached stay open, but start again from Query’s opening routines, with their stars and scenes to earn again.',
    );
  if (served) {
    const yours = `your ${semantic ? 'other ' : ''}${count(served, 'served shift')}`;
    const carried = kept === served ? (served === 1 ? yours : `all ${yours}`) : `${kept || 'none'} of ${yours}`;
    const what = kept ? ` with ${kept === 1 ? 'its' : 'their'} stars and routines` : '';
    changes.push(`The campaign is ${count(lessons.length, 'shift')} long now, not 32: ${carried} carried over${what}.`);
  }
  changes.push(
    `Shifts ${NEW_SHIFTS[0]}–${NEW_SHIFTS.at(-1)} are new${stored.complete ? ', so the café isn’t finished until they’re served too' : ''}.`,
  );
  return changes;
}
