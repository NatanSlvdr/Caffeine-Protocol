import { line, ROBOT_DISPLAY_NAMES, roundRegulars, variableLabels } from '@/domain';
import type { CastId, DialogueLine, FailureCode, LevelDefinition, RobotPrograms, RobotRole, RunResult } from '@/domain';
import { FAILURE_WORDS } from './failureWords';
import { REACTION_WORDS, type ReactionWords } from './reactionWords';

const ROBOT_CAST: Record<RobotRole, CastId> = { query: 'query', prep: 'brew', floor: 'porter' };

/**
 * Who reacts first to each failure: the guest who got the wrong thing, or the robot that got stuck. What they say is
 * `REACTION_WORDS.failed`. The record has to name every code, so a new failure can’t ship without someone to say it.
 */
const reactsFirst: Record<FailureCode, 'guest' | 'robot'> = {
  compile: 'robot',
  unsupported: 'robot',
  'loop-limit': 'robot',
  'end-of-routine': 'robot',
  'jump-across-block': 'robot',
  'return-outside-call': 'robot',
  'recursive-call': 'robot',
  'unset-variable': 'robot',
  'wrong-variable-kind': 'robot',
  'no-number': 'robot',
  'no-job': 'robot',
  'one-job-at-a-time': 'robot',
  'unfinished-work': 'robot',
  starved: 'robot',
  'wrong-wait': 'robot',
  'out-of-reach': 'robot',
  'wrong-direction': 'robot',
  'wrong-spot': 'robot',
  'nothing-there': 'robot',
  'empty-hands': 'robot',
  'hands-full': 'robot',
  'rush-first': 'robot',
  'no-paper': 'robot',
  'paper-in-hand': 'robot',
  'ticket-not-handed-over': 'guest',
  'blank-ticket': 'guest',
  'no-ticket': 'guest',
  'ticket-count': 'guest',
  'ticket-item': 'guest',
  'ticket-sugar': 'guest',
  'ticket-to-go-missing': 'guest',
  'ticket-to-go-extra': 'guest',
  'ticket-rush-missing': 'guest',
  'ticket-rush-extra': 'guest',
  'ticket-together-missing': 'guest',
  'ticket-together-extra': 'guest',
  checkout: 'guest',
  'unclear-order': 'guest',
  'help-needed': 'guest',
  'help-unneeded': 'guest',
  'guessed-drink': 'guest',
  'sold-out': 'guest',
  'stopped-listening': 'guest',
  'recipe-order': 'robot',
  'already-brewed': 'robot',
  'not-brewed': 'robot',
  'too-much-sugar': 'robot',
  'sugar-count': 'guest',
  'sugar-before-lid': 'robot',
  'lid-missing': 'robot',
  'lid-extra': 'robot',
  'no-clean-cups': 'robot',
  'recipe-not-function': 'robot',
  'carry-more': 'robot',
  'to-go-to-shelf': 'guest',
  'stay-in-to-table': 'guest',
  'wrong-table': 'guest',
  'wrong-dirty-table': 'robot',
  'table-not-cleared': 'guest',
  'table-apart': 'guest',
  'drink-cold': 'guest',
  'open-after-closing': 'robot',
  'stopped-early': 'robot',
  'closing-ticket': 'robot',
};

/** The nudge toward a fix for this kind of failure: the next useful thing to try. */
export const failureHint = (code: FailureCode, say: Record<FailureCode, string> = FAILURE_WORDS.en.hints): string =>
  say[code];

/**
 * A failed run told as a scene: the guest (a regular as themselves) or robot reacts, then Niko names the problem and
 * nudges. Told `brief`ly, for a slip the crew has already reacted to, only the reaction stays: the card under the
 * routine says the rest.
 * On a shift that went right before, Niko also points at the routine that was `served`, so a setback can be undone.
 * The crew speaks in `say`'s language, with the nudge from `hints`.
 */
export function failureLines(
  result: RunResult,
  fallbackRole: RobotRole,
  brief = false,
  served?: Partial<RobotPrograms>,
  say: ReactionWords = REACTION_WORDS.en,
  hints: Record<FailureCode, string> = FAILURE_WORDS.en.hints,
): DialogueLine[] {
  const failure = result.first_failure;
  if (!failure) return [];
  const role = failure.role ?? fallbackRole;
  const react = say.failed[failure.code];
  const byGuest = reactsFirst[failure.code] === 'guest';
  const guest = () => roundRegulars(result, failure.seed_id).get(failure.customer_id) ?? 'guest';
  const reaction =
    byGuest && react && failure.phrase
      ? line(`${guest()}:worried`, react(failure.phrase))
      : line(ROBOT_CAST[role], !byGuest && react ? react(failure.phrase ?? '') : say.stuck[role]);
  if (brief) return [reaction];
  const nudge = say.nudge(variableLabels(failure.reason), failureHint(failure.code, hints));
  const lines = [reaction, line('niko:worried', nudge)];
  if (!served?.[role]?.trim()) return lines;
  return [...lines, line('niko', say.served(ROBOT_DISPLAY_NAMES[role]))];
}

type Targets = Pick<LevelDefinition, 'block_target' | 'instruction_target'>;

/** Niko names the star target that was missed, by how much, and why it matters in the café. */
function starVerdict(result: RunResult, targets: Targets, say: ReactionWords['verdict']): string {
  if (result.stars <= 1) return say.one(result.block_count ?? 0, targets.block_target);
  if (result.stars === 2) return say.two(result.executed_instructions, targets.instruction_target);
  return say.three;
}

/**
 * The crew's reaction to a finished service, before the receipt: the shift's payoff scene, then Niko's verdict. Told
 * `brief`ly, for a shift served before, the payoff has been seen: only the verdict stays, and a watched shift goes
 * straight to its receipt. Beating the shift's `best` stars gets the robot's own cheer, in place of the stock one. The
 * crew speaks in `say`'s language; the payoff comes already said.
 */
export function successLines(
  result: RunResult,
  role: RobotRole,
  index: number,
  targets: Targets,
  payoff: DialogueLine[] = [],
  brief = false,
  best?: number,
  say: ReactionWords = REACTION_WORDS.en,
): DialogueLine[] {
  if (result.observation) return brief ? [] : payoff.length ? payoff : [line('niko:happy', say.watched)];
  const pool = say.cheers[role];
  const milestone =
    best !== undefined && result.stars > best ? [line(ROBOT_CAST[role], say.newBest[role](result.stars, best))] : [];
  const opening = brief
    ? []
    : payoff.length
      ? payoff
      : milestone.length
        ? []
        : [line(ROBOT_CAST[role], pool[index % pool.length])];
  return [...opening, ...milestone, line('niko:happy', starVerdict(result, targets, say.verdict))];
}
