import type { ProgressSave, RobotPrograms } from '@/domain/types';
import { cleanFloor, cleanQuery } from './migration';
import type { LessonCatalog } from './migration';

export function incomingProgram(save: ProgressSave, index: number, lessons: LessonCatalog): string {
  return cleanQuery(
    index <= 2
      ? lessons[index].starter
      : (save.solutions[index - 1] ?? save.drafts[index - 1] ?? lessons[index].starter),
  );
}
export function completeLevel(
  save: ProgressSave,
  index: number,
  stars: number,
  source = '',
  lessons: LessonCatalog,
): ProgressSave {
  return {
    ...save,
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
    prep: index === 14 ? defaults.prep : (previous?.prep ?? defaults.prep),
    floor: cleanFloor(index === 22 ? defaults.floor : (previous?.floor ?? defaults.floor)),
  };
}
export function saveRobotDraft(save: ProgressSave, index: number, programs: RobotPrograms): ProgressSave {
  return {
    ...save,
    selected: index,
    drafts: { ...save.drafts, [index]: programs.query },
    robotDrafts: { ...save.robotDrafts, [index]: programs },
  };
}
