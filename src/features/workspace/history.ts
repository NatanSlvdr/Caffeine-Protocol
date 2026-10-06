import type { RobotPrograms, RobotRole } from '@/domain';

/** Undo steps kept per robot: enough for a long session of edits, small enough to forget. */
export const HISTORY_LIMIT = 100;
/** Keystrokes on one line closer together than this undo as a single step. */
export const TYPING_BURST_MS = 1000;

/** One robot's routine history: the routines to undo back to, and the ones an undo set aside for redo. */
export interface RoutineHistory {
  past: string[];
  future: string[];
  /** The line the last edit changed in place, and when: the next keystroke on it joins the same step. */
  burst?: { line: number; at: number };
}

/**
 * How an edit enters the history. A plain `edit` is its own undo step, unless it carries on typing into the line
 * the last edit changed. A `format` only lays the routine out again: it replaces the current step, so undoing never
 * stops on an indentation the player didn't make.
 */
export type EditKind = 'edit' | 'format';

export const emptyHistory = (): RoutineHistory => ({ past: [], future: [] });

export const emptyHistories = (): Record<RobotRole, RoutineHistory> => ({
  query: emptyHistory(),
  prep: emptyHistory(),
  floor: emptyHistory(),
});

/** The one line `after` changed in place, or nothing when lines were added, removed, or several changed. */
function editedLine(before: string, after: string): number | undefined {
  const a = before.split('\n'),
    b = after.split('\n');
  if (a.length !== b.length) return undefined;
  let line: number | undefined;
  for (const [i, text] of a.entries()) {
    if (text === b[i]) continue;
    if (line !== undefined) return undefined;
    line = i;
  }
  return line;
}

/** The history after the routine went from `before` to `after` at time `now`. */
export function record(
  history: RoutineHistory,
  before: string,
  after: string,
  now: number,
  kind: EditKind = 'edit',
): RoutineHistory {
  if (before === after) return history;
  if (kind === 'format') return { ...history, burst: undefined };
  const line = editedLine(before, after);
  const { burst } = history;
  if (line !== undefined && burst?.line === line && now - burst.at < TYPING_BURST_MS)
    return { past: history.past, future: [], burst: { line, at: now } };
  return {
    past: [...history.past, before].slice(-HISTORY_LIMIT),
    future: [],
    burst: line === undefined ? undefined : { line, at: now },
  };
}

/** Step back to the previous routine, setting `present` aside for redo; nothing when there's nothing to undo. */
export function undo(history: RoutineHistory, present: string): { history: RoutineHistory; source: string } | null {
  const source = history.past.at(-1);
  if (source === undefined) return null;
  return { history: { past: history.past.slice(0, -1), future: [present, ...history.future] }, source };
}

/** Step forward to the routine the last undo set aside; nothing when there's nothing to redo. */
export function redo(history: RoutineHistory, present: string): { history: RoutineHistory; source: string } | null {
  const [source, ...future] = history.future;
  if (source === undefined) return null;
  return { history: { past: [...history.past, present].slice(-HISTORY_LIMIT), future }, source };
}

/**
 * Histories outlive a visit to the campaign page, so leaving a shift and coming back still undoes. Each is kept
 * with the routine it ends on: if that routine changed meanwhile (an imported café, a reset save), the history no
 * longer leads to it and is dropped.
 */
const kept = new Map<string, { programs: RobotPrograms; histories: Record<RobotRole, RoutineHistory> }>();

export function keepHistories(
  shift: string,
  programs: RobotPrograms,
  histories: Record<RobotRole, RoutineHistory>,
): void {
  kept.set(shift, { programs, histories });
}

export function keptHistories(shift: string, programs: RobotPrograms): Record<RobotRole, RoutineHistory> {
  const entry = kept.get(shift),
    histories = emptyHistories();
  if (!entry) return histories;
  for (const role of Object.keys(histories) as RobotRole[])
    if (entry.programs[role] === programs[role]) histories[role] = entry.histories[role];
  return histories;
}
