import type { LevelDefinition, RobotPrograms, RunResult } from './types';

/**
 * Bump whenever a simulation rule changes what a routine does: a record made under other rules may no longer
 * replay the same, so it can't be shown as evidence about today's café.
 */
export const RULES_VERSION = 1;

/** How many finished runs a shift keeps: enough to look back over a few attempts without growing for ever. */
export const RUN_HISTORY = 12;

/**
 * A finished run, frozen: the routines it ran, the rounds it played, the rules and content it played under, and
 * what happened. Edits make new routines, never a different record, so what the player inspects is always what ran.
 */
export interface RunRecord {
  /** Counts up through a session, so two runs of the same routines stay apart. */
  readonly id: number;
  readonly level_id: string;
  /** A full service earns stars; practice plays one round and never does. */
  readonly mode: 'service' | 'practice';
  /** The rounds played, as seed ids, in order. */
  readonly seeds: readonly string[];
  readonly programs: Readonly<RobotPrograms>;
  /** The rules and shift content it ran under; see `runVersion`. */
  readonly version: string;
  /** In full on the newest record; an older one has let go of each round's step-by-step events (see `keepRecord`). */
  readonly result: RunResult;
}

/** FNV-1a over a string: a short, stable fingerprint, not a security measure. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

/** The rules version and a fingerprint of the shift's content: customers, seeds, targets, and layout. */
export function runVersion(level: LevelDefinition): string {
  return `${RULES_VERSION}.${fingerprint(JSON.stringify(level))}`;
}

/** Freeze a finished run into a record. */
export function recordRun(
  id: number,
  level: LevelDefinition,
  programs: RobotPrograms,
  result: RunResult,
  rounds: readonly number[],
): RunRecord {
  return Object.freeze({
    id,
    level_id: level.id,
    mode: result.practice ? 'practice' : 'service',
    seeds: Object.freeze(rounds.map((round) => level.seeds[round].id)),
    programs: Object.freeze({ ...programs }),
    version: runVersion(level),
    result,
  });
}

/**
 * A record once a newer one is kept. Only the newest run is played back, followed or inspected step by step; an older
 * one is only compared and named, which reads its outcome, numbers, guests and how long each round took. So it lets
 * go of the robots' step-by-step events, nearly all of a run's memory: about 4 MiB on a busy shift, against 0.1 MiB
 * without them.
 */
function settled(record: RunRecord): RunRecord {
  const execution = record.result.execution;
  if (!execution?.some((round) => round.events.length)) return record;
  return Object.freeze({
    ...record,
    result: { ...record.result, execution: execution.map((round) => ({ ...round, events: [] })) },
  });
}

/** Keep the newest records, up to `RUN_HISTORY`, only the newest of them in full. */
export const keepRecord = (records: readonly RunRecord[], record: RunRecord): RunRecord[] => [
  ...records.slice(1 - RUN_HISTORY).map(settled),
  record,
];
