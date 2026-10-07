import { line, ROBOT_DISPLAY_NAMES, roundRegulars, variableLabels } from '@/domain';
import type { CastId, DialogueLine, FailureCode, LevelDefinition, RobotPrograms, RobotRole, RunResult } from '@/domain';
import { FAILURE_WORDS } from './failureWords';
import { REACTION_WORDS, type ReactionWords } from './reactionWords';

const ROBOT_CAST: Record<RobotRole, CastId> = { query: 'query', prep: 'brew', floor: 'porter' };

interface FailureKind {
  /** Who reacts first: the guest who got the wrong thing, or the robot that got stuck. */
  by: 'guest' | 'robot';
  /** Without one, the robot that stopped says it’s stuck in its own words. */
  react?: (phrase: string) => string;
}

const LID: FailureKind = {
  by: 'robot',
  react: () => '*beep* Lid? No lid? Lid!',
};
const CLOSING: FailureKind = {
  by: 'robot',
  react: () => '*yawn beep* Bedtime?',
};
const UNCLEAR: FailureKind = {
  by: 'guest',
  react: (p) => `I said “${p}”… I’m not sure that came out right.`,
};
const JUMP: FailureKind = {
  by: 'robot',
  react: () => '*whirr?* Where was I?',
};
const HANDS_FULL: FailureKind = {
  by: 'robot',
  react: () => '*bzzt* Hands full. Cannot hold more.',
};
const EMPTY_HANDS: FailureKind = {
  by: 'robot',
  react: () => '*whirr* Hands empty. Nothing to put down.',
};

/**
 * Each failure gets a voice, chosen by its code rather than its wording, as its nudge is (`FAILURE_WORDS.hints`), so
 * rephrasing a message never changes what follows it. The record has to name every code, so a new failure can’t ship
 * mute.
 */
const kinds: Record<FailureCode, FailureKind> = {
  compile: { by: 'robot' },
  unsupported: { by: 'robot' },
  'loop-limit': {
    by: 'robot',
    react: () => '*whirrrrrr* Round and round. Very dizzy.',
  },
  'end-of-routine': {
    by: 'robot',
    react: () => '*whirr… click* All done? Not all done.',
  },
  'jump-across-block': JUMP,
  'return-outside-call': {
    by: 'robot',
    react: () => '*whirr?* Return… to where?',
  },
  'recursive-call': {
    by: 'robot',
    react: () => '*ring ring* …Line busy. I’m already in a call.',
  },
  'unset-variable': {
    by: 'robot',
    react: () => '*bip?* Memory slot… empty.',
  },
  'wrong-variable-kind': {
    by: 'robot',
    react: () => '*bip?* That’s not what I stored.',
  },
  'no-number': {
    by: 'robot',
    react: () => '*bip?* No number on this one.',
  },
  'no-job': {
    by: 'robot',
    react: () => '*beep?* Job? What job?',
  },
  'one-job-at-a-time': {
    by: 'robot',
    react: () => '*whirr* One job at a time!',
  },
  'unfinished-work': {
    by: 'robot',
    react: () => '*whirr* Still holding this. Forgot?',
  },
  starved: {
    by: 'robot',
    react: () => '*tap tap* Still waiting…',
  },
  'wrong-wait': {
    by: 'robot',
    react: () => '*tap tap* Any cups yet? …No?',
  },
  'out-of-reach': {
    by: 'robot',
    react: () => '*bonk* Too far. Arms not that long.',
  },
  'wrong-direction': {
    by: 'robot',
    react: () => '*whirr* Wrong way round.',
  },
  'wrong-spot': {
    by: 'robot',
    react: () => '*bonk* Wrong spot. Recalculating.',
  },
  'nothing-there': {
    by: 'robot',
    react: () => '*grab grab* …Nothing there yet.',
  },
  'empty-hands': EMPTY_HANDS,
  'hands-full': HANDS_FULL,
  'rush-first': {
    by: 'robot',
    react: () => '*alarm beep* Hurry! Hurry!',
  },
  'no-paper': {
    by: 'robot',
    react: () => '*bip?* Write on… the counter?',
  },
  'paper-in-hand': {
    by: 'robot',
    react: () => '*rustle rustle* One sheet at a time!',
  },
  'ticket-not-handed-over': {
    by: 'guest',
    react: (p) => `I said “${p}”… did that ever reach the kitchen?`,
  },
  'blank-ticket': {
    by: 'guest',
    react: (p) => `I said “${p}”. That’s not quite my order.`,
  },
  'no-ticket': {
    by: 'guest',
    react: (p) => `Hello? I said “${p}”. Is anyone writing this down?`,
  },
  'ticket-count': {
    by: 'guest',
    react: (p) => `I asked for “${p}”. That’s not the right number of drinks.`,
  },
  'ticket-item': {
    by: 'guest',
    react: (p) => `I said “${p}”. This isn’t what I ordered.`,
  },
  'ticket-sugar': {
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
  },
  'ticket-to-go-missing': {
    by: 'guest',
    react: (p) => `I said “${p}”. I’m taking it with me!`,
  },
  'ticket-to-go-extra': {
    by: 'guest',
    react: (p) => `I said “${p}”. I’m staying for this one.`,
  },
  'ticket-rush-missing': {
    by: 'guest',
    react: (p) => `“${p}”… and I really am in a hurry.`,
  },
  'ticket-rush-extra': {
    by: 'guest',
    react: (p) => `“${p}”. No hurry, really. I’ve got all afternoon.`,
  },
  'ticket-together-missing': {
    by: 'guest',
    react: (p) => `“${p}”… we did want them together.`,
  },
  'ticket-together-extra': {
    by: 'guest',
    react: (p) => `“${p}”. It’s just me today.`,
  },
  checkout: {
    by: 'guest',
    react: () => 'Um… can I pay now? Anyone?',
  },
  'unclear-order': UNCLEAR,
  'help-needed': {
    by: 'guest',
    react: (p) => `I said “${p}”… and that’s not what I meant at all.`,
  },
  'help-unneeded': {
    by: 'guest',
    react: (p) => `“${p}.” I thought that was clear enough?`,
  },
  'guessed-drink': {
    by: 'guest',
    react: () => 'Wait, what did you write down? I haven’t even decided yet.',
  },
  'stopped-listening': {
    by: 'guest',
    react: () => 'Hello? Is the counter closed already?',
  },
  'recipe-order': {
    by: 'robot',
    react: () => '*grrr-click* Machine not ready for that.',
  },
  'already-brewed': {
    by: 'robot',
    react: () => '*hiss* Machine says: done already!',
  },
  'not-brewed': {
    by: 'robot',
    react: () => '*beep beep* Wait! Drink not ready!',
  },
  'too-much-sugar': {
    by: 'robot',
    react: () => '*plop plop plop* …One too many?',
  },
  'sugar-count': {
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
  },
  'sugar-before-lid': LID,
  'lid-missing': LID,
  'lid-extra': LID,
  'no-clean-cups': {
    by: 'robot',
    react: () => '*clink clink* No cups! No cups!',
  },
  'recipe-not-function': {
    by: 'robot',
    react: () => '*bip* Beans grind water brew. Beans grind water b— *bzzt*',
  },
  'carry-more': {
    by: 'robot',
    react: () => '*huff puff* So… much… walking.',
  },
  'to-go-to-shelf': {
    by: 'guest',
    react: () => 'That one’s mine. I’m waiting by the door!',
  },
  'stay-in-to-table': {
    by: 'guest',
    react: () => 'Hey, I’m sitting right here!',
  },
  'wrong-table': {
    by: 'guest',
    react: () => 'Sorry, I don’t think that one’s mine.',
  },
  'wrong-dirty-table': {
    by: 'robot',
    react: () => '*beep?* No cup here.',
  },
  'table-not-cleared': {
    by: 'guest',
    react: () => 'Um… is someone going to clear this table?',
  },
  'table-apart': {
    by: 'guest',
    react: () => 'We said together… one of us is still waiting.',
  },
  'drink-cold': {
    by: 'guest',
    react: () => 'It’s gone cold… it must have been sitting there a while.',
  },
  'open-after-closing': CLOSING,
  'stopped-early': CLOSING,
  'closing-ticket': CLOSING,
};

const stuck: Record<RobotRole, string> = {
  query: 'Instruction unclear. *bzzt* Stopped.',
  prep: '*sad beep* Not know what next!',
  floor: '*bonk* Stuck!',
};

/** The nudge toward a fix for this kind of failure: the next useful thing to try. */
export const failureHint = (code: FailureCode, say: Record<FailureCode, string> = FAILURE_WORDS.en.hints): string =>
  say[code];

/**
 * A failed run told as a scene: the guest (a regular as themselves) or robot reacts, then Niko names the problem and
 * nudges. Told `brief`ly, for a slip the crew has already reacted to, only the reaction stays: the card under the
 * routine says the rest.
 * On a shift that went right before, Niko also points at the routine that was `served`, so a setback can be undone.
 */
export function failureLines(
  result: RunResult,
  fallbackRole: RobotRole,
  brief = false,
  served?: Partial<RobotPrograms>,
): DialogueLine[] {
  const failure = result.first_failure;
  if (!failure) return [];
  const role = failure.role ?? fallbackRole;
  const kind = kinds[failure.code];
  const guest = () => roundRegulars(result, failure.seed_id).get(failure.customer_id) ?? 'guest';
  const reaction =
    kind.by === 'guest' && kind.react && failure.phrase
      ? line(`${guest()}:worried`, kind.react(failure.phrase))
      : line(ROBOT_CAST[role], kind.by === 'robot' && kind.react ? kind.react(failure.phrase) : stuck[role]);
  if (brief) return [reaction];
  const lines = [reaction, line('niko:worried', `${variableLabels(failure.reason)} ${failureHint(failure.code)}`)];
  if (!served?.[role]?.trim()) return lines;
  const robot = ROBOT_DISPLAY_NAMES[role];
  return [
    ...lines,
    line(
      'niko',
      `${robot} got this shift right before, though. If you’d rather go back, Options → Restore ${robot}’s routine has the one you last served.`,
    ),
  ];
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
