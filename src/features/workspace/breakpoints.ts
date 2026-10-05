import {
  ROBOT_DISPLAY_NAMES,
  canPauseAt,
  type ExecutionEvent,
  type RobotRole,
  type Start,
  type StopWhen,
} from '@/domain';

/** The blocks each robot's routine is marked to pause at, by line. */
export type Marks = Readonly<Record<RobotRole, ReadonlySet<number>>>;

export const noMarks: Marks = { query: new Set(), prep: new Set(), floor: new Set() };

/** What else pauses the service, besides a marked block. */
export interface PauseAt {
  /** Brew takes a ticket, or Porter a drink. */
  handoffs: boolean;
  /** A slip, held before the crew reacts to it. */
  slips: boolean;
}

export const pauseNowhere: PauseAt = { handoffs: false, slips: false };

/** Why the service paused itself, and the robot that paused it. */
export interface PausedBy {
  reason: 'mark' | 'handoff' | 'slip';
  robot: RobotRole;
}

/** Why the service paused itself, in a few words: "At Brew’s mark". */
export function pauseReason({ reason, robot }: PausedBy): string {
  const name = ROBOT_DISPLAY_NAMES[robot];
  if (reason === 'mark') return `At ${name}’s mark`;
  if (reason === 'handoff') return `${name} takes a ${robot === 'prep' ? 'ticket' : 'drink'}`;
  return `${name}’s slip, before the crew reacts`;
}

/**
 * Marks carried across an edit. A mark stays on its block for as long as the block's line is unchanged, wherever it
 * went: an edit above it, or the block dragged or moved. A new value on the marked block itself keeps it. Anything
 * else, the block deleted or rewritten, takes the mark away, so a mark never comes to point at different code.
 */
export function carryMarks(before: string, after: string, marks: ReadonlySet<number>): Set<number> {
  if (before === after || !marks.size) return new Set(marks);
  const a = before.split('\n').map((l) => l.trim()),
    b = after.split('\n').map((l) => l.trim());
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let same = 0;
  while (same < a.length - start && same < b.length - start && a[a.length - 1 - same] === b[b.length - 1 - same])
    same++;
  const onlyLine = a.length === b.length && a.length - same - start === 1;
  const carried = new Set<number>();
  for (const line of marks) {
    if (line < start || (onlyLine && line === start)) carried.add(line);
    else if (line >= a.length - same) carried.add(line + b.length - a.length);
    else {
      // Moved within the changed stretch: the same line nearest where it was, to choose between copies.
      const found = b
        .map((_, i) => i)
        .filter((i) => i >= start && i < b.length - same && b[i] === a[line])
        .sort((x, y) => Math.abs(x - line) - Math.abs(y - line))[0];
      if (found !== undefined) carried.add(found);
    }
  }
  return new Set([...carried].filter((line) => canPauseAt(after, line)));
}

/** A mark put on a block, or taken off it. */
export function toggleMark(marks: Marks, role: RobotRole, line: number): Marks {
  const lines = new Set(marks[role]);
  if (!lines.delete(line)) lines.add(line);
  return { ...marks, [role]: lines };
}

export const markCount = (marks: Marks, crew: readonly RobotRole[]) =>
  crew.reduce((total, role) => total + marks[role].size, 0);

/**
 * When a running service pauses itself: as one of the player's robots starts a marked block, or, if asked, at each
 * handoff, when Brew takes a ticket or Porter a drink. A claimed ticket ends a wait on a block the robot was already
 * at, so it never counts as arriving at a mark again. Nothing, when nothing is asked for.
 */
export function pauseWhen(crew: readonly RobotRole[], marks: Marks, pauseAt: PauseAt): StopWhen | undefined {
  if (!pauseAt.handoffs && !markCount(marks, crew)) return undefined;
  return ({ event, resumed }) =>
    crew.includes(event.role) &&
    event.actor !== 'niko' &&
    ((!resumed && marks[event.role].has(event.line)) || (pauseAt.handoffs && isHandoff(event)));
}

const isHandoff = (event: ExecutionEvent) =>
  event.role !== 'query' && event.command === 'LISTEN' && !event.waiting && !event.error;

/** Which of the reasons stopped it, and where: a mark is named first, since the player put it there. */
export function pausedBy(marks: Marks, stopped: readonly Start[]): PausedBy {
  const marked = stopped.find(({ event, resumed }) => !resumed && marks[event.role].has(event.line));
  return marked ? { reason: 'mark', robot: marked.event.role } : { reason: 'handoff', robot: stopped[0].event.role };
}
