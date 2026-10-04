import { line, variableLabels } from '@/domain';
import type { CastId, DialogueLine, FailureCode, LevelDefinition, RobotRole, RunResult } from '@/domain';

const ROBOT_CAST: Record<RobotRole, CastId> = { query: 'query', prep: 'brew', floor: 'porter' };

interface FailureKind {
  /** Who reacts first: the guest who got the wrong thing, or the robot that got stuck. */
  by: 'guest' | 'robot';
  /** Without one, the robot that stopped says it’s stuck in its own words. */
  react?: (phrase: string) => string;
  hint: string;
}

const robotStuck = (hint: string): FailureKind => ({ by: 'robot', hint });

const LID: FailureKind = {
  by: 'robot',
  react: () => '*beep* Lid? No lid? Lid!',
  hint: 'To-go drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
};
const CLOSING: FailureKind = {
  by: 'robot',
  react: () => '*yawn beep* Bedtime?',
  hint: 'After Wait for Orders, check If Closed IN Orders, finish what’s in hand, and Stop.',
};
const UNCLEAR: FailureKind = {
  by: 'guest',
  react: (p) => `I said “${p}”… I’m not sure that came out right.`,
  hint: 'Guessing sends the wrong drink. Ask me with Help first, and I’ll find out what they meant.',
};
const JUMP: FailureKind = {
  by: 'robot',
  react: () => '*whirr?* Where was I?',
  hint: 'A Jump can’t cut into or out of a For loop or a function: let it reach its End, then jump.',
};
const HANDS_FULL: FailureKind = {
  by: 'robot',
  react: () => '*bzzt* Hands full. Cannot hold more.',
  hint: 'Put something down before picking up more.',
};
const EMPTY_HANDS: FailureKind = {
  by: 'robot',
  react: () => '*whirr* Hands empty. Nothing to put down.',
  hint: 'Pick it up first: a robot can only put down what it’s holding.',
};

/**
 * Each failure gets a voice and a nudge, chosen by its code rather than its wording, so rephrasing a message
 * never changes the hint that follows it. The record has to name every code, so a new failure can’t ship mute.
 */
const kinds: Record<FailureCode, FailureKind> = {
  compile: robotStuck('Fix the highlighted block, and the shift can run.'),
  unsupported: robotStuck('Look at the highlighted block.'),
  'loop-limit': {
    by: 'robot',
    react: () => '*whirrrrrr* Round and round. Very dizzy.',
    hint: 'Something loops forever. Make sure every loop waits for, or reaches, its next job.',
  },
  'end-of-routine': {
    by: 'robot',
    react: () => '*whirr… click* All done? Not all done.',
    hint: 'A robot runs its routine from top to bottom once. A Jump back to a jump destination at the top sends it round again for the next job.',
  },
  'jump-across-block': JUMP,
  'return-outside-call': {
    by: 'robot',
    react: () => '*whirr?* Return… to where?',
    hint: 'Return sends a robot back to the block after its Call, so it belongs inside a Function that a Call runs.',
  },
  'recursive-call': {
    by: 'robot',
    react: () => '*ring ring* …Calling myself?',
    hint: 'A function runs when a Call outside it asks: inside the function, finish its steps and let it reach End.',
  },
  'unset-variable': {
    by: 'robot',
    react: () => '*bip?* Memory slot… empty.',
    hint: 'A variable stays empty until a Store fills it: put the Store above the block that reads it.',
  },
  'wrong-variable-kind': {
    by: 'robot',
    react: () => '*bip?* That’s not what I stored.',
    hint: 'A variable holds whatever its Store put there: check that the Store reads the right thing.',
  },
  'no-number': {
    by: 'robot',
    react: () => '*bip?* No number on this one.',
    hint: 'Not every item carries a number, so only Store from one inside an If that checks for it.',
  },
  'no-job': {
    by: 'robot',
    react: () => '*beep?* Job? What job?',
    hint: 'A robot only acts on a job it has been handed. Start with the right Wait block, so it knows what to do.',
  },
  'one-job-at-a-time': {
    by: 'robot',
    react: () => '*whirr* One job at a time!',
    hint: 'Put down what it’s carrying where it belongs before Wait for Orders brings the next job.',
  },
  'unfinished-work': {
    by: 'robot',
    react: () => '*whirr* Still holding this. Forgot?',
    hint: 'A robot that picks something up has to see it through. Make sure every path through its routine puts it down where it belongs.',
  },
  starved: {
    by: 'robot',
    react: () => '*tap tap* Still waiting…',
    hint: 'The work it’s waiting for stopped somewhere before it: follow it back to the robot that should have passed it on.',
  },
  'out-of-reach': {
    by: 'robot',
    react: () => '*bonk* Too far. Arms not that long.',
    hint: 'A robot only reaches what’s right beside it: walk over before using it.',
  },
  'wrong-direction': {
    by: 'robot',
    react: () => '*whirr* Wrong way round.',
    hint: 'Take and Deposit reach the one tile their arrow points at: turn it toward the station.',
  },
  'wrong-spot': {
    by: 'robot',
    react: () => '*bonk* Wrong spot. Recalculating.',
    hint: 'Query listens and takes paper at the register, with the paper stack just above it. Tickets go one tile to the right, Deposit right at the kitchen handoff, and then it’s back to the register.',
  },
  'nothing-there': {
    by: 'robot',
    react: () => '*grab grab* …Nothing there yet.',
    hint: 'A robot only knows what to take once it has a job: Wait for Orders first.',
  },
  'empty-hands': EMPTY_HANDS,
  'hands-full': HANDS_FULL,
  'rush-first': {
    by: 'robot',
    react: () => '*alarm beep* Hurry! Hurry!',
    hint: 'A rush order comes first: finish it before waiting for anything else.',
  },
  'no-paper': {
    by: 'robot',
    react: () => '*bip?* Write on… the counter?',
    hint: 'Take up a sheet from the paper stack first: Query can only write on paper it’s holding.',
  },
  'paper-in-hand': {
    by: 'robot',
    react: () => '*rustle rustle* One sheet at a time!',
    hint: 'Each sheet goes to the kitchen handoff before Query starts on anything else: Deposit right, then take a fresh one.',
  },
  'ticket-not-handed-over': {
    by: 'guest',
    react: (p) => `I said “${p}”… did that ever reach the kitchen?`,
    hint: 'Writing the ticket is only half of it: the kitchen only makes what is handed over at the handoff.',
  },
  'blank-ticket': {
    by: 'guest',
    react: (p) => `I said “${p}”. That’s not quite my order.`,
    hint: 'The kitchen makes exactly what the ticket says, so write the drink on it before handing it over.',
  },
  'no-ticket': {
    by: 'guest',
    react: (p) => `Hello? I said “${p}”. Is anyone writing this down?`,
    hint: 'Every order needs a written ticket handed to the kitchen.',
  },
  'ticket-count': {
    by: 'guest',
    react: (p) => `I asked for “${p}”. That’s not the right number of drinks.`,
    hint: 'One sheet per drink they named, no more and no less: the kitchen makes exactly what it’s handed.',
  },
  'ticket-item': {
    by: 'guest',
    react: (p) => `I said “${p}”. This isn’t what I ordered.`,
    hint: 'Check what the order says before you write the drink.',
  },
  'ticket-sugar': {
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
    hint: 'Look closely at how much sugar they asked for, including none.',
  },
  'ticket-to-go-missing': {
    by: 'guest',
    react: (p) => `I said “${p}”. I’m taking it with me!`,
    hint: 'To-go orders say so: If To go IN item, then Write To go.',
  },
  'ticket-to-go-extra': {
    by: 'guest',
    react: (p) => `I said “${p}”. I’m staying for this one.`,
    hint: 'Only write To go when the order says so: check If To go IN item first.',
  },
  'ticket-rush-missing': {
    by: 'guest',
    react: (p) => `“${p}”… and I really am in a hurry.`,
    hint: 'Write Rush on their ticket, so the kitchen and the floor know.',
  },
  'ticket-rush-extra': {
    by: 'guest',
    react: (p) => `“${p}”. No hurry, really. I’ve got all afternoon.`,
    hint: 'Rush jumps the queue, so it’s only for guests who say they’re in a hurry: check If Rush IN item first.',
  },
  checkout: {
    by: 'guest',
    react: () => 'Um… can I pay now? Anyone?',
    hint: 'Head back to the register after the last ticket so the guest can pay.',
  },
  'unclear-order': UNCLEAR,
  'help-needed': {
    by: 'guest',
    react: (p) => `I said “${p}”… and that’s not what I meant at all.`,
    hint: 'When an order is unclear, ask me with Help before writing anything.',
  },
  'help-unneeded': {
    by: 'guest',
    react: (p) => `“${p}.” I thought that was clear enough?`,
    hint: 'Only ask for Help when the order really is unclear.',
  },
  'guessed-drink': {
    by: 'guest',
    react: () => 'Wait, what did you write down? I haven’t even decided yet.',
    hint: 'If nobody can clarify, don’t take a sheet at all.',
  },
  'stopped-listening': {
    by: 'guest',
    react: () => 'Hello? Is the counter closed already?',
    hint: 'The café doesn’t close after one guest: loop back to Wait for Orders so Query hears the next one.',
  },
  'recipe-order': {
    by: 'robot',
    react: () => '*grrr-click* Machine not ready for that.',
    hint: 'The recipe goes one step at a time, in order: do the next step before moving on.',
  },
  'already-brewed': {
    by: 'robot',
    react: () => '*hiss* Machine says: done already!',
    hint: 'A brewed drink is finished with the machine. Give it its sugar, or Deposit it up at pickup.',
  },
  'not-brewed': {
    by: 'robot',
    react: () => '*beep beep* Wait! Drink not ready!',
    hint: 'Finish the recipe before adding sugar, putting a lid on, or sending the drink out.',
  },
  'too-much-sugar': {
    by: 'robot',
    react: () => '*plop plop plop* …One too many?',
    hint: 'Brew adds exactly the sugar on the ticket: count it out, and stop there.',
  },
  'sugar-count': {
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
    hint: 'Brew adds exactly the sugar on the ticket: count it out, and stop there.',
  },
  'sugar-before-lid': LID,
  'lid-missing': LID,
  'lid-extra': LID,
  'no-clean-cups': {
    by: 'robot',
    react: () => '*clink clink* No cups! No cups!',
    hint: 'Every cup has to come back and be washed before it can go out again.',
  },
  'recipe-not-function': {
    by: 'robot',
    react: () => '*bip* Beans grind water brew. Beans grind water b— *bzzt*',
    hint: 'Wrap the recipe steps in Function recipe, then put Call recipe right after Wait for Orders: one name, one place to change.',
  },
  'carry-more': {
    by: 'robot',
    react: () => '*huff puff* So… much… walking.',
    hint: 'That’s what the bigger hands are for. Fill both before setting off, then finish both on the same trip.',
  },
  'to-go-to-shelf': {
    by: 'guest',
    react: () => 'That one’s mine. I’m waiting by the door!',
    hint: 'To-go drinks go on the to-go shelf by the door: walk there and Deposit down.',
  },
  'stay-in-to-table': {
    by: 'guest',
    react: () => 'Hey, I’m sitting right here!',
    hint: 'Only to-go drinks go on the shelf by the door. This one goes to the table on its ticket.',
  },
  'wrong-table': {
    by: 'guest',
    react: () => 'Sorry, I don’t think that one’s mine.',
    hint: 'The ticket names the table. Keep it and go there.',
  },
  'wrong-dirty-table': {
    by: 'robot',
    react: () => '*beep?* No cup here.',
    hint: 'Used cups don’t come with a ticket: Wait for Dirty cups names the table one was left on. Store its table and walk there before you Take it up.',
  },
  'table-not-cleared': {
    by: 'guest',
    react: () => 'Um… is someone going to clear this table?',
    hint: 'A clean table is the next guest’s first impression, and nobody sits at a messy one.',
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

/** A failed run told as a scene: the guest or robot reacts, then Niko names the problem and nudges. */
export function failureLines(result: RunResult, fallbackRole: RobotRole): DialogueLine[] {
  const failure = result.first_failure;
  if (!failure) return [];
  const role = failure.role ?? fallbackRole;
  const kind = kinds[failure.code];
  const reaction =
    kind.by === 'guest' && kind.react && failure.phrase
      ? line('guest:worried', kind.react(failure.phrase))
      : line(ROBOT_CAST[role], kind.by === 'robot' && kind.react ? kind.react(failure.phrase) : stuck[role]);
  return [reaction, line('niko:worried', `${variableLabels(failure.reason)} ${kind.hint}`)];
}

/** Stand-in cheers for shifts without a written payoff. */
const cheers: Record<RobotRole, string[]> = {
  query: ['*bip boop* Every order understood. Feeling: pleased?', '*bip* Zero errors. Is this… satisfaction?'],
  prep: ['*BEEP!* Every cup perfect! Ninety-two degrees!', '*sniff sniff* Smell that? Perfect service!'],
  floor: ['*ding ding!* Every guest served!', 'Zero spills! *bip* …Zero big spills.'],
};

type Targets = Pick<LevelDefinition, 'block_target' | 'instruction_target'>;

/** Niko names the star target that was missed, by how much, and why it matters in the café. */
function starVerdict(result: RunResult, targets: Targets): string {
  if (result.stars <= 1)
    return `Every guest served! The routine uses ${result.block_count ?? 0} blocks, though, and ${targets.block_target} would do: fewer blocks means less to fix when the menu changes.`;
  if (result.stars === 2)
    return `Every guest served, with a tidy routine too! The robots still took ${result.executed_instructions} steps where ${targets.instruction_target} would do: fewer steps and nobody waits as long.`;
  return 'Three stars. That’s the tidiest routine I’ve ever seen.';
}

/** The crew's reaction to a finished service, before the receipt: the shift's payoff scene, then Niko's verdict. */
export function successLines(
  result: RunResult,
  role: RobotRole,
  index: number,
  targets: Targets,
  payoff: DialogueLine[] = [],
): DialogueLine[] {
  if (result.observation)
    return payoff.length
      ? payoff
      : [line('niko:happy', 'And that’s a whole service, start to finish. Easy when you watch it, right?')];
  const pool = cheers[role];
  return [
    ...(payoff.length ? payoff : [line(ROBOT_CAST[role], pool[index % pool.length])]),
    line('niko:happy', starVerdict(result, targets)),
  ];
}
