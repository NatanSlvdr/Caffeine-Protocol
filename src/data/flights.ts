import { drills } from './drills';
import { kits } from './kits';
import { predictions } from './predictions';

/**
 * A flight: a few drills on one idea, played one after another, the way a café pours a flight of small cups. Drills of
 * every kind from across the campaign go in, each opening as its own shift is served, so a flight never gives a
 * shift's answer away early. Its progress is the drills' own first-pick ticks: apart from stars, and never a gate.
 */
export interface Flight {
  id: string;
  /** The idea, named as a title. */
  title: string;
  /** The idea in a sentence, with no robot named: a flight shows before its later drills are open. */
  idea: string;
  /** The drills and moments to call, by id, in campaign order. tests/unit/data/flights.test.ts checks they exist. */
  items: string[];
}

export const flights: readonly Flight[] = [
  {
    id: 'in-order',
    title: 'Where a block goes',
    idea: 'The same blocks in another order make another routine.',
    items: ['paper-first', 'loop-destination', 'ticket-per-drink', 'wait-for-dirty'],
  },
  {
    id: 'which-way',
    title: 'Which way',
    idea: 'A check decides which blocks run and which are skipped.',
    items: ['if-else', 'tea-or-coffee', 'lid-to-go', 'skip-the-else', 'no-lid'],
  },
  {
    id: 'listening',
    title: 'Listening closely',
    idea: 'What a guest says and what they leave out: a “without”, a missing number, a mumble.',
    items: ['without-sugar', 'sugar-but-without', 'no-number', 'help-first', 'clear-order'],
  },
  {
    id: 'round-again',
    title: 'Round again',
    idea: 'A loop repeats its blocks once for each order, or as many times as a ticket says, even none.',
    items: ['loop-destination', 'ticket-per-drink', 'second-drink', 'sugar-count', 'zero-times'],
  },
  {
    id: 'out-and-back',
    title: 'Out and back',
    idea: 'A function runs somewhere else, then comes back to the block after its call.',
    items: ['back-after-call', 'after-return', 'after-deliver'],
  },
  {
    id: 'wherever-whenever',
    title: 'Wherever, whenever',
    idea: 'Go where the drink is for, wait until a cup is ready, and stop when the café closes.',
    items: ['table-variable', 'wait-for-dirty', 'stop-at-closing'],
  },
  {
    id: 'another-way',
    title: 'Another way to write it',
    idea: 'The same work, built without the block the worked example reaches for.',
    items: ['two-ifs', 'last-word', 'grinder-if', 'no-call', 'jump-past'],
  },
];

const shifts = new Map([...drills, ...predictions, ...kits].map((each) => [each.id, each.shift]));

/** The shift a drill of any kind opens with, once it is served. */
export const drillShift = (id: string): number => shifts.get(id)!;
