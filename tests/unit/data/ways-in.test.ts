import { describe, expect, it } from 'vitest';
import { levels, lessons } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { preparationSource } from '../../../src/domain/defaultPrograms';
import type { ShiftRules } from '../../../src/domain/defaultPrograms';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { FailureCode } from '../../../src/domain/failures';
import type { RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';

/**
 * A shift's seeds have to tell right from wrong for more than its worked example. docs/campaign/AUDIT.md lists, for
 * each shift, the other routines that serve it and the slips players are likely to make. Here every way in has to
 * pass every seed, and every slip has to be turned away, for the reason the slip is about.
 */
interface Routine {
  name: string;
  /** The robots' routines that differ from the reference. */
  programs: Partial<RobotPrograms>;
}
interface Slip extends Routine {
  code: FailureCode;
}

const query = (level: number) => (level >= UNLOCKS.prep ? referencePrograms(level).query : lessons[level - 1].solution);
const prep = (level: number) => referencePrograms(level).prep;
const floor = (level: number) => referencePrograms(level).floor;

/** The source with one passage rewritten; the passage has to be there, so a changed reference can't pass quietly. */
function edit(source: string, from: string, to: string): string {
  if (!source.includes(from)) throw new Error(`Not in the routine:\n${from}`);
  return source.replace(from, to);
}

function run(level: number, programs: Partial<RobotPrograms>) {
  const robots = level >= UNLOCKS.prep;
  const all = { ...(robots ? referencePrograms(level) : { query: query(level), prep: '', floor: '' }), ...programs };
  return runLevel(levels[level - 1], compileProgram(all.query, level), robots ? all : undefined);
}

/** The rules the crew has met by an Act IV shift: each one stays handled once it has come in. */
const met = (level: number): ShiftRules => ({
  toGo: true,
  cups: level >= UNLOCKS.cups,
  rush: level >= UNLOCKS.rush,
  closing: level >= UNLOCKS.closing,
});

/** Brew's routine from Double Trouble, still claiming two tickets at a time, with every rule met so far. */
const batchedBrew = (level: number) => preparationSource(level, 2, met(level));

/** Porter's clearing, written out in full: one function can't call another. */
const CLEAR = ['WAIT DIRTY', 'STORE var1 FROM table', 'MOVE var1', 'TAKE UP', 'MOVE var2', 'MOVE RIGHT 1'].concat(
  'DEPOSIT DOWN',
  'MOVE LEFT 1',
);

/**
 * Porter's routine from Tea for Two, still carrying two drinks, with every rule met so far: each delivery goes to the
 * to-go shelf, or to its table and clears it. A rush drink is served before claiming another, and at closing the
 * drink already on the tray is served before stopping.
 */
function batchedPorter(level: number): string {
  const { rush, closing } = met(level);
  return [
    'STORE var2 FROM here',
    'POSITION listen',
    'LISTEN',
    ...(closing ? ['IF closed IN CUSTOMER SPEECH', 'STOP', 'END'] : []),
    'TAKE DOWN',
    ...(rush ? ['IF rush IN CUSTOMER SPEECH', 'CALL deliver', 'JUMP listen', 'END'] : []),
    'LISTEN',
    ...(closing ? ['IF closed IN CUSTOMER SPEECH', 'CALL deliver', 'STOP', 'END'] : []),
    'TAKE DOWN',
    'CALL deliver',
    'CALL deliver',
    'JUMP listen',
    'FUNCTION deliver',
    'IF togo IN CUSTOMER SPEECH',
    'MOVE LEFT 12',
    'DEPOSIT DOWN',
    'MOVE var2',
    'ELSE',
    'STORE var1 FROM table',
    'MOVE var1',
    'DEPOSIT UP',
    'MOVE var2',
    ...CLEAR,
    'END',
    'RETURN',
    'END',
  ].join('\n');
}

const batched = (level: number): Routine[] => [
  { name: 'has Brew still claim two tickets at a time', programs: { prep: batchedBrew(level) } },
  // In a Hurry has no Closed to tell a Porter carrying two that the last drink is the last: see its slips.
  ...(level === UNLOCKS.rush
    ? []
    : [{ name: 'has Porter still carry two drinks', programs: { floor: batchedPorter(level) } }]),
  { name: 'keeps both robots working in batches', programs: { prep: batchedBrew(level), floor: batchedPorter(level) } },
];

const L05_CHECKS = `IF sugar IN CUSTOMER SPEECH
  IF negation IN CUSTOMER SPEECH
    WRITE 0 sugar
  ELSE
    WRITE 1 sugar
  END
END`;
const L07_CHECKS = `  IF number IN item
    STORE var1 FROM number
    WRITE var1 sugar
  ELSE
    IF sugar IN item
      IF negation IN item
        WRITE 0 sugar
      ELSE
        WRITE 1 sugar
      END
    END
  END`;
const HELP_FIRST = 'IF ambiguous IN CUSTOMER SPEECH\n  HELP\nEND\n';
const SUGAR_LOOP = 'STORE var1 FROM sugar\nFOR var1 TIMES\nTAKE UP\nEND';
const TO_GO_SHELF =
  'IF togo IN CUSTOMER SPEECH\nMOVE LEFT 12\nDEPOSIT DOWN\nMOVE var2\nELSE\nCALL deliver\nCALL clear\nEND';
const MARKS = '  IF togo IN item\n    WRITE togo\n  END\n  IF rush IN item\n    WRITE rush\n  END';

/** Routines that serve a shift other than its reference, as AUDIT.md's "Routines" lines name them. */
const WAYS_IN: Record<string, Routine[]> = {
  L04: [
    {
      name: 'tests for coffee instead of tea',
      programs: {
        query: edit(
          query(4),
          'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nELSE\n  ITEM coffee',
          'IF coffee IN CUSTOMER SPEECH\n  ITEM coffee\nELSE\n  ITEM tea',
        ),
      },
    },
  ],
  L05: [
    {
      name: 'tests Negation first, with the sugar check in its Else',
      programs: {
        query: edit(
          query(5),
          L05_CHECKS,
          'IF negation IN CUSTOMER SPEECH\n  WRITE 0 sugar\nELSE\n  IF sugar IN CUSTOMER SPEECH\n    WRITE 1 sugar\n  END\nEND',
        ),
      },
    },
    {
      name: 'uses two flat checks joined with And',
      programs: {
        query: edit(
          query(5),
          L05_CHECKS,
          'IF sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH\n  WRITE 1 sugar\nEND\nIF negation IN CUSTOMER SPEECH\n  WRITE 0 sugar\nEND',
        ),
      },
    },
  ],
  L07: [
    {
      name: 'uses flat checks, keeping the yes/no one off counted orders with And',
      programs: {
        query: edit(
          query(7),
          L07_CHECKS,
          `  IF number IN item
    STORE var1 FROM number
    WRITE var1 sugar
  END
  IF sugar IN item AND number NOT IN item AND negation NOT IN item
    WRITE 1 sugar
  END
  IF negation IN item
    WRITE 0 sugar
  END`,
        ),
      },
    },
  ],
  L10: [
    {
      name: 'writes a whole recipe for each drink',
      programs: {
        prep: [
          'POSITION listen',
          'LISTEN',
          'IF coffee IN CUSTOMER SPEECH',
          ...['MOVE RIGHT 1', 'TAKE UP', 'MOVE RIGHT 3', 'USE UP', 'MOVE RIGHT 5', 'TAKE UP', 'MOVE LEFT 5', 'USE UP'],
          ...['MOVE RIGHT 4', 'DEPOSIT UP', 'MOVE LEFT 8'],
          'ELSE',
          ...['MOVE RIGHT 1', 'TAKE UP', 'MOVE RIGHT 8', 'TAKE UP', 'MOVE LEFT 5', 'USE UP'],
          ...['MOVE RIGHT 4', 'DEPOSIT UP', 'MOVE LEFT 8'],
          'END',
          'JUMP listen',
        ].join('\n'),
      },
    },
  ],
  L11: [
    {
      name: 'uses a ladder of Ifs on the count',
      programs: {
        prep: edit(prep(11), SUGAR_LOOP, 'IF count = 1\nTAKE UP\nEND\nIF count = 2\nTAKE UP\nTAKE UP\nEND'),
      },
    },
  ],
  L14: [
    {
      name: 'delivers in the main loop, without a function',
      programs: {
        floor: edit(
          edit(floor(14), 'CALL deliver', 'STORE var1 FROM table\nMOVE var1\nDEPOSIT UP\nMOVE var2'),
          '\nFUNCTION deliver\nSTORE var1 FROM table\nMOVE var1\nDEPOSIT UP\nMOVE var2\nRETURN\nEND',
          '',
        ),
      },
    },
  ],
  L17: batched(17),
  L18: [
    {
      name: 'has Brew wash a cup before taking the next one, not after each drink',
      programs: {
        prep: edit(
          edit(prep(18), 'DEPOSIT UP\nMOVE RIGHT 1\nUSE UP\nMOVE LEFT 9', 'DEPOSIT UP\nMOVE LEFT 8'),
          'FUNCTION recipe\nMOVE RIGHT 1\nTAKE UP',
          'FUNCTION recipe\nMOVE RIGHT 9\nUSE UP\nMOVE LEFT 8\nTAKE UP',
        ),
      },
    },
    ...batched(18),
  ],
  L19: batched(19),
  L20: batched(20),
  L21: batched(21),
};

/** Routines that slip the way AUDIT.md's "Likely slip" lines expect, and the failure each has to meet. */
const SLIPS: Record<string, Slip[]> = {
  L02: [
    {
      name: 'writes before taking up paper',
      programs: { query: edit(query(2), 'TAKE UP\nITEM coffee', 'ITEM coffee\nTAKE UP') },
      code: 'no-paper',
    },
    {
      name: 'never walks back to the register',
      programs: { query: edit(query(2), '\nMOVE LEFT 1', '') },
      code: 'wrong-spot',
    },
  ],
  L03: [
    {
      name: 'puts the destination below Wait for Orders',
      programs: { query: edit(query(3), 'POSITION listen\nLISTEN', 'LISTEN\nPOSITION listen') },
      code: 'loop-limit',
    },
    {
      name: 'jumps back before walking back',
      programs: { query: edit(query(3), 'MOVE LEFT 1\nJUMP listen', 'JUMP listen') },
      code: 'wrong-spot',
    },
  ],
  L04: [
    {
      name: 'has an If with no Else, then Coffee for everyone',
      programs: {
        query: edit(
          query(4),
          'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nELSE\n  ITEM coffee\nEND',
          'IF tea IN CUSTOMER SPEECH\n  ITEM tea\nEND\nITEM coffee',
        ),
      },
      code: 'ticket-item',
    },
  ],
  L05: [
    {
      name: 'has one If on Sugar, which sweetens the “without” orders',
      programs: { query: edit(query(5), L05_CHECKS, 'IF sugar IN CUSTOMER SPEECH\n  WRITE 1 sugar\nEND') },
      code: 'ticket-sugar',
    },
  ],
  L06: [
    {
      name: 'checks the whole speech instead of the item',
      programs: { query: query(6).replaceAll('IN item', 'IN CUSTOMER SPEECH') },
      code: 'ticket-item',
    },
    {
      name: 'takes paper once, outside the loop',
      programs: { query: edit(query(6), 'FOR item IN heard orders\n  TAKE UP', 'TAKE UP\nFOR item IN heard orders') },
      code: 'no-paper',
    },
  ],
  L07: [
    {
      name: 'checks for a number after the yes/no sugar check',
      programs: {
        query: edit(
          query(7),
          L07_CHECKS,
          `  IF sugar IN item
    IF negation IN item
      WRITE 0 sugar
    ELSE
      WRITE 1 sugar
    END
  ELSE
    IF number IN item
      STORE var1 FROM number
      WRITE var1 sugar
    END
  END`,
        ),
      },
      code: 'ticket-sugar',
    },
  ],
  L08: [
    {
      name: 'asks for Help inside the loop, after taking paper',
      programs: {
        query: edit(
          edit(query(8), HELP_FIRST, ''),
          '  TAKE UP\n',
          '  TAKE UP\n  IF ambiguous IN CUSTOMER SPEECH\n    HELP\n  END\n',
        ),
      },
      code: 'unclear-order',
    },
    { name: 'guesses a coffee', programs: { query: edit(query(8), HELP_FIRST, '') }, code: 'unclear-order' },
  ],
  L09: [
    {
      name: 'takes water before grinding',
      programs: {
        prep: edit(
          prep(9),
          'MOVE RIGHT 3\nUSE UP\nMOVE RIGHT 5\nTAKE UP\nMOVE LEFT 5\nUSE UP',
          'MOVE RIGHT 8\nTAKE UP\nMOVE LEFT 5\nUSE UP\nUSE UP',
        ),
      },
      code: 'recipe-order',
    },
  ],
  L11: [
    {
      name: 'puts one cube in for any sugar',
      programs: { prep: edit(prep(11), SUGAR_LOOP, 'IF sugar IN CUSTOMER SPEECH\nTAKE UP\nEND') },
      code: 'sugar-count',
    },
    {
      name: 'puts a cube in every drink, forgetting that zero means none',
      programs: { prep: edit(prep(11), SUGAR_LOOP, 'TAKE UP') },
      code: 'too-much-sugar',
    },
  ],
  L12: [
    {
      name: 'lets the main loop run into the function',
      programs: { prep: edit(prep(12), 'CALL recipe\nJUMP listen', 'CALL recipe') },
      code: 'end-of-routine',
    },
  ],
  L13: [
    {
      name: 'claims two tickets and makes one',
      programs: { prep: edit(prep(13), 'CALL recipe\nCALL recipe', 'CALL recipe') },
      code: 'hands-full',
    },
  ],
  L14: [
    {
      name: 'uses fixed moves to one table',
      programs: { floor: edit(floor(14), 'MOVE var1', 'MOVE UP 2') },
      code: 'wrong-table',
    },
    {
      name: 'stores the table before claiming the drink',
      programs: {
        floor: edit(
          edit(floor(14), 'LISTEN\nTAKE DOWN', 'STORE var1 FROM table\nLISTEN\nTAKE DOWN'),
          'FUNCTION deliver\nSTORE var1 FROM table',
          'FUNCTION deliver',
        ),
      },
      code: 'no-job',
    },
  ],
  L15: [
    {
      name: 'clears at delivery time, without waiting for the guest',
      programs: { floor: edit(floor(15), 'WAIT DIRTY\n', '') },
      code: 'no-job',
    },
    {
      name: 'leaves the cup on the counter',
      programs: { floor: edit(floor(15), 'MOVE RIGHT 1\nDEPOSIT DOWN\nMOVE LEFT 1', 'DEPOSIT DOWN') },
      code: 'out-of-reach',
    },
  ],
  L16: [
    {
      name: 'reads one table for both drinks',
      programs: {
        floor: edit(
          edit(floor(16), 'CALL deliver\nCALL deliver', 'STORE var1 FROM table\nCALL deliver\nCALL deliver'),
          'FUNCTION deliver\nSTORE var1 FROM table',
          'FUNCTION deliver',
        ),
      },
      code: 'wrong-table',
    },
  ],
  L17: [
    {
      name: 'fixes Query only',
      programs: { prep: prep(16), floor: floor(16) },
      code: 'lid-missing',
    },
    {
      name: 'puts a lid on every drink',
      programs: { prep: edit(prep(17), 'IF togo IN CUSTOMER SPEECH\nTAKE UP\nEND', 'TAKE UP') },
      code: 'lid-extra',
    },
    {
      name: 'walks a take-away drink to a table',
      programs: { floor: edit(floor(17), TO_GO_SHELF, 'CALL deliver\nCALL clear') },
      code: 'to-go-to-shelf',
    },
  ],
  L19: [
    {
      name: 'has Brew batch round a rush order',
      programs: { prep: preparationSource(19, 2, { ...met(19), rush: false }) },
      code: 'rush-first',
    },
    {
      name: 'has Porter batch round a rush order',
      programs: { floor: batchedPorter(18) },
      code: 'rush-first',
    },
    {
      // Rush drinks go out one at a time, so behind a Brew making one drink at a time the rest don't pair up, and
      // nothing tells Porter the service is over.
      name: 'has Porter carry two, breaking out for rush drinks, then wait with the last drink for a second',
      programs: { floor: batchedPorter(19) },
      code: 'unfinished-work',
    },
  ],
  L20: [
    {
      name: 'stops Query only',
      programs: { prep: prep(19), floor: floor(19) },
      code: 'open-after-closing',
    },
    {
      name: 'has Brew stop at closing with half a batch claimed',
      programs: {
        prep: edit(
          batchedBrew(20),
          'IF closed IN CUSTOMER SPEECH\nCALL recipe\nSTOP',
          'IF closed IN CUSTOMER SPEECH\nSTOP',
        ),
      },
      code: 'unfinished-work',
    },
    {
      name: 'has Porter stop at closing with a drink on the tray',
      programs: { floor: edit(batchedPorter(20), 'CALL deliver\nSTOP', 'STOP') },
      code: 'unfinished-work',
    },
  ],
  L21: [
    {
      name: 'has Query write only one mark when an order is to go and in a rush',
      programs: {
        query: edit(
          query(21),
          MARKS,
          '  IF togo IN item\n    WRITE togo\n  ELSE\n    IF rush IN item\n      WRITE rush\n    END\n  END',
        ),
      },
      code: 'ticket-rush-missing',
    },
    {
      name: 'has Porter take every rush drink to a table, even one to go',
      programs: {
        floor: edit(
          batchedPorter(21),
          'IF rush IN CUSTOMER SPEECH\nCALL deliver',
          [
            'IF rush IN CUSTOMER SPEECH',
            'STORE var1 FROM table',
            'MOVE var1',
            'DEPOSIT UP',
            'MOVE var2',
            ...CLEAR,
          ].join('\n'),
        ),
      },
      code: 'to-go-to-shelf',
    },
  ],
};

const cases = <T extends Routine>(table: Record<string, T[]>) =>
  Object.entries(table).flatMap(([id, routines]) => routines.map((routine) => [id, routine.name, routine] as const));

describe('the ways into each shift', () => {
  it.each(cases(WAYS_IN))('%s is served by a routine that %s', (id, _, { programs }) => {
    const result = run(Number(id.slice(1)), programs);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(levels[Number(id.slice(1)) - 1].seeds.length);
  });
});

describe('the slips each shift catches', () => {
  it.each(cases(SLIPS))('%s turns away a routine that %s', (id, _, { programs, code }) => {
    const result = run(Number(id.slice(1)), programs);
    expect(result.passed).toBe(false);
    expect(result.first_failure?.code).toBe(code);
  });
});

describe('what the seeds hold', () => {
  const tickets = (level: number) =>
    levels[level - 1].seeds.flatMap((seed) =>
      seed.customers.flatMap((customer) => customer.expected.tickets ?? [customer.expected]),
    );

  it('give every drink every sugar count, once Brew makes two at a time', () => {
    for (let level = UNLOCKS.functions + 1; level <= levels.length; level++) {
      const seen = new Set(tickets(level).map((ticket) => `${ticket.item} ${ticket.sugar_count}`));
      for (const item of ['coffee', 'tea']) for (const n of [0, 1, 2]) expect(seen).toContain(`${item} ${n}`);
    }
  });
  it('give each Act IV rule its tickets in every seed, and the finale an order both to go and in a rush', () => {
    const marked = (level: number, mark: 'to_go' | 'rush') =>
      levels[level - 1].seeds.every((seed) => seed.customers.some((customer) => customer.expected[mark]));
    expect(marked(UNLOCKS.toGo, 'to_go')).toBe(true);
    expect(marked(UNLOCKS.rush, 'rush')).toBe(true);
    expect(marked(levels.length, 'to_go') && marked(levels.length, 'rush')).toBe(true);
    for (const seed of levels.at(-1)!.seeds)
      expect(seed.customers.some(({ expected }) => expected.to_go && expected.rush)).toBe(true);
  });
  it('leave a robot that claims two at a time with half a batch at closing', () => {
    for (const level of [UNLOCKS.closing, levels.length])
      for (const seed of levels[level - 1].seeds)
        expect(seed.customers.reduce((n, customer) => n + (customer.expected.tickets?.length ?? 1), 0) % 2).toBe(1);
  });
  it('bring back groups and unclear orders in the finale', () => {
    for (const seed of levels.at(-1)!.seeds) {
      expect(seed.customers.some(({ expected }) => expected.ask_help)).toBe(true);
      expect(seed.customers.some(({ expected }) => (expected.tickets?.length ?? 0) > 1)).toBe(true);
    }
  });
});
