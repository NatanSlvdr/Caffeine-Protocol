import {
  ROBOT_DISPLAY_NAMES,
  indentSource,
  isBenchSeed,
  type LevelDefinition,
  type RobotRole,
  type RunRecord,
} from '@/domain';
import { COMPARE_WORDS } from './modals/compareWords';
import { guestCalled } from './route';
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

/**
 * A run named for the list: "Run 3 · Service · Served", "Run 4 · Practice, round 2 · Stopped", "Run 5 · Bench 1 · …",
 * and "Bench 2, eased" for a bench that eased the shift's rules.
 */
export function runName(level: LevelDefinition, record: RunRecord, say = COMPARE_WORDS.en): string {
  const round = level.seeds.findIndex((seed) => seed.id === record.seeds[0]) + 1;
  const mode =
    record.mode === 'service'
      ? say.name.service
      : isBenchSeed(record.seeds[0])
        ? say.name.bench(
            record.seeds[0].replace('BENCH_', ''),
            !!level.seeds.find((seed) => seed.id === record.seeds[0])?.eased,
          )
        : say.name.practice(round);
  return `${say.run(record.id)} · ${mode} · ${say.name.verdict(record.result.passed)}`;
}

/** Which way a number moved from one run to the next, for the better or the worse; nothing when it can't be told. */
export type Change = 'better' | 'worse' | 'same';

export interface ComparedRow {
  label: string;
  before: string;
  after: string;
  change?: Change;
  /** How it moved, in words: "2 fewer", "6 points more". */
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

/** Where a stopped run stopped: "Query · Round 2 · Guest 3", "Query · Round 1 · Juno", or "Query’s routine won’t run". */
function stoppedAt(level: LevelDefinition, record: RunRecord, say: typeof COMPARE_WORDS.en.stopped): string {
  const failure = record.result.first_failure;
  if (!failure) return say.stopped;
  const robot = ROBOT_DISPLAY_NAMES[failure.role ?? 'query'];
  if (failure.code === 'compile') return say.compile(robot);
  const seed = level.seeds.findIndex((s) => s.id === failure.seed_id);
  const guest = seed < 0 ? -1 : level.seeds[seed].customers.findIndex((c) => c.customer_id === failure.customer_id);
  return [
    say.robot(robot),
    record.seeds.length > 1 && seed >= 0 && say.round(seed + 1),
    guest >= 0 ? guestCalled(level, failure.seed_id, failure.customer_id, say.guest) : seed >= 0 && say.closing,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A number's move, judged: `fewer` is better for blocks and time, `more` for guests and mood. */
function moved(
  before: number,
  after: number,
  better: 'fewer' | 'more',
  words: (n: number) => string,
  say: typeof COMPARE_WORDS.en.rows,
) {
  if (before === after) return { change: 'same' as const, delta: say.same };
  const up = after > before;
  return {
    change: (up === (better === 'more') ? 'better' : 'worse') as Change,
    delta: say.moved(words(Math.abs(after - before)), up),
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
export function compareRuns(
  level: LevelDefinition,
  before: RunRecord,
  after: RunRecord,
  say = COMPARE_WORDS.en,
): ComparedRow[] {
  const a = before.result,
    b = after.result;
  const both = a.passed && b.passed;
  const words = say.rows;
  const unjudged = both ? undefined : words.unjudged;
  const move = (from: number, to: number, better: 'fewer' | 'more', amount: (n: number) => string = String) =>
    moved(from, to, better, amount, words);
  const guests = guestsIn(level, after);
  const served = (record: RunRecord) => record.result.events.filter((e) => e.passed).length;
  const rows: ComparedRow[] = [
    {
      label: words.outcome,
      before: a.passed ? words.served : stoppedAt(level, before, say.stopped),
      after: b.passed ? words.served : stoppedAt(level, after, say.stopped),
      ...(a.passed === b.passed
        ? { change: 'same' as const }
        : b.passed
          ? { change: 'better' as const, delta: words.nowServed }
          : { change: 'worse' as const, delta: words.nowStops }),
    },
  ];
  if (after.seeds.length > 1)
    rows.push({
      label: words.rounds,
      before: words.of(a.passed_seeds, a.required_seeds),
      after: words.of(b.passed_seeds, b.required_seeds),
      ...move(a.passed_seeds, b.passed_seeds, 'more'),
    });
  rows.push({
    label: words.guests,
    before: words.of(served(before), guests),
    after: words.of(served(after), guests),
    ...move(served(before), served(after), 'more'),
  });
  if (a.block_count !== undefined && b.block_count !== undefined)
    rows.push({
      label: words.blocks,
      before: String(a.block_count),
      after: String(b.block_count),
      ...move(a.block_count, b.block_count, 'fewer'),
    });
  const judged = (row: ComparedRow): ComparedRow =>
    both ? row : { ...row, change: undefined, delta: undefined, note: unjudged };
  rows.push(
    judged({
      label: words.steps,
      before: String(a.executed_instructions),
      after: String(b.executed_instructions),
      ...move(a.executed_instructions, b.executed_instructions, 'fewer'),
    }),
    judged({
      label: words.time,
      before: words.seconds(seconds(before)),
      after: words.seconds(seconds(after)),
      ...move(Math.round(seconds(before) * 10), Math.round(seconds(after) * 10), 'fewer', (n) => words.seconds(n / 10)),
    }),
    judged({
      label: words.mood,
      before: words.percent(Math.round(a.average_satisfaction)),
      after: words.percent(Math.round(b.average_satisfaction)),
      ...move(Math.round(a.average_satisfaction), Math.round(b.average_satisfaction), 'more', words.points),
    }),
  );
  if (before.mode === 'service' && after.mode === 'service' && both)
    rows.push({
      label: words.stars,
      before: words.of(a.stars, 3),
      after: words.of(b.stars, 3),
      ...move(a.stars, b.stars, 'more', words.starCount),
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
