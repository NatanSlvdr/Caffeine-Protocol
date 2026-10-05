import {
  ROBOT_DISPLAY_NAMES,
  count,
  indentSource,
  type LevelDefinition,
  type RobotRole,
  type RunRecord,
} from '@/domain';
import { lineDiff, type DiffLine } from './versions';

/**
 * Two runs played the same suite: the same shift, the same rounds in the same order, under the same rules and
 * content. Only then does a number from one say anything about the other.
 */
export const sameSuite = (a: RunRecord, b: RunRecord) =>
  a.id !== b.id && a.level_id === b.level_id && a.version === b.version && a.seeds.join() === b.seeds.join();

/** The runs a record can be set against, newest first. */
export const comparableTo = (records: readonly RunRecord[], record: RunRecord) =>
  records.filter((other) => sameSuite(other, record)).reverse();

/** The newest run with an earlier one of the same suite, and the latest of those: the pair a comparison opens on. */
export function latestPair(records: readonly RunRecord[]): [RunRecord, RunRecord] | undefined {
  for (const after of [...records].reverse()) {
    const before = comparableTo(records, after).find((other) => other.id < after.id);
    if (before) return [before, after];
  }
  return undefined;
}

/** A run named for the list: "Run 3 · Service · Served", "Run 4 · Practice, round 2 · Stopped". */
export function runName(level: LevelDefinition, record: RunRecord): string {
  const round = level.seeds.findIndex((seed) => seed.id === record.seeds[0]) + 1;
  const mode = record.mode === 'service' ? 'Service' : `Practice, round ${round}`;
  return `Run ${record.id} · ${mode} · ${record.result.passed ? 'Served' : 'Stopped'}`;
}

/** Which way a number moved from one run to the next, for the better or the worse; nothing when it can't be told. */
export type Change = 'better' | 'worse' | 'same';

export interface ComparedRow {
  label: string;
  before: string;
  after: string;
  change?: Change;
  /** How it moved, in words: "2 fewer", "up 6 points". */
  delta?: string;
  /** Why the change isn't judged, when it isn't. */
  note?: string;
}

/** Guests a run had to serve: everyone in the rounds it played, but the closing-time call. */
const guestsIn = (level: LevelDefinition, record: RunRecord) =>
  record.seeds.reduce(
    (sum, id) =>
      sum + (level.seeds.find((seed) => seed.id === id)?.customers.filter((c) => !c.expected.closing).length ?? 0),
    0,
  );

/** Where a stopped run stopped: "Query · Round 2 · Guest 3", or "Query’s routine won’t run". */
function stoppedAt(level: LevelDefinition, record: RunRecord): string {
  const failure = record.result.first_failure;
  if (!failure) return 'Stopped';
  const robot = ROBOT_DISPLAY_NAMES[failure.role ?? 'query'];
  if (failure.code === 'compile') return `${robot}’s routine won’t run`;
  const seed = level.seeds.findIndex((s) => s.id === failure.seed_id);
  const guest = seed < 0 ? -1 : level.seeds[seed].customers.findIndex((c) => c.customer_id === failure.customer_id);
  return [
    `${robot} stopped`,
    record.seeds.length > 1 && seed >= 0 && `Round ${seed + 1}`,
    guest >= 0 ? `Guest ${guest + 1}` : seed >= 0 && 'Closing time',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A number's move, judged: `fewer` is better for blocks and time, `more` for guests and mood. */
function moved(before: number, after: number, better: 'fewer' | 'more', words: (n: number) => string) {
  if (before === after) return { change: 'same' as const, delta: 'Same' };
  const up = after > before;
  return {
    change: (up === (better === 'more') ? 'better' : 'worse') as Change,
    delta: words(Math.abs(after - before)) + (up ? ' more' : ' fewer'),
  };
}

const seconds = (record: RunRecord) =>
  (record.result.execution ?? []).reduce(
    (sum, round) => sum + (Number.isFinite(round.duration) ? round.duration : 0),
    0,
  );

/**
 * Two runs of the same suite side by side: whether each was served, the rounds and guests it got right, its size,
 * and, where both were served, how long the service took, the steps it ran, the guests' mood and the stars. A stopped
 * run's time and steps only count up to where it stopped, so they aren't judged against a run that went on.
 */
export function compareRuns(level: LevelDefinition, before: RunRecord, after: RunRecord): ComparedRow[] {
  const a = before.result,
    b = after.result;
  const both = a.passed && b.passed;
  const unjudged = both
    ? undefined
    : 'A stopped run’s steps, time and mood only count up to where it stopped, so they’re judged when both runs were served.';
  const guests = guestsIn(level, after);
  const served = (record: RunRecord) => record.result.events.filter((e) => e.passed).length;
  const rows: ComparedRow[] = [
    {
      label: 'Outcome',
      before: a.passed ? 'Served' : stoppedAt(level, before),
      after: b.passed ? 'Served' : stoppedAt(level, after),
      ...(a.passed === b.passed
        ? { change: 'same' as const }
        : b.passed
          ? { change: 'better' as const, delta: 'Now served' }
          : { change: 'worse' as const, delta: 'Now stops' }),
    },
  ];
  if (after.seeds.length > 1)
    rows.push({
      label: 'Rounds right',
      before: `${a.passed_seeds} of ${a.required_seeds}`,
      after: `${b.passed_seeds} of ${b.required_seeds}`,
      ...moved(a.passed_seeds, b.passed_seeds, 'more', String),
    });
  rows.push({
    label: 'Guests served',
    before: `${served(before)} of ${guests}`,
    after: `${served(after)} of ${guests}`,
    ...moved(served(before), served(after), 'more', String),
  });
  if (a.block_count !== undefined && b.block_count !== undefined)
    rows.push({
      label: 'Blocks used',
      before: String(a.block_count),
      after: String(b.block_count),
      ...moved(a.block_count, b.block_count, 'fewer', String),
    });
  const judged = (row: ComparedRow): ComparedRow =>
    both ? row : { ...row, change: undefined, delta: undefined, note: unjudged };
  rows.push(
    judged({
      label: 'Steps run',
      before: String(a.executed_instructions),
      after: String(b.executed_instructions),
      ...moved(a.executed_instructions, b.executed_instructions, 'fewer', String),
    }),
    judged({
      label: 'Service time',
      before: `${seconds(before).toFixed(1)} s`,
      after: `${seconds(after).toFixed(1)} s`,
      ...moved(
        Math.round(seconds(before) * 10),
        Math.round(seconds(after) * 10),
        'fewer',
        (n) => `${(n / 10).toFixed(1)} s`,
      ),
    }),
    judged({
      label: 'Guests’ mood',
      before: `${Math.round(a.average_satisfaction)}%`,
      after: `${Math.round(b.average_satisfaction)}%`,
      ...moved(Math.round(a.average_satisfaction), Math.round(b.average_satisfaction), 'more', (n) => `${n} points`),
    }),
  );
  if (before.mode === 'service' && after.mode === 'service' && both)
    rows.push({
      label: 'Stars',
      before: `${a.stars} of 3`,
      after: `${b.stars} of 3`,
      ...moved(a.stars, b.stars, 'more', (n) => count(n, 'star')),
    });
  return rows;
}

export interface RoutineChange {
  role: RobotRole;
  diff: DiffLine[];
  added: number;
  removed: number;
}

/** What changed in each robot's routine from one run to the next, line by line; robots whose routine is the same have no lines changed. */
export function routineChanges(crew: readonly RobotRole[], before: RunRecord, after: RunRecord): RoutineChange[] {
  return crew.map((role) => {
    const diff = lineDiff(indentSource(before.programs[role] ?? ''), indentSource(after.programs[role] ?? ''));
    return {
      role,
      diff,
      added: diff.filter((line) => line.kind === 'add').length,
      removed: diff.filter((line) => line.kind === 'remove').length,
    };
  });
}
