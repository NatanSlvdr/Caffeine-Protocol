import { line, variableLabels } from '@/domain';
import type { CastId, DialogueLine, RobotRole, RunResult } from '@/domain';

const ROBOT_CAST: Record<RobotRole, CastId> = { query: 'query', prep: 'brew', floor: 'porter' };

interface FailureKind {
  match: RegExp;
  /** Who reacts first: the guest who got the wrong thing, or the robot that got stuck. */
  by: 'guest' | 'robot';
  react: (phrase: string) => string;
  hint: string;
}

/** Failure reasons are the simulator's own sentences; each family gets a voice and a nudge. */
const kinds: FailureKind[] = [
  {
    match: /is to go: Write To go|says To go/,
    by: 'guest',
    react: (p) => `I said “${p}”. I’m taking it with me!`,
    hint: 'Take-away orders say so: If To go IN item, then Write To go.',
  },
  {
    match: /in a rush: Write Rush|says Rush/,
    by: 'guest',
    react: (p) => `“${p}”… and I really am in a hurry.`,
    hint: 'Write Rush on their ticket, so the kitchen and the floor know.',
  },
  {
    match: /lid/,
    by: 'robot',
    react: () => '*beep* Lid? No lid? Lid!',
    hint: 'Take-away drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
  },
  {
    match: /to-go shelf|to go: it has no table/,
    by: 'guest',
    react: () => 'That one’s mine. I’m waiting by the door!',
    hint: 'Take-away drinks go on the to-go shelf by the door: walk there and Deposit down.',
  },
  {
    match: /clean cups|waiting at the sink/,
    by: 'robot',
    react: () => '*clink clink* No cups! No cups!',
    hint: 'Every cup has to come back and be washed before it can go out again.',
  },
  {
    match: /in a rush: (make|serve)/,
    by: 'robot',
    react: () => '*alarm beep* Hurry! Hurry!',
    hint: 'A rush order comes first: finish it before waiting for anything else.',
  },
  {
    match: /closing time|café is closed|keeping the café open|isn’t closing time/,
    by: 'robot',
    react: () => '*yawn beep* Bedtime?',
    hint: 'After Wait for Orders, check If Closed IN Orders, finish what’s in hand, and Stop.',
  },
  {
    match: /used cup is still on table/,
    by: 'guest',
    react: () => 'Um… is someone going to clear this table?',
    hint: 'A clean table is the next guest’s first impression, and nobody sits at a messy one.',
  },
  {
    match: /order is unclear|unsupported order/,
    by: 'guest',
    react: (p) => `I said “${p}”… I’m not sure that came out right.`,
    hint: 'Guessing sends the wrong drink. Ask me with Help first, and I’ll find out what they meant.',
  },
  {
    match: /does not match the customer|too few items|too many items|missing an item/,
    by: 'guest',
    react: (p) => `I said “${p}”. That’s not quite my order.`,
    hint: 'The kitchen makes exactly what the ticket says, so it has to say every drink they named, and nothing else.',
  },
  {
    match: /stopped listening/,
    by: 'guest',
    react: () => 'Hello? Is the counter closed already?',
    hint: 'The café doesn’t close after one guest: loop back to Wait for Orders so Query hears the next one.',
  },
  {
    match: /^Wait for (Orders first|a ready drink|an order ticket|dirty cups)/,
    by: 'robot',
    react: () => '*beep?* Job? What job?',
    hint: 'A robot only acts on a job it has been handed. Start with the right Wait block, so it knows what to do.',
  },
  {
    match: /requires carrying \d+ items together/,
    by: 'robot',
    react: () => '*huff puff* So… much… walking.',
    hint: 'This service is too busy for single trips. Fill both hands before setting off.',
  },
  {
    match: /Expected Query to ask for help/,
    by: 'guest',
    react: (p) => `I said “${p}”… and that’s not what I meant at all.`,
    hint: 'When an order is unclear, ask me with Help before writing anything.',
  },
  {
    match: /asked for help on a supported phrase/,
    by: 'guest',
    react: (p) => `“${p}.” I thought that was clear enough?`,
    hint: 'Only ask for Help when the order really is unclear.',
  },
  {
    match: /guess a drink/,
    by: 'guest',
    react: () => 'Wait, what did you write down? I haven’t even decided yet.',
    hint: 'If nobody can clarify, don’t take a sheet at all.',
  },
  {
    match: /No ticket was created/,
    by: 'guest',
    react: (p) => `Hello? I said “${p}”. Is anyone writing this down?`,
    hint: 'Every order needs a written ticket handed to the kitchen.',
  },
  {
    match: /Wrong ticket count/,
    by: 'guest',
    react: (p) => `I asked for “${p}”. That’s not the right number of drinks.`,
    hint: 'One sheet per drink, no more and no less.',
  },
  {
    match: /Wrong item/,
    by: 'guest',
    react: (p) => `I said “${p}”. This isn’t what I ordered.`,
    hint: 'Check what the order says before you write the drink.',
  },
  {
    match: /Finish brewing/,
    by: 'robot',
    react: () => '*beep beep* Wait! Drink not ready!',
    hint: 'Finish the recipe before adding sugar or sending the drink out.',
  },
  {
    match: /sugar/i,
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
    hint: 'Look closely at how much sugar they asked for, including none.',
  },
  {
    match: /checkout|payment/,
    by: 'guest',
    react: () => 'Um… can I pay now? Anyone?',
    hint: 'Head back to the register after the last ticket so the guest can pay.',
  },
  {
    match: /not table|no table|Store a table/,
    by: 'guest',
    react: () => 'Sorry, I don’t think that one’s mine.',
    hint: 'The ticket names the table. Keep it and go there.',
  },
  {
    match: /full|Deposit a drink before/,
    by: 'robot',
    react: () => '*bzzt* Hands full. Cannot hold more.',
    hint: 'Put something down before picking up more.',
  },
  {
    match: /Instruction limit/,
    by: 'robot',
    react: () => '*whirrrrrr* Round and round. Very dizzy.',
    hint: 'Something loops forever. Make sure every loop waits for, or reaches, its next job.',
  },
];

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
  const kind = kinds.find((k) => k.match.test(failure.reason));
  const robot = ROBOT_CAST[role];
  const reaction =
    kind?.by === 'guest' && failure.phrase
      ? line('guest:worried', kind.react(failure.phrase))
      : line(robot, kind && kind.by === 'robot' ? kind.react(failure.phrase) : stuck[role]);
  const reason = variableLabels(failure.reason);
  return [reaction, line('niko:worried', kind ? `${reason} ${kind.hint}` : `${reason} Look at the highlighted block.`)];
}

/** Stand-in cheers for shifts without a written payoff. */
const cheers: Record<RobotRole, string[]> = {
  query: ['*bip boop* Every order understood. Feeling: pleased?', '*bip* Zero errors. Is this… satisfaction?'],
  prep: ['*BEEP!* Every cup perfect! Ninety-two degrees!', '*sniff sniff* Smell that? Perfect service!'],
  floor: ['*ding ding!* Every guest served!', 'Zero spills! *bip* …Zero big spills.'],
};

/** Niko names the star target that was missed, and why it matters in the café. */
const starVerdict: Record<number, string> = {
  1: 'Every guest served! The routine is longer than it needs to be, though: fewer blocks means less to fix when the menu changes.',
  2: 'Every guest served, with a tidy routine too! The robots still take the long way round: fewer steps and nobody waits as long.',
  3: 'Three stars. That’s the tidiest routine I’ve ever seen.',
};

/** The crew's reaction to a finished service, before the receipt: the shift's payoff scene, then Niko's verdict. */
export function successLines(
  result: RunResult,
  role: RobotRole,
  index: number,
  payoff: DialogueLine[] = [],
): DialogueLine[] {
  if (result.observation)
    return payoff.length
      ? payoff
      : [line('niko:happy', 'And that’s a whole service, start to finish. Easy when you watch it, right?')];
  const pool = cheers[role];
  return [
    ...(payoff.length ? payoff : [line(ROBOT_CAST[role], pool[index % pool.length])]),
    line('niko:happy', starVerdict[Math.min(3, Math.max(1, result.stars))]),
  ];
}
