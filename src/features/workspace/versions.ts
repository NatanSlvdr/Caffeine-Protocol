import type { ProgressSave, RobotRole } from '@/domain';
import { resetRobotPrograms } from '@/features/campaign/save/persistence';
import type { LessonCatalog } from '@/features/campaign/save/persistence';
import { pad2 } from '@/shared/lib/format';

/** A routine the player can go back to, named for where it comes from. */
export interface RoutineVersion {
  id: 'served' | 'carried' | 'starter';
  label: string;
  detail: string;
  source: string;
}

/**
 * The earlier versions of one robot's routine on a shift, newest first: the last one that served this shift, the one
 * carried in from the shift before, and the shift's own starter. Each comes once: a shift that opened on its starter
 * offers it as the starter, and a robot with no routine on this shift has none to offer.
 */
export function routineVersions(
  save: ProgressSave,
  index: number,
  lessons: LessonCatalog,
  role: RobotRole,
  robot: string,
): RoutineVersion[] {
  const lesson = lessons[index];
  const starter = lesson.robotStarter?.[role] ?? (role === 'query' ? lesson.starter : '');
  const opened = resetRobotPrograms(save, index, lessons)[role];
  const served = save.robotSolutions[index]?.[role];
  const versions: RoutineVersion[] = [];
  if (served?.trim())
    versions.push({
      id: 'served',
      label: 'Last served',
      detail: `${robot}’s routine from the last service on this shift that went right.`,
      source: served,
    });
  if (opened.trim() && opened.trim() !== starter.trim())
    versions.push({
      id: 'carried',
      label: `From Shift ${pad2(index)}`,
      detail: `${robot}’s routine as it came in from the shift before, the way this shift opened.`,
      source: opened,
    });
  if (starter.trim())
    versions.push({
      id: 'starter',
      label: 'Shift starter',
      detail: `The routine this shift starts ${robot} on, before anything is carried in.`,
      source: starter,
    });
  return versions;
}

export const sameRoutine = (a: string, b: string) => a.trim() === b.trim();

export interface DiffLine {
  kind: 'same' | 'add' | 'remove';
  text: string;
}

/**
 * What going from one routine to another changes, line by line, with blank lines left out: `remove` lines are only
 * in `from`, `add` lines only in `to`. Lines match on their text, so moving a block in or out of an If shows as the
 * block it is rather than as a change.
 */
export function lineDiff(from: string, to: string): DiffLine[] {
  const lines = (source: string) => source.split('\n').filter((line) => line.trim());
  const a = lines(from),
    b = lines(to);
  const key = (line: string) => line.trim();
  // Longest common subsequence, filled from the end so the walk below can go forwards.
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = key(a[i]) === key(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const diff: DiffLine[] = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && key(a[i]) === key(b[j])) {
      diff.push({ kind: 'same', text: b[j].trimEnd() });
      i++;
      j++;
    } else if (i < a.length && (j >= b.length || lcs[i + 1][j] >= lcs[i][j + 1]))
      diff.push({ kind: 'remove', text: a[i++].trimEnd() });
    else diff.push({ kind: 'add', text: b[j++].trimEnd() });
  }
  return diff;
}
