import type { ChallengeMeasure } from '@/domain/challenges';
import type { ProgressSave, RobotPrograms, RobotRole } from '@/domain/types';
import { ROBOT_ROLES, robotForLevel, robotUnlocked } from '@/domain/robots';
import { UNLOCKS } from '@/domain/unlocks';
import { cleanFloor, cleanQuery } from './migration';
import type { LessonCatalog } from './migration';

export function incomingProgram(save: ProgressSave, index: number, lessons: LessonCatalog): string {
  return cleanQuery(
    index < UNLOCKS.query
      ? lessons[index].starter
      : (save.solutions[index - 1] ?? save.drafts[index - 1] ?? lessons[index].starter),
  );
}
/**
 * A served shift: the next one unlocks, the best stars and the routine are kept, and any optional challenge the
 * service met joins the ones met before. Once met, a challenge stays met.
 */
export function completeLevel(
  save: ProgressSave,
  index: number,
  stars: number,
  source = '',
  lessons: LessonCatalog,
  met: readonly ChallengeMeasure[] = [],
): ProgressSave {
  const before = save.challenges?.[index] ?? [];
  const challenges = met.some((measure) => !before.includes(measure))
    ? { ...save.challenges, [index]: [...before, ...met.filter((measure) => !before.includes(measure))] }
    : save.challenges;
  return {
    ...save,
    ...(challenges && { challenges }),
    unlocked: Math.max(save.unlocked, Math.min(index + 1, lessons.length - 1)),
    complete: save.complete || index === lessons.length - 1,
    stars: { ...save.stars, [index]: Math.max(save.stars[index] ?? -1, stars) },
    solutions: source ? { ...save.solutions, [index]: source } : save.solutions,
  };
}

/** Carry the last passing program forward independently for every unlocked robot. */
export function incomingRobotPrograms(save: ProgressSave, index: number, lessons: LessonCatalog): RobotPrograms {
  const lesson = lessons[index],
    defaults = lesson.robotStarter ?? { query: incomingProgram(save, index, lessons), prep: '', floor: '' };
  const previous = save.robotSolutions[index - 1] ?? save.robotDrafts[index - 1];
  return {
    query: cleanQuery(save.drafts[index] ?? previous?.query ?? incomingProgram(save, index, lessons)),
    prep: index === UNLOCKS.prep - 1 ? defaults.prep : (previous?.prep ?? defaults.prep),
    floor: cleanFloor(index === UNLOCKS.floor - 1 ? defaults.floor : (previous?.floor ?? defaults.floor)),
  };
}
/** How the shift opened the routines: the incoming programs, ignoring this shift’s own draft. */
export function resetRobotPrograms(save: ProgressSave, index: number, lessons: LessonCatalog): RobotPrograms {
  const drafts = { ...save.drafts };
  delete drafts[index];
  return incomingRobotPrograms({ ...save, drafts }, index, lessons);
}
export function saveRobotDraft(save: ProgressSave, index: number, programs: RobotPrograms): ProgressSave {
  return {
    ...save,
    selected: index,
    drafts: { ...save.drafts, [index]: programs.query },
    robotDrafts: { ...save.robotDrafts, [index]: programs },
  };
}

/**
 * The robots whose routines, as the workspace would open them, differ from the ones the shift was served with, or,
 * while it's still to serve, from how it opened.
 */
export function changedRoles(save: ProgressSave, index: number, lessons: LessonCatalog): RobotRole[] {
  const programs = save.robotDrafts[index] ?? incomingRobotPrograms(save, index, lessons);
  const kept =
    save.robotSolutions[index] ??
    (save.stars[index] === undefined ? resetRobotPrograms(save, index, lessons) : programs);
  return ROBOT_ROLES.filter((role) => robotUnlocked(role, index + 1) && programs[role].trim() !== kept[role].trim());
}

/** The robot a shift opens on: its lead, unless the player was working on another robot's routine and not the lead's. */
export function openingRole(save: ProgressSave, index: number, lessons: LessonCatalog): RobotRole {
  const lead = robotForLevel(index + 1),
    changed = changedRoles(save, index, lessons);
  return changed.length && !changed.includes(lead) ? changed[0] : lead;
}

/** What Niko said at a choice in the story: the latest answer is the one later scenes recall. */
export function answerChoice(save: ProgressSave, choice: string, option: string): ProgressSave {
  return save.choices?.[choice] === option ? save : { ...save, choices: { ...save.choices, [choice]: option } };
}

/** A drill got right on the first pick joins the ones done before; it stays done, and adds nothing to the stars. */
export function completeDrill(save: ProgressSave, id: string): ProgressSave {
  return save.drills?.includes(id) ? save : { ...save, drills: [...(save.drills ?? []), id] };
}
