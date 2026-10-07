import type { Customer, LevelDefinition, ProgressSave, ValidationSeed } from '@/domain/types';
import type { DialogueLine } from '@/domain/dialogue';
import { line } from '@/domain/dialogue';
import { UNLOCKS } from '@/domain/unlocks';
import type { Language } from '@/shared/language';
import { typeset } from '@/shared/typography';
import { memoriesFr, type MemoryFr } from './memories.fr';
import { validateLessonData, validateLevelData } from './campaign/validate';

/**
 * The memories: short optional shifts from Lou's café, before Niko's time, played back from the crew's own logs. A
 * memory plays with the tools of its day, the toolkit of the shift its level id names, and opens on routines of its
 * own rather than the café's. Its stars and routines are kept apart, so playing one never changes the campaign.
 */
export interface Memory {
  /** The save key and the address: #/memory/<id>. */
  id: string;
  title: string;
  /** Whose memory it is, on the board. */
  from: string;
  /** The campaign shift whose service brings it out: the player has the tools it plays with by then. */
  opens: number;
  /** A few words for the board. */
  hint: string;
  /** The last word on the receipt, where a campaign shift names the next one. */
  thanks: string;
  level: LevelDefinition;
  lesson: {
    note: string;
    starter: string;
    solution: string;
  };
  brief: { story: string; objective: string; concept: string };
  intro: DialogueLine[];
  outro: DialogueLine[];
}

/** One guest's order, as Query hears it and as the ticket must read. */
type Order = [phrase: string, item: 'coffee' | 'tea', sugar?: boolean];

/** Lou's three regulars first, in the order she wrote them down, then the bakery's night shift. */
const SATURDAY: readonly Order[] = [
  ['coffee with sugar', 'coffee', true],
  ['tea without sugar', 'tea', false],
  ['coffee', 'coffee'],
  ['coffee no sugar', 'coffee', false],
  ['tea with sugar', 'tea', true],
  ['coffee with sugar', 'coffee', true],
  ['tea', 'tea'],
  ['coffee, but no sugar please', 'coffee', false],
  ['tea without sugar', 'tea', false],
];

/**
 * A Saturday morning: nine guests a few seconds apart, the queue turned a third of the way round each round. Only
 * the first round opens on the three guests Lou wrote her routine for.
 */
function saturdaySeed(id: string, seed: number): ValidationSeed {
  const customers = SATURDAY.map((_, n): Customer => {
    const [phrase, item, sugar] = SATURDAY[(n + seed * 3) % SATURDAY.length];
    const tokens = [item, ...(sugar === undefined ? [] : ['sugar']), ...(sugar === false ? ['negation'] : [])];
    return {
      customer_id: `C${n + 1}`,
      arrival: n * 7,
      phrase,
      heard_orders: [{ tokens }],
      intent: {},
      expected: { item, ...(sugar !== undefined && { with_sugar: sugar }) },
    };
  });
  return { id: `${id}_${String.fromCharCode(65 + seed)}`, customers };
}

/**
 * Lou's first routine for Query: every step written twice, once for tea and once for coffee. The copies have drifted
 * apart, and the coffee one never learned "no sugar". Her three regulars never said it; the bakery does.
 */
const LOUS_ROUTINE = [
  'POSITION listen',
  'LISTEN',
  'TAKE UP',
  'IF tea IN CUSTOMER SPEECH',
  '  ITEM tea',
  '  IF sugar IN CUSTOMER SPEECH',
  '    IF negation IN CUSTOMER SPEECH',
  '      WRITE 0 sugar',
  '    ELSE',
  '      WRITE 1 sugar',
  '    END',
  '  END',
  '  MOVE RIGHT 1',
  '  DEPOSIT RIGHT',
  '  MOVE LEFT 1',
  'ELSE',
  '  ITEM coffee',
  '  IF sugar IN CUSTOMER SPEECH',
  '    WRITE 1 sugar',
  '  END',
  '  MOVE RIGHT 1',
  '  DEPOSIT RIGHT',
  '  MOVE LEFT 1',
  'END',
  'JUMP listen',
].join('\n');

/** The same steps once, for everyone: only the cup changes. */
const SAME_STEPS = [
  'POSITION listen',
  'LISTEN',
  'TAKE UP',
  'IF tea IN CUSTOMER SPEECH',
  '  ITEM tea',
  'ELSE',
  '  ITEM coffee',
  'END',
  'IF sugar IN CUSTOMER SPEECH',
  '  IF negation IN CUSTOMER SPEECH',
  '    WRITE 0 sugar',
  '  ELSE',
  '    WRITE 1 sugar',
  '  END',
  'END',
  'MOVE RIGHT 1',
  'DEPOSIT RIGHT',
  'MOVE LEFT 1',
  'JUMP listen',
].join('\n');

function dayOne(): Memory {
  const id = `L${String(UNLOCKS.sugar).padStart(2, '0')}-day-one`;
  // Query alone at work: one block a line.
  const reference = SAME_STEPS.split('\n').length;
  const level: LevelDefinition = {
    id,
    title: 'Day One',
    summary: 'Query’s first morning at Lou’s, on a routine with every step written twice.',
    programming_enabled: true,
    // Shift 5's margin: two blocks above the reference, and the instructions it runs with a tenth more.
    block_target: reference + 2,
    instruction_target: 423,
    reference_block_count: reference,
    seeds: [0, 1, 2].map((seed) => saturdaySeed(id, seed)),
    active_tables: 5,
    act: 1,
  };
  return {
    id: 'day-one',
    title: level.title,
    from: 'Query’s log',
    opens: UNLOCKS.help,
    hint: 'Same steps for everyone.',
    thanks: 'Last line of the log, in Lou’s hand: “Good robot. Same time next Saturday.”',
    level,
    lesson: {
      note: 'Lou wrote every step twice, once for tea and once for coffee, and the copies drifted apart: the coffee one never checks for Negation. Only the cup changes between them. Keep Write Tea and Write Coffee inside If Tea IN Orders, and put the sugar check and the walk to the rail after its End, once, for everyone.',
      starter: LOUS_ROUTINE,
      solution: SAME_STEPS,
    },
    brief: {
      story:
        'Two winters ago, on a Saturday. Lou wrote Query’s first routine with her three regulars in mind, and the bakery’s night shift came in behind them.',
      objective: 'Write a ticket for every guest of the morning, tea or coffee, with sugar, without, or as they said.',
      concept:
        'Steps copied into both sides of an If drift apart: a fix made to one copy never reaches the other. What every guest gets goes after the End, written once.',
    },
    intro: [
      line('', 'After closing. Query hums at the counter, its visor flickering through something old.'),
      line('query', '*bip* Old log found. Operator: Lou. Day one.'),
      line('niko:surprised', 'Your first day at Lou’s? Play it.'),
      line('', 'Two winters ago, on a Saturday. Six sharp, and a counter robot fresh out of its crate.'),
      line(
        'query',
        '*bip* Operator note: “Postman, coffee, one sugar. Rosa, tea, no sugar. The baker, coffee.” Routine written.',
      ),
      line('moka', 'Three? It’s Saturday, Lou. The bakery lets out at six.'),
      line('pip:happy', 'I’m on empties! Lou said I could!'),
      line('query', '*bip* Operator note, underlined twice: “Same steps for everyone. Only the cup changes.”'),
      line(
        'niko',
        'She wrote every step twice, once on each side of [IF tea IN CUSTOMER SPEECH|If]. The tea side and the coffee side, sugar and all.',
      ),
    ],
    outro: [
      line('query', '*bip* Day one. Tickets: nine. None wrong.'),
      line('moka', 'Hm. It’ll do. Cups go on the left, robot.'),
      line('pip:happy', 'Lou! It got every one right! Can it learn hot chocolate?'),
      line('', 'The log ends. The café is dark again, and Query’s visor dims to its usual mint.'),
      line('niko:happy', 'She wrote that note for you. Same steps for everyone.'),
      line('query', '*bip* Saved.'),
    ],
  };
}

export const memories: readonly Memory[] = [dayOne()];

export const memoryById = (id: string): Memory | undefined => memories.find((memory) => memory.id === id);

/** A memory with the French words over the English ones, set with French typography; a line not yet in French stays English. */
function inFrench(memory: Memory, fr: MemoryFr): Memory {
  const retold = (lines: readonly DialogueLine[], said: readonly string[]) =>
    lines.map((each, index) => ({ ...each, text: said[index] === undefined ? each.text : typeset(said[index]) }));
  return {
    ...memory,
    title: typeset(fr.title),
    from: typeset(fr.from),
    hint: typeset(fr.hint),
    thanks: typeset(fr.thanks),
    lesson: { ...memory.lesson, note: typeset(fr.note) },
    brief: {
      story: typeset(fr.brief.story),
      objective: typeset(fr.brief.objective),
      concept: typeset(fr.brief.concept),
    },
    intro: retold(memory.intro, fr.intro),
    outro: retold(memory.outro, fr.outro),
  };
}

const french = new Map(
  memories.map((memory) => {
    const fr = memoriesFr[memory.id];
    return [memory.id, fr ? inFrench(memory, fr) : memory];
  }),
);

/** A memory in the reader's language: the same level, routines and save key, told in their words. */
export const memoryIn = (memory: Memory, language: Language): Memory =>
  language === 'fr' ? (french.get(memory.id) ?? memory) : memory;

/** A memory comes out once the shift that opens it has been served. */
export const memoryOpen = (save: Pick<ProgressSave, 'stars'>, memory: Memory): boolean =>
  save.stars[memory.opens - 1] !== undefined;

/** Every memory satisfies the shared level and lesson invariants before play or build. */
for (const memory of memories) {
  const errors = [...validateLevelData(memory.level), ...validateLessonData(memory.lesson)];
  if (errors.length) throw new Error(`Invalid memory ${memory.id}: ${errors[0]}`);
}
