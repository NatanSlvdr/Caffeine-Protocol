import { useDeferredValue, useMemo } from 'react';
import {
  ROBOT_DISPLAY_NAMES,
  blockOrdinal,
  blockVisits,
  commandDirection,
  compileProgram,
  directionLabel,
  previewKind,
  reachedName,
  robotActorName,
  runLevel,
  spokenBlock,
  standingName,
  tilesAway,
  type BlockPreview,
  type BlockVisit,
  type LevelDefinition,
  type RobotPrograms,
  type RobotRole,
  type RunResult,
} from '@/domain';

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

/** What the station a block reaches into made of it, as the robot did it. */
const DONE: Record<string, string> = {
  TAKE: 'takes a cup',
  GRIND: 'grinds the beans',
  'FILL WATER': 'fills the cup',
  BREW: 'brews',
  STEEP: 'steeps the tea',
  USE: 'uses it',
  WASH: 'washes up',
  'ADD SUGAR': 'adds sugar',
  LID: 'puts a lid on',
  DEPOSIT: 'puts the drink out',
  PICKUP: 'picks up a drink',
  COLLECT: 'collects the cups',
  SERVE: 'serves',
  'HAND OVER': 'hands it over to go',
  'RETURN CUPS': 'returns the cups',
};

const robotName = (role: RobotRole, shift: number) =>
  role === 'query' ? ROBOT_DISPLAY_NAMES.query : robotActorName(role, shift);

/** One way a block went, in a sentence: "Brew walks 3 tiles right, from storage to the coffee machine." */
export function visitWords(visit: BlockVisit, command: string, role: RobotRole, shift: number): string {
  const who = robotName(role, shift);
  const end = visit.path.at(-1)!;
  const stopped = visit.error ? ` The run stops here: ${visit.error.replace(/\.$/, '')}.` : '';
  if (!visit.target) {
    if (visit.path.length === 1) return `${who} can’t move: the way is blocked.${stopped}`;
    const from = standingName(visit.path[0], role),
      to = standingName(end, role);
    const where = from && to ? `, from ${from} to ${to}` : to ? `, to ${to}` : from ? `, from ${from}` : '';
    return `${who} walks ${tilesAway(visit.path[0], end)}${where}.${stopped}`;
  }
  const way = directionLabel(commandDirection(command) ?? '');
  const name = reachedName(visit.target);
  if (!name) return `${who} reaches ${way}, but nothing is there.${stopped}`;
  const verb = command.split(' ')[0];
  const did = visit.action
    ? (DONE[visit.action] ?? visit.action.toLowerCase())
    : role === 'query'
      ? verb === 'DEPOSIT'
        ? 'puts the ticket down'
        : 'takes a sheet'
      : '';
  return `${who} reaches ${way} to ${name}${did ? `, and ${did}` : ''}.${stopped}`;
}

/** What the café preview says beside its marks: the block, where it went, or why it shows nothing. */
export interface PreviewNote {
  /** "Block 4 · move right 3", or "Line 6 · …" in the text view. */
  title: string;
  /** "In round 1", or "In the service" for a shift of one round. */
  scope: string;
  /** Each way it went, with how many times. */
  ways: { words: string; times: number }[];
  /** Ways it went beyond those shown. */
  more: number;
  /** Why nothing is shown, when nothing is. */
  empty?: string;
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
  const settled = useDeferredValue(programs);
  const source = settled[role] ?? '';
  const command = line === null ? '' : (source.split('\n')[line] ?? '').trim();
  const kind = previewKind(command);
  const wanted = !!kind;
  const run = useMemo(() => (wanted ? dryRound(level, shift, settled) : undefined), [wanted, level, shift, settled]);
  if (!kind || !run || line === null) return {};
  const title = `${textMode ? `Line ${line + 1}` : `Block ${blockOrdinal(source, line)}`} · ${spokenBlock(command)}`;
  const scope = level.seeds.length > 1 ? 'In round 1' : 'In the service';
  const round = run.execution?.[0];
  const visits = round ? blockVisits(round, role, line) : [];
  const note: PreviewNote = {
    title,
    scope,
    ways: visits.slice(0, SHOWN).map((v) => ({ words: visitWords(v, command, role, shift), times: v.times })),
    more: Math.max(0, visits.length - SHOWN),
  };
  if (!round || run.first_failure?.code === 'compile')
    return { note: { ...note, empty: 'Shown once the routines run: one of them needs a fix first.' } };
  if (visits.length === 0)
    return {
      note: {
        ...note,
        empty: run.passed
          ? 'It doesn’t run in this round.'
          : `The round stops before it runs: ${run.first_failure?.reason.replace(/\.$/, '')}.`,
      },
    };
  return { preview: { role, kind, visits }, note };
}
