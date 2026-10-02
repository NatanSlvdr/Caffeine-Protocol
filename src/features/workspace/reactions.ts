import { line, variableLabels } from '@/domain';
import type { CastId, DialogueLine, LevelDefinition, RobotRole, RunResult } from '@/domain';

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
    hint: 'To-go orders say so: If To go IN item, then Write To go.',
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
    hint: 'To-go drinks leave with a lid on, after their sugar. Drinks that stay in don’t need one.',
  },
  {
    match: /to-go shelf|to go: it has no table/,
    by: 'guest',
    react: () => 'That one’s mine. I’m waiting by the door!',
    hint: 'To-go drinks go on the to-go shelf by the door: walk there and Deposit down.',
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
    match: /kitchen never got/,
    by: 'guest',
    react: (p) => `I said “${p}”… did that ever reach the kitchen?`,
    hint: 'Writing the ticket is only half of it: the kitchen only makes what is handed over at the handoff.',
  },
  {
    match: /handed over too (few|many) tickets|has no drink written/,
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
    match: /^Wait for (Orders first|Orders or Wait for Dirty cups first|a ready drink|an order ticket|dirty cups)/,
    by: 'robot',
    react: () => '*beep?* Job? What job?',
    hint: 'A robot only acts on a job it has been handed. Start with the right Wait block, so it knows what to do.',
  },
  {
    match: /is still holding .+ waiting for/,
    by: 'robot',
    react: () => '*whirr* Still holding this. Forgot?',
    hint: 'A robot that picks something up has to see it through. Make sure every path through its program puts it down where it belongs.',
  },
  {
    match: /reached the end of its program/,
    by: 'robot',
    react: () => '*whirr… click* All done? Not all done.',
    hint: 'A robot runs its program from top to bottom once. A Jump back to a Position marker at the top sends it round again for the next job.',
  },
  {
    match: /recipe isn’t in a function yet/,
    by: 'robot',
    react: () => '*bip* Beans grind water brew. Beans grind water b— *bzzt*',
    hint: 'Wrap the recipe steps in Function recipe, then put Call recipe right after Wait for Orders: one name, one place to change.',
  },
  {
    match: /at a time: this shift/,
    by: 'robot',
    react: () => '*huff puff* So… much… walking.',
    hint: 'That’s what the bigger hands are for. Fill both before setting off, then finish both on the same trip.',
  },
  {
    match: /had to ask for help/,
    by: 'guest',
    react: (p) => `I said “${p}”… and that’s not what I meant at all.`,
    hint: 'When an order is unclear, ask me with Help before writing anything.',
  },
  {
    match: /asked for help on an order it could read/,
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
    match: /No ticket was written/,
    by: 'guest',
    react: (p) => `Hello? I said “${p}”. Is anyone writing this down?`,
    hint: 'Every order needs a written ticket handed to the kitchen.',
  },
  {
    match: /but Query wrote \d+ tickets?/,
    by: 'guest',
    react: (p) => `I asked for “${p}”. That’s not the right number of drinks.`,
    hint: 'One sheet per drink, no more and no less.',
  },
  {
    match: /has the wrong item/,
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
    match: /takes .+, but it has \d+/,
    by: 'guest',
    react: (p) => `I said “${p}”. The sugar’s all wrong.`,
    hint: 'Brew adds exactly the sugar on the ticket: count it out, and stop there.',
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
    match: /dirty cup is on table/,
    by: 'robot',
    react: () => '*beep?* No cup here.',
    hint: 'Used cups don’t come with a ticket: Wait for Dirty cups names the table one was left on. Store its table and walk there before you Take it up.',
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
    match: /^Move to .+ first/,
    by: 'robot',
    react: () => '*bonk* Too far. Arms not that long.',
    hint: 'A robot only reaches what’s right beside it: walk over before using it.',
  },
  {
    match: /^Carry a .+ before/,
    by: 'robot',
    react: () => '*whirr* Hands empty. Nothing to put down.',
    hint: 'Pick it up first: a robot can only put down what it’s holding.',
  },
  {
    match: /Instruction limit|keeps going round its loop/,
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
