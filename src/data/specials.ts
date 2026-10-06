import type { Customer, LevelDefinition, RobotPrograms, ServiceConfig, ValidationSeed } from '@/domain/types';
import { benchKit, benchSeed, type BenchGuest } from '@/domain/bench';
import type { Regular } from '@/domain/regulars';
import type { DialogueLine } from '@/domain/dialogue';
import { line } from '@/domain/dialogue';
import { floorSource, preparationSource } from '@/domain/defaultPrograms';
import type { ShiftRules } from '@/domain/defaultPrograms';
import { countProgramBlocks } from '@/domain/scoring';
import { shiftNumber, UNLOCKS } from '@/domain/unlocks';
import { TABLE_LAYOUT } from '@/domain/layout/geometry';
import { extensionLevels, queryReference, referencePrograms } from './extension';
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
  by: Regular;
  /** A card on a menu the player picks from before the special: what it asks of the café, said up front. */
  card?: MenuCard;
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

/**
 * One card on a menu, shown side by side with the others before any is served: what is on it, who comes for it, and
 * the rule it brings. Each card is a special of its own, with its own guests, targets and stars.
 */
export interface MenuCard {
  /** The menu the card is on. */
  menu: string;
  /** What is on the board, drink by drink. */
  recipes: string;
  /** Who comes, how many and how fast. */
  demand: string;
  /** The rule the card brings with it. */
  constraint: string;
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

/** How long a drink keeps warm at Dot's knitting circle, in seconds from reaching pickup to reaching its guest. */
export const FRESH_SECONDS = 20;

/**
 * Dot's knitting circle: guests in a row, each with one drink and the sugar they count, and every drink served hot.
 * Shift 21's Porter waits for each guest to finish before fetching the next drink, so the next one cools at pickup.
 */
function knittingCircle(): Special {
  const rules: ShiftRules = { closing: true, fresh: true };
  const { level, solution } = benchShift({
    id: `L${TOOLKIT}-fresh`,
    title: 'While It’s Hot',
    summary: 'Dot’s knitting circle wants every cup hot, and a drink that waits at pickup goes cold.',
    rules,
    service: { closing: true, fresh: FRESH_SECONDS },
    rounds: [0, 1, 2].map((round) =>
      arriving(10, 3, (n) => ({
        orders: [{ drink: (n + round) % 2 ? 'tea' : 'coffee', sugar: (n + 2 * round) % 3 }],
      })),
    ),
    // Fair to the way most players in: Shift 21's routines, once Porter serves a drink before clearing the cup before
    // it. Two blocks above theirs, and a tenth more instructions, as for the reading group.
    targets: { blocks: 108, instructions: 2280 },
  });
  return {
    id: 'fresh',
    title: level.title,
    by: 'dot',
    hint: 'Nothing waits at pickup.',
    thanks: 'Thank you, dears. The circle meets again on Tuesday, and so will I.',
    level,
    lesson: {
      note: `Dot’s knitting circle wants every cup hot: a drink keeps warm ${FRESH_SECONDS} seconds once Brew sets it down at pickup. Porter serves the next drink before it clears the cup before it, so no drink waits on a guest still drinking. At closing time, Porter clears the last cup, then stops.`,
      starter: referencePrograms(21).query,
      solution: solution.query,
      robotStarter: referencePrograms(21),
      robotSolution: solution,
    },
    brief: {
      story:
        'Dot’s knitting circle meets on Tuesdays, and the library’s tea was always lukewarm. They’d like theirs the way Dot likes her sugar: exactly right.',
      objective: `Serve every guest and clear every table, each drink within ${FRESH_SECONDS} seconds of reaching pickup. At closing time, every robot stops.`,
      concept:
        'Waiting is something a routine chooses. Porter can wait for a cup while a drink cools, or serve the drink and fetch the cup after: the same work, in another order.',
    },
    intro: [
      line('', 'Tuesday afternoon. Dot comes in with a basket of wool, and her knitting circle behind her.'),
      line('dot:happy', 'We’ve been meeting at the library, dears, but their tea is always lukewarm.'),
      line('dot', 'One condition. Every cup arrives hot. Not warm. Hot.'),
      line(
        'niko',
        `A drink keeps warm ${FRESH_SECONDS} seconds once Brew sets it down at pickup. After that, it’s cold before it reaches the table.`,
      ),
      line(
        'niko:worried',
        'And Porter waits for each guest’s cup before it fetches the next drink. Pause the service and open Porter: it shows how long each drink has left.',
      ),
      line('porter', '*ding* Wait less. Understood.'),
    ],
    outro: [
      line('dot:happy', 'Hot, every one of them. The library can keep its lukewarm tea.'),
      line('porter', '*ding ding* Next cup first. Then the old one.'),
    ],
  };
}

/** A menu's own words, for its place on the specials board: it shows once, with its cards behind it. */
export interface Menu {
  id: string;
  title: string;
  by: Regular;
  story: string;
  hint: string;
}

const SATURDAY: Menu = {
  id: 'saturday',
  title: 'The Saturday Market',
  by: 'albert',
  story:
    'The street market is back on Saturdays, and Lou always chalked one menu for it, all morning. Mr. Albert wants to know which.',
  hint: 'Pick one menu, then program for what it brings.',
};

/** Every shift past the campaign has the toolkit the reading group gets: the campaign's, and Together besides. */
const TOOLKIT = UNLOCKS.together;
/** The guests a bench shift's rounds draw on: Shift 21's, so it asks for nothing the campaign didn't teach. */
const finaleKit = () => benchKit(extensionLevels[extensionLevels.length - 1]);

interface CardSpec {
  id: string;
  title: string;
  card: Omit<MenuCard, 'menu'>;
  rules: ShiftRules;
  service: Partial<ServiceConfig>;
  /** The round's guests, as a bench would have them; `round` is 0, 1 or 2. */
  guests: (round: number) => BenchGuest[];
  /**
   * Between the card's own reference and Shift 21's routines: the campaign's way of working serves any card, and a
   * routine cut to what the card brings earns its stars.
   */
  targets: { blocks: number; instructions: number };
  hint: string;
  thanks: string;
  brief: Special['brief'];
  intro: DialogueLine[];
  outro: DialogueLine[];
}

const MENU_OPENING = [
  line('', 'Saturday morning. Stalls are going up along the street outside.'),
  line('albert:happy', 'The market’s back. Lou always chalked a board for it: one menu, all morning.'),
  line('albert', 'Whatever the café does well. The market crowd won’t wait to be asked twice.'),
];

/**
 * A shift past the campaign whose rounds are written as a bench writes its guests, so each is expected exactly as the
 * campaign's guests who asked alike: the level, and the reference routines made of only the rules it brings.
 */
export function benchShift(spec: {
  id: string;
  title: string;
  summary: string;
  rules: ShiftRules;
  service: Partial<ServiceConfig>;
  /** Each round's guests, in order: A, B, C… */
  rounds: BenchGuest[][];
  targets: { blocks: number; instructions: number };
}): { level: LevelDefinition; solution: RobotPrograms } {
  // Shift 21 has no table that orders together; a shift whose rules bring one has them.
  const kit = { ...finaleKit(), together: !!spec.rules.together };
  const solution: RobotPrograms = {
    query: queryReference(spec.rules),
    prep: preparationSource(TOOLKIT, 1, spec.rules),
    floor: floorSource(TOOLKIT, 1, spec.rules),
  };
  const level: LevelDefinition = {
    id: spec.id,
    title: spec.title,
    summary: spec.summary,
    programming_enabled: true,
    block_target: spec.targets.blocks,
    instruction_target: spec.targets.instructions,
    reference_block_count: countProgramBlocks(solution, codeLines(solution.query), TOOLKIT),
    seeds: spec.rounds.map((guests, round) => ({
      id: `${spec.id}_${String.fromCharCode(65 + round)}`,
      // Numbered as the campaign's guests are, not as the bench's.
      customers: benchSeed(kit, guests).customers.map((guest, n) => ({ ...guest, customer_id: `C${n + 1}` })),
    })),
    active_tables: TABLE_LAYOUT.length,
    service: { prepCapacity: 2, floorCapacity: 2, clearing: true, objective: 'serve', ...spec.service },
    act: 4,
  };
  return { level, solution };
}

function menuCard(spec: CardSpec): Special {
  const { level, solution } = benchShift({
    id: `L${TOOLKIT}-${spec.id}`,
    title: spec.title,
    summary: `${SATURDAY.title}: ${spec.card.recipes}`,
    rules: spec.rules,
    service: spec.service,
    rounds: [0, 1, 2].map(spec.guests),
    targets: spec.targets,
  });
  return {
    id: spec.id,
    title: spec.title,
    by: SATURDAY.by,
    card: { menu: SATURDAY.id, ...spec.card },
    hint: spec.hint,
    thanks: spec.thanks,
    level,
    lesson: {
      note: `${spec.card.recipes} ${spec.card.demand} ${spec.card.constraint}`,
      starter: referencePrograms(21).query,
      solution: solution.query,
      robotStarter: referencePrograms(21),
      robotSolution: solution,
    },
    brief: spec.brief,
    intro: [...MENU_OPENING, ...spec.intro],
    outro: spec.outro,
  };
}

/** Guests `n` of a round, coming in `gap` seconds apart, the first as the café opens. */
const arriving = (count: number, gap: number, guest: (n: number) => Omit<BenchGuest, 'after'>): BenchGuest[] =>
  Array.from({ length: count }, (_, n) => ({ ...guest(n), after: n ? gap : 0 }));

const saturdayMenu: Special[] = [
  menuCard({
    id: 'tea-table',
    title: 'The Tea Table',
    card: {
      recipes: 'Tea only, with up to two sugars counted out.',
      demand: 'Twelve guests, one every five seconds; every fourth orders a pot for two.',
      constraint: 'Four cups in the whole café: they are washed as they come back.',
    },
    rules: { cups: true },
    service: { cups: 4 },
    guests: (round) =>
      arriving(12, 5, (n) => ({
        orders: Array.from({ length: n % 4 === 2 ? 2 : 1 }, (_, k) => ({
          drink: 'tea' as const,
          sugar: (n + round + k) % 3,
        })),
      })),
    targets: { blocks: 95, instructions: 2850 },
    hint: 'No coffee all morning: what does Brew still need?',
    thanks: 'Thank you. Keep the tea table for next Saturday, if the kettle can spare it.',
    brief: {
      story:
        'A tea table for the market: tea only, sugar counted out, and a pot for two now and then. The café puts out four cups and no more.',
      objective: 'Serve every guest and clear every table, with four cups in the whole café.',
      concept:
        'A routine fits the work in front of it. With one drink on the menu, a check that only ever goes one way is a block that can go.',
    },
    intro: [
      line('niko', 'Teas, then. Four cups out, so Brew washes them as they come back.'),
      line('brew', '*BEEP BEEP!* Kettle all morning! Is very good morning.'),
    ],
    outro: [
      line('albert:happy', 'Not a coffee all morning, and I didn’t miss it. Don’t tell anyone.'),
      line('brew', '*soft beep* Four cups. Washed many times. Still four.'),
    ],
  }),
  menuCard({
    id: 'espresso-bar',
    title: 'The Espresso Bar',
    card: {
      recipes: 'Coffee only, with up to two sugars counted out.',
      demand: 'Fourteen guests, one every three seconds; every other one in a rush.',
      constraint: 'A guest in a rush is made and served before anyone waiting.',
    },
    rules: { rush: true },
    service: {},
    guests: (round) =>
      arriving(14, 3, (n) => ({
        orders: [{ drink: 'coffee', sugar: (n + round) % 3, ...((n + round) % 2 === 1 && { rush: true }) }],
      })),
    targets: { blocks: 95, instructions: 2800 },
    hint: 'The quickest morning: no tea, no lids, and no closing.',
    thanks: 'Thank you. Every stall on the street opened on time, for once.',
    brief: {
      story:
        'An espresso bar for the market: coffee only, as quick as it comes, and half the street in a rush to open their stalls.',
      objective: 'Serve every guest and clear every table. A guest in a rush is served before anyone waiting.',
      concept:
        'The busiest card asks the least of each drink. What it asks of the order things happen in is all the more.',
    },
    intro: [
      line('niko', 'Coffee, quick. Anyone in a rush goes first.'),
      line('porter', '*ding* Rush first. Understood.'),
    ],
    outro: [
      line('albert:happy', 'The whole market had its coffee before the bread was out. Lou would have liked that.'),
      line('porter', '*ding ding* Fourteen coffees. Zero waiting.'),
    ],
  }),
  menuCard({
    id: 'market-hatch',
    title: 'The Market Hatch',
    card: {
      recipes: 'Coffee and tea, with up to two sugars counted out.',
      demand: 'Ten guests, one every four seconds; two in three take theirs to go.',
      constraint: 'The hatch closes when the market packs up: every robot stops at the last call.',
    },
    rules: { toGo: true, closing: true },
    service: { closing: true },
    guests: (round) =>
      arriving(10, 4, (n) => ({
        orders: [
          {
            drink: (n + round) % 2 ? 'tea' : 'coffee',
            sugar: (n + 2 * round) % 3,
            ...(n % 3 !== 2 && { toGo: true }),
          },
        ],
      })),
    targets: { blocks: 105, instructions: 2000 },
    hint: 'Lids and the last call, and a table now and then.',
    thanks: 'Thank you. Leave the hatch open next Saturday; the market will look for it.',
    brief: {
      story:
        'A hatch onto the market: both drinks, most of them to go, until the stalls pack up and the café closes with them.',
      objective: 'Serve every guest and clear every table. At the last call, every robot stops.',
      concept:
        'A card with two rules and fewer guests: the routine still has to handle each of them, but nothing the morning won’t ask.',
    },
    intro: [
      line('niko', 'The hatch, then. Everything to go, until the market packs up.'),
      line('query', '*bip* Lids on. Stop at the last call. Understood.'),
    ],
    outro: [
      line('albert:happy', 'Every cup out of the hatch with a lid on. I even kept mine for next week.'),
      line('query', '*bip bip* Hatch: closed. Market: served.'),
    ],
  }),
];

export const specials: readonly Special[] = [readingGroup(), knittingCircle(), ...saturdayMenu];

/** The menus chalked up for the specials board, each with its cards behind it. */
const menus: readonly Menu[] = [SATURDAY];

export const menuById = (id: string): Menu | undefined => menus.find((menu) => menu.id === id);

export const specialById = (id: string): Special | undefined => specials.find((special) => special.id === id);

/** Every special satisfies the shared level and lesson invariants before play or build. */
for (const special of specials) {
  const errors = [...validateLevelData(special.level), ...validateLessonData(special.lesson)];
  if (errors.length) throw new Error(`Invalid special ${special.id}: ${errors[0]}`);
}
