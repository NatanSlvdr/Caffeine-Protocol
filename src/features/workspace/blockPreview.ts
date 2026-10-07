import { useDeferredValue, useMemo } from 'react';
import {
  ROBOT_DISPLAY_NAMES,
  blockOrdinal,
  blockVisits,
  commandDirection,
  compileProgram,
  previewKind,
  reachedPlace,
  robotActorName,
  runLevel,
  spokenBlock,
  standingPlace,
  type BlockPreview,
  type BlockVisit,
  type LevelDefinition,
  type RobotPrograms,
  type RobotRole,
  type RunResult,
} from '@/domain';
import { useWords } from '@/shared/language';
import { PREVIEW_WORDS } from './previewWords';

/**
 * The first round, run start to finish with the routines as written: where the café preview's blocks go. It runs
 * without a serving window: that is timed on the service the player watches, and a dry round paces Query faster.
 */
export function dryRound(level: LevelDefinition, shift: number, programs: RobotPrograms): RunResult {
  const service = level.service && { ...level.service };
  if (service) delete service.fresh;
  return runLevel(
    { ...level, seeds: [level.seeds[0]], ...(service && { service }) },
    compileProgram(programs.query, shift),
    programs,
  );
}

const robotName = (role: RobotRole, shift: number) =>
  role === 'query' ? ROBOT_DISPLAY_NAMES.query : robotActorName(role, shift);

type PreviewWords = (typeof PREVIEW_WORDS)['en'];

/**
 * One way a block went, in a sentence: "Brew walks 3 tiles right, from storage to the coffee machine." Where the run
 * stopped on it is said apart, in the simulation's words.
 */
export function visitWords(
  visit: BlockVisit,
  command: string,
  role: RobotRole,
  shift: number,
  say: PreviewWords = PREVIEW_WORDS.en,
): string {
  const who = robotName(role, shift);
  const end = visit.path.at(-1)!;
  if (!visit.target) {
    if (visit.path.length === 1) return say.blocked(who);
    const from = standingPlace(visit.path[0], role),
      to = standingPlace(end, role);
    const where = [from && say.place(from, 'from'), to && say.place(to, 'to')].filter(Boolean).join(' ');
    return say.walks(who, say.tiles(visit.path[0], end), where);
  }
  const way = say.way(commandDirection(command) ?? '');
  const place = reachedPlace(visit.target);
  if (!place) return say.nothing(who, way);
  const verb = command.split(' ')[0];
  const did = visit.action
    ? (say.done[visit.action] ?? visit.action.toLowerCase())
    : role === 'query'
      ? verb === 'DEPOSIT'
        ? say.ticketDown
        : say.takesSheet
      : '';
  return say.reaches(who, way, say.place(place, 'bare'), did);
}

/** What the café preview says beside its marks: the block, where it went, or why it shows nothing. */
export interface PreviewNote {
  /** "Block 4 · move right 3", or "Line 6 · …" in the text view. */
  title: string;
  /** "In round 1", or "In the service" for a shift of one round. */
  scope: string;
  /** Each way it went, with how many times, and why the run stopped there when it did, in the simulation's words. */
  ways: { words: string; times: number; stop?: string }[];
  /** Ways it went beyond those shown. */
  more: number;
  /** Why nothing is shown, when nothing is. */
  empty?: string;
  /** Why the round stopped short of the block, in the simulation's words. */
  reason?: string;
}

/** How many ways a block went are put into words, and drawn. */
const SHOWN = 3;

/**
 * The block picked in the routine, previewed in the café: where it went each time in a dry run of the first round,
 * with the routines as written, and the words to go with it. Only Move, Take, Deposit and Use blocks are shown, and
 * the run is made only while one is picked, settled behind typing so it never holds up a keystroke.
 */
export function useBlockPreview({
  level,
  shift,
  programs,
  role,
  line,
  textMode,
}: {
  level: LevelDefinition;
  shift: number;
  programs: RobotPrograms;
  role: RobotRole;
  /** The block picked, by line; nothing when none is, or the preview is off. */
  line: number | null;
  textMode: boolean;
}): { preview?: BlockPreview; note?: PreviewNote } {
  const say = useWords(PREVIEW_WORDS);
  const settled = useDeferredValue(programs);
  const source = settled[role] ?? '';
  const command = line === null ? '' : (source.split('\n')[line] ?? '').trim();
  const kind = previewKind(command);
  const wanted = !!kind;
  const run = useMemo(() => (wanted ? dryRound(level, shift, settled) : undefined), [wanted, level, shift, settled]);
  if (!kind || !run || line === null) return {};
  const title = `${textMode ? say.line(line + 1) : say.block(blockOrdinal(source, line))} · ${spokenBlock(command)}`;
  const scope = say.scope(level.seeds.length > 1);
  const round = run.execution?.[0];
  const visits = round ? blockVisits(round, role, line) : [];
  const note: PreviewNote = {
    title,
    scope,
    ways: visits.slice(0, SHOWN).map((v) => ({
      words: visitWords(v, command, role, shift, say),
      times: v.times,
      ...(v.error && { stop: v.error.replace(/\.$/, '') }),
    })),
    more: Math.max(0, visits.length - SHOWN),
  };
  if (!round || run.first_failure?.code === 'compile') return { note: { ...note, empty: say.unrunnable } };
  if (visits.length === 0)
    return {
      note: {
        ...note,
        ...(run.passed
          ? { empty: say.notRun }
          : { empty: say.stopsBefore, reason: run.first_failure?.reason.replace(/\.$/, '') }),
      },
    };
  return { preview: { role, kind, visits }, note };
}
