import { version } from '../../../package.json';
import { ROBOT_DISPLAY_NAMES, runVersion } from '@/domain';
import type { LevelDefinition, RobotPrograms, RunRecord } from '@/domain';
import { isStale } from './evidence';

export interface ProblemReportInput {
  index: number;
  level: LevelDefinition;
  /** Every robot's routine as it stands now. */
  programs: Readonly<RobotPrograms>;
  /** The latest run of this shift in the session, if any. */
  record?: RunRecord;
  now: Date;
  /** The browser, as it names itself: the player sees it in the report and can leave it out by not sharing. */
  browser: string;
}

/**
 * Everything needed to play a problem back: the game and shift content it ran on, the routines, and the last run's
 * rounds and failure. It stays on the player's computer as a file they read before saving, and goes nowhere unless they
 * share it.
 */
export function problemReport({ index, level, programs, record, now, browser }: ProblemReportInput): string {
  const failure = record?.result.first_failure;
  const report = {
    report: 'Caffeine Protocol problem report',
    game_version: version,
    content_version: runVersion(level),
    created: now.toISOString(),
    browser,
    shift: { number: index + 1, id: level.id, title: level.title },
    routines: programs,
    last_run: record
      ? {
          mode: record.mode,
          rounds: record.seeds,
          content_version: record.version,
          passed: record.result.passed,
          stars: record.result.stars,
          // The routines it ran on, only when they're not the ones above.
          routines: isStale(record, programs) ? record.programs : 'as above',
          failure: failure
            ? {
                robot: ROBOT_DISPLAY_NAMES[failure.role ?? 'query'],
                code: failure.code,
                reason: failure.reason,
                block: failure.error_line + 1,
                round: failure.seed_id,
                guest: failure.customer_id,
                heard: failure.phrase,
                ...(failure.context && { context: failure.context }),
              }
            : null,
        }
      : null,
  };
  return JSON.stringify(report, null, 2);
}
