import type { BenchGuest } from '@/domain/bench';
import type { ShiftRules } from '@/domain/defaultPrograms';
import { line, type DialogueLine } from '@/domain/dialogue';
import type { LevelDefinition, RobotPrograms, ServiceConfig } from '@/domain/types';
import type { Regular } from '@/domain/regulars';
import { UNLOCKS } from '@/domain/unlocks';
import { referencePrograms } from './extension';
import { benchShift, TOGETHER_SECONDS } from './specials';
import { validateLessonData, validateLevelData } from './campaign/validate';

/**
 * The Long Day: an endurance service past the campaign. One café's routines, carried from wave to wave through a
 * day of exam week, each wave longer than the last and asking for everything the ones before it did and one thing
 * more. Between waves the routines can be changed; after each one the day can stop, and carry on later from the next.
 */
export interface Wave {
  /** 1, 2, 3… as the player counts them. */
  number: number;
  /** When in the day it comes: "Eight o’clock". */
  hour: string;
  title: string;
  /** What the wave asks for that the ones before it didn't, as a sentence. */
  adds: string;
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

interface WaveSpec {
  hour: string;
  title: string;
  adds: string;
  /** The rules this wave brings, on top of the ones before it. */
  rules: ShiftRules;
  service: Partial<ServiceConfig>;
  guests: BenchGuest[];
  /** The day's reference plus two blocks, and about a tenth more steps than it runs on this wave. */
  targets: { blocks: number; instructions: number };
  story: string;
  concept: string;
  intro: DialogueLine[];
  outro: DialogueLine[];
}

const LONG_DAY_TITLE = 'The Long Day';

/** Guests `n` of a wave, coming in `gap` seconds apart, the first as the wave starts. */
const arriving = (count: number, gap: number, guest: (n: number) => Omit<BenchGuest, 'after'>): BenchGuest[] =>
  Array.from({ length: count }, (_, n) => ({ ...guest(n), after: n ? gap : 0 }));
const drink = (n: number) => (n % 2 ? 'tea' : 'coffee') as 'tea' | 'coffee';

const SPECS: WaveSpec[] = [
  {
    hour: 'Eight o’clock',
    title: 'Opening',
    adds: 'Coffee and tea with sugar counted out, and now and then two drinks for one guest.',
    rules: {},
    service: {},
    guests: arriving(6, 5, (n) => ({
      orders: Array.from({ length: n === 3 ? 2 : 1 }, (_, k) => ({ drink: drink(n + k), sugar: (n + k) % 3 })),
    })),
    targets: { blocks: 124, instructions: 555 },
    story: 'Exam week, and the library is shut. The first students are in before the shutters are all the way up.',
    concept:
      'A long day is served by one set of routines. Whatever a wave needs that they don’t do yet, they’ll need for every wave after it.',
    intro: [
      line('', 'Exam week. The library is shut for repairs, and Juno has told everyone.'),
      line('juno:worried', 'So the whole year is revising here today. In waves, probably, between exams.'),
      line(
        'juno',
        'Same routines all day. Change them between waves if you have to; the students won’t wait for long.',
      ),
      line('niko', 'Wave by wave, then. And we stop whenever we need to.'),
    ],
    outro: [line('juno:happy', 'First wave down. They’re all still awake, which is a start.')],
  },
  {
    hour: 'Ten o’clock',
    title: 'Between exams',
    adds: 'Some take theirs to go, back to the exam hall.',
    rules: { toGo: true },
    service: {},
    guests: arriving(8, 4, (n) => ({
      orders: Array.from({ length: n === 5 ? 2 : 1 }, (_, k) => ({
        drink: drink(n + k + 1),
        sugar: (2 * n + k) % 3,
        ...(n % 3 === 0 && { toGo: true }),
      })),
    })),
    targets: { blocks: 124, instructions: 685 },
    story: 'The first exam lets out. Half of them stay to compare answers; the rest run back for the next one.',
    concept: 'A drink to go gets a lid and goes to the shelf, not a table. The guests who stay are served as before.',
    intro: [
      line('juno', 'The nine o’clock exam is out. Half of them are running straight back for the next one.'),
      line('query', '*bip* Lids for those leaving. Understood.'),
    ],
    outro: [line('porter', '*ding* To-go shelf: emptied. Twice.')],
  },
  {
    hour: 'Noon',
    title: 'Lunch',
    adds: 'Guests in a rush, and only four cups in the whole café.',
    rules: { toGo: true, rush: true, cups: true },
    service: { cups: 4 },
    guests: arriving(10, 3, (n) => ({
      orders:
        n === 7
          ? [
              { drink: drink(n), sugar: 2 },
              { drink: drink(n + 1), sugar: 0 },
            ]
          : [
              {
                drink: drink(n),
                sugar: (n + 1) % 3,
                ...(n % 3 === 2 && { toGo: true }),
                ...(n % 4 === 1 && { rush: true }),
              },
            ],
    })),
    targets: { blocks: 124, instructions: 850 },
    story: 'Lunch. Everyone is late for something, and the spare cups went to the exam hall with the invigilators.',
    concept:
      'A guest in a rush is made and served before anyone waiting. With four cups, each one is washed as it comes back.',
    intro: [
      line('juno:worried', 'Lunch. Everyone’s late for something, and somebody took the spare cups to the exam hall.'),
      line('brew', '*BEEP BEEP!* Four cups only. Brew washes very fast!'),
    ],
    outro: [line('brew', '*proud beep* Washed, washed, washed. Still four cups!')],
  },
  {
    hour: 'Two o’clock',
    title: 'Revision',
    adds: 'Some mumble their order over their notes, and have to be asked.',
    rules: { toGo: true, rush: true, cups: true },
    service: { cups: 4 },
    guests: arriving(10, 3, (n) =>
      n % 4 === 2
        ? { orders: [{ drink: drink(n + 1), sugar: n % 3 }], mumbles: true }
        : n === 5
          ? {
              orders: [
                { drink: drink(n), sugar: 1 },
                { drink: drink(n + 1), sugar: 1 },
              ],
            }
          : {
              orders: [
                {
                  drink: drink(n + 1),
                  sugar: (2 * n) % 3,
                  ...(n % 3 === 0 && { toGo: true }),
                  ...(n % 5 === 4 && { rush: true }),
                },
              ],
            },
    ),
    targets: { blocks: 124, instructions: 850 },
    story: 'The quiet hours. Nobody looks up from their notes, and half the orders come out as a mumble.',
    concept: 'An order nobody can make out is asked about, never guessed: Query asks, and writes what it hears back.',
    intro: [
      line('juno', 'Two o’clock is the worst. They order without looking up from their notes.'),
      line('query', '*bip* Unclear orders will be asked about. Politely.'),
    ],
    outro: [line('juno:happy', 'Nobody got a drink they didn’t order. That’s more than the library manages.')],
  },
  {
    hour: 'Four o’clock',
    title: 'Study groups',
    adds: `Tables that order together, and want their drinks within ${TOGETHER_SECONDS} seconds of each other.`,
    rules: { toGo: true, rush: true, cups: true, together: true },
    service: { cups: 4, together: TOGETHER_SECONDS },
    guests: arriving(12, 3, (n) =>
      n % 4 === 3
        ? {
            orders: [
              { drink: drink(n), sugar: n % 3 },
              { drink: drink(n + 1), sugar: (n + 1) % 3 },
            ],
            together: true,
          }
        : n === 6
          ? { orders: [{ drink: drink(n), sugar: 1 }], mumbles: true }
          : n === 5
            ? {
                orders: [
                  { drink: drink(n), sugar: 0 },
                  { drink: drink(n + 1), sugar: 2 },
                ],
              }
            : {
                orders: [
                  {
                    drink: drink(n),
                    sugar: (n + 2) % 3,
                    ...(n % 3 === 1 && { toGo: true }),
                    ...(n % 5 === 2 && { rush: true }),
                  },
                ],
              },
    ),
    targets: { blocks: 124, instructions: 1200 },
    story: 'Study groups pull tables together for the afternoon, and order for the whole table at once.',
    concept: `A table that orders together gets its drinks on one tray and one visit, all within ${TOGETHER_SECONDS} seconds of the first.`,
    intro: [
      line('juno', 'Four o’clock, study groups. A table that orders together wants its drinks together.'),
      line('porter', '*ding* Same table. Same tray. Same visit.'),
    ],
    outro: [line('porter', '*ding ding* Tables served together: every one.')],
  },
  {
    hour: 'Six o’clock',
    title: 'Last orders',
    adds: 'The closing call: once the last guest is served, every robot stops.',
    rules: { toGo: true, rush: true, cups: true, together: true, closing: true },
    service: { cups: 4, together: TOGETHER_SECONDS, closing: true },
    guests: arriving(14, 2, (n) =>
      n % 5 === 4
        ? {
            orders: [
              { drink: drink(n + 1), sugar: (n + 1) % 3 },
              { drink: drink(n), sugar: n % 3 },
            ],
            together: true,
          }
        : n % 6 === 3
          ? { orders: [{ drink: drink(n), sugar: 2 }], mumbles: true }
          : n === 7
            ? {
                orders: [
                  { drink: drink(n), sugar: 1 },
                  { drink: drink(n + 1), sugar: 2 },
                ],
              }
            : {
                orders: [
                  {
                    drink: drink(n + 1),
                    sugar: n % 3,
                    ...(n % 3 === 0 && { toGo: true }),
                    ...(n % 4 === 2 && { rush: true }),
                  },
                ],
              },
    ),
    targets: { blocks: 124, instructions: 1320 },
    story: 'The last exam is over. Everyone comes in at once to celebrate, and then the café closes for the night.',
    concept:
      'At the closing call, every robot finishes what it holds and stops: the day ends with nobody still waiting.',
    intro: [
      line('juno:worried', 'Last exam’s done. Everyone’s coming in at once, and then you close.'),
      line('niko', 'Last wave. Then everybody stops, robots included.'),
    ],
    outro: [
      line('juno:happy', 'That’s the day. I passed, by the way. I think the café did too.'),
      line('query', '*bip bip* Long day: served.'),
    ],
  },
];

/** Every wave is served with the routines one café carries all day, so each has the same reference: all of them. */
const DAY_RULES = SPECS.reduce<ShiftRules>((all, spec) => ({ ...all, ...spec.rules }), {});

function wave(spec: WaveSpec, index: number): Wave {
  const number = index + 1;
  const { level, solution } = benchShift({
    id: `L${UNLOCKS.together}-wave-${String.fromCharCode(97 + index)}`,
    title: spec.title,
    summary: `${LONG_DAY_TITLE}, wave ${number}: ${spec.adds}`,
    rules: DAY_RULES,
    service: spec.service,
    rounds: [spec.guests],
    targets: spec.targets,
  });
  const before = SPECS.slice(0, index).map((each) => each.adds);
  return {
    number,
    hour: spec.hour,
    title: spec.title,
    adds: spec.adds,
    level,
    lesson: {
      note: spec.adds,
      starter: referencePrograms(21).query,
      solution: solution.query,
      robotStarter: referencePrograms(21),
      robotSolution: solution,
    },
    brief: {
      story: spec.story,
      objective: `Serve every guest and clear every table. New this wave: ${lower(spec.adds)}${
        before.length ? ' Everything the waves before it asked for still comes in.' : ''
      }`,
      concept: spec.concept,
    },
    intro: spec.intro,
    outro: spec.outro,
  };
}

const lower = (sentence: string) => sentence.charAt(0).toLowerCase() + sentence.slice(1);

export const longDay = {
  /** The save's key for the day's routines, and the address: #/long-day. */
  id: 'long-day',
  title: LONG_DAY_TITLE,
  by: 'juno' as Regular,
  story:
    'Exam week, and the library is shut: Juno’s whole year is revising at the café, in waves, from opening to close.',
  hint: 'One set of routines, all day. Stop after any wave, and carry on later.',
  /**
   * Which waves a saved day was on. A day open on an older set carries on from the first wave, with its routines kept.
   */
  version: 1,
  waves: SPECS.map(wave),
};

/** What the receipt says after a wave: what the next one brings, or the day's end. */
export function waveThanks(number: number): string {
  const next = longDay.waves[number];
  return next
    ? `Wave ${number} of ${longDay.waves.length} served. Next, at ${lower(next.hour)}: ${lower(next.adds)}`
    : 'Thank you. Same table tomorrow? Kidding. Mostly.';
}

/** Every wave satisfies the shared level and lesson invariants before play or build. */
for (const { level, lesson, number } of longDay.waves) {
  const errors = [...validateLevelData(level), ...validateLessonData(lesson)];
  if (errors.length) throw new Error(`Invalid wave ${number}: ${errors[0]}`);
}
