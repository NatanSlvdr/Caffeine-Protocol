import type { Customer, LevelDefinition, RobotPrograms, ValidationSeed } from '@/domain/types';
import type { DialogueLine } from '@/domain/dialogue';
import { line } from '@/domain/dialogue';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import type { ShiftRules } from '@/domain/defaultPrograms';
import { countProgramBlocks } from '@/domain/scoring';
import { shiftNumber, UNLOCKS } from '@/domain/unlocks';
import { TABLE_LAYOUT } from '@/domain/layout/geometry';
import { queryReference, referencePrograms } from './extension';
import { validateLessonData, validateLevelData } from './campaign/validate';

/**
 * The specials: optional shifts past the campaign, each asked for by a regular, with one new rule and its own save.
 * A special plays with the whole campaign's toolkit and opens on the routines Shift 21 was served with, so the
 * player brings their own café to it. Serving one never changes the campaign: its stars and routines are kept apart.
 */
export interface Special {
  /** The save key and the address: #/special/<id>. */
  id: string;
  title: string;
  /** The regular who asked for it. */
  by: 'rosa';
  /** A few words for the campaign page. */
  hint: string;
  /** The regular's thanks on the receipt, where a campaign shift names the next one. */
  thanks: string;
  level: LevelDefinition;
  lesson: {
    note: string;
    starter: string;
    solution: string;
    robotStarter: RobotPrograms;
    robotSolution: RobotPrograms;
  };
  brief: { story: string; objective: string; concept: string };
  intro: DialogueLine[];
  outro: DialogueLine[];
}

/** How close together a table that orders together gets its drinks, in seconds after the first one. */
export const TOGETHER_SECONDS = 4;

const sugars = (n: number) => `${n} sugar${n === 1 ? '' : 's'}`;
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);

/**
 * Rosa's reading group: guests on their own, and every third one a table of two who order together. Drinks
 * alternate and sugar cycles as on the campaign's shifts, so no two rounds ask for quite the same.
 */
function readingGroupSeed(id: string, seed: number): ValidationSeed {
  const customers = Array.from({ length: 10 }, (_, n): Customer => {
    const drink = (k: number) => ((n + seed + k) % 2 ? ('tea' as const) : ('coffee' as const)),
      sugar = (k: number) => (n + seed + k) % 3;
    const base = { customer_id: `C${n + 1}`, arrival: n * 6 };
    if (n % 3 === 1) {
      const orders = [0, 1].map((k) => ({ item: drink(k), sugar_count: sugar(k), together: true as const }));
      return {
        ...base,
        phrase: `${capital(orders.map((o) => `${o.item}, ${sugars(o.sugar_count)}`).join(' and '))}, together please`,
        heard_orders: orders.map((o) => ({
          tokens: [o.item, 'sugar', 'number', 'together'],
          number: o.sugar_count,
        })),
        intent: { orders: orders.map((o) => ({ drink: o.item, sugar_count: o.sugar_count, together: true })) },
        expected: { tickets: orders },
      };
    }
    return {
      ...base,
      phrase: `${capital(drink(0))}, ${sugars(sugar(0))}`,
      heard_orders: [{ tokens: [drink(0), 'sugar', 'number'], number: sugar(0) }],
      intent: { confidence: 'clear', drink: drink(0), sugar_count: sugar(0) },
      expected: { item: drink(0), sugar_count: sugar(0) },
    };
  });
  return { id: `${id}_${String.fromCharCode(65 + seed)}`, customers };
}

/** Non-comment source lines in one program, as the scorer counts Query's. */
const codeLines = (source: string) =>
  source.split('\n').filter((code) => code.trim() && !code.trim().startsWith('#')).length;

function readingGroup(): Special {
  const id = `L${UNLOCKS.together}-together`,
    toolkit = shiftNumber(id);
  const rules: ShiftRules = { together: true };
  const solution: RobotPrograms = {
    query: queryReference(rules),
    prep: preparationSource(toolkit),
    floor: floorSource(toolkit, 1, rules),
  };
  const level: LevelDefinition = {
    id,
    title: 'Bound Together',
    summary: 'Rosa’s reading group orders for the table, and every table gets its drinks together.',
    programming_enabled: true,
    // Fair to the way most players in: the routines Shift 21 was served with, once they serve a table together.
    // Two blocks above theirs, and a tenth more instructions, as on the campaign's shifts.
    block_target: 124,
    instruction_target: 2981,
    reference_block_count: countProgramBlocks(solution, codeLines(solution.query), toolkit),
    seeds: [0, 1, 2].map((seed) => readingGroupSeed(id, seed)),
    active_tables: TABLE_LAYOUT.length,
    service: {
      prepCapacity: 2,
      floorCapacity: 2,
      clearing: true,
      objective: 'serve',
      together: TOGETHER_SECONDS,
    },
    act: 4,
  };
  const note =
    'Rosa’s reading group orders for the table, and nobody starts until every cup is down. Query writes Together on each ticket of a table that orders together. Porter checks If Together IN Orders: Wait for Orders brings the rest of that table’s order next, so both go on one tray and are served on one visit, within 4 seconds.';
  return {
    id: 'together',
    title: level.title,
    by: 'rosa',
    hint: 'One tray, one visit.',
    thanks: 'Thank you. The reading group will be back next Thursday.',
    level,
    lesson: {
      note,
      starter: referencePrograms(21).query,
      solution: solution.query,
      robotStarter: referencePrograms(21),
      robotSolution: solution,
    },
    brief: {
      story:
        'Rosa’s reading group wants a home on Thursdays. They order for the table, and the reading starts once every cup is down.',
      objective: `Serve every guest and clear every table. A table that orders together gets all its drinks within ${TOGETHER_SECONDS} seconds of the first one.`,
      concept:
        'A mark on a ticket carries what the guest said to the robots that never hear them. Together tells Porter to wait for the rest of the order, and to carry it all at once.',
    },
    intro: [
      line('', 'A quiet afternoon, a week after the busiest day. Rosa comes in with a stack of paperbacks.'),
      line('rosa:happy', 'My reading group needs a new home. Thursdays, here, if you’ll have us.'),
      line(
        'rosa',
        'One rule. We order for the table, and nobody starts until every cup is down. A tea that waits for a coffee goes cold.',
      ),
      line(
        'niko',
        'Then a table that orders together gets its drinks together. [WRITE together|Write Together] goes on each of its tickets.',
      ),
      line(
        'niko',
        'Porter checks [IF together IN CUSTOMER SPEECH|If Together IN Orders]. Wait for Orders brings the rest of that table’s order next, so both cups go on one tray.',
      ),
      line(
        'niko:worried',
        `Rosa’s timing it, too: all of a table’s drinks within ${TOGETHER_SECONDS} seconds of the first.`,
      ),
      line('porter', '*ding* One tray. One visit. Understood.'),
    ],
    outro: [
      line('rosa:happy', 'Every cup down at once, and every one still hot. Same time next Thursday?'),
      line('porter', '*ding ding* Same tray. Same visit.'),
    ],
  };
}

export const specials: readonly Special[] = [readingGroup()];

export const specialById = (id: string): Special | undefined => specials.find((special) => special.id === id);

/** Every special satisfies the shared level and lesson invariants before play or build. */
for (const special of specials) {
  const errors = [...validateLevelData(special.level), ...validateLessonData(special.lesson)];
  if (errors.length) throw new Error(`Invalid special ${special.id}: ${errors[0]}`);
}
