import { count, evaluateQueryComparison, isBenchSeed, parseConditionExpression, spokenBlock } from '@/domain';
import type {
  BenchEase,
  FailureCode,
  LevelDefinition,
  RobotPrograms,
  RunFailure,
  RunRecord,
  TraceStep,
} from '@/domain';
import { guestCalled } from './route';

/**
 * A failed run, kept beside the code after the café moves on: what stopped, where, and the routines it stopped on.
 * It outlives edits, so the player can fix with the evidence in view, and goes stale the moment the routines differ.
 */
export interface RunEvidence {
  failure: RunFailure;
  /** Every robot's routine as it ran: any edit makes the evidence describe a routine that's no longer there. */
  programs: Readonly<RobotPrograms>;
  /** The run was practice of one round, not the full service. */
  practice: boolean;
  /** The round was a bench the player wrote, not one of the shift's own. */
  bench: boolean;
  /** The shift's rules that bench eased; missing when it eased none, or wasn't a bench. */
  eased?: readonly BenchEase[];
  /** Which round of guests, counting from 1. */
  round: number;
  /** Which guest of that round, counting from 1; nothing for the closing call, which belongs to no guest. */
  guest?: number;
  /** That guest as the café knows them: a regular by name, anyone else by number, "Guest 3". */
  name?: string;
  /** The IFs Query tested for that guest, in order, each with why it went the way it did. */
  decisions: Decision[];
}

/** One IF Query tested: which way it went, and why, from what Query heard rather than what the guest meant. */
export interface Decision {
  line: number;
  /** The IF as the block reads, like "if tea in orders". */
  condition: string;
  holds: boolean;
  /** Each part of a condition joined by And or Or, and whether it held; empty when there's only one part. */
  parts: { text: string; holds: boolean }[];
  /** What Query heard in each place the IF looked, like "orders: coffee, sugar". */
  heard: string[];
}

const TOKEN_WORDS: Record<string, string> = { togo: 'to go' };
const word = (token: string) => TOKEN_WORDS[token] ?? token;
const placeWord = (source: string) => (source === 'CUSTOMER SPEECH' ? 'orders' : source);

/** Why each IF in a stretch of Query's trace went the way it did. */
export function decisionsOf(trace: readonly TraceStep[]): Decision[] {
  return trace.flatMap(({ line, command, decision }) => {
    const expression = decision && parseConditionExpression(command);
    if (!decision || !expression) return [];
    const bindings = Object.fromEntries(Object.entries(decision.heard).map(([source, tokens]) => [source, { tokens }]));
    const parts =
      expression.conditions.length < 2
        ? []
        : expression.conditions.map((condition) => ({
            text: `${word(condition.left)} ${condition.operator === 'IN' ? 'in' : 'not in'} ${placeWord(condition.right)}`,
            holds: evaluateQueryComparison(condition, bindings),
          }));
    const heard = Object.entries(decision.heard).map(
      ([source, tokens]) => `${placeWord(source)}: ${tokens.length ? tokens.map(word).join(', ') : 'nothing'}`,
    );
    return [
      { line, condition: spokenBlock(command).replace(/\btogo\b/g, word('togo')), holds: decision.holds, parts, heard },
    ];
  });
}

/** The evidence a failed run leaves; nothing for a run that passed. */
export function evidenceOf(level: LevelDefinition, record: RunRecord): RunEvidence | null {
  const failure = record.result.first_failure;
  if (record.result.passed || !failure) return null;
  const seed = level.seeds.findIndex((s) => s.id === failure.seed_id),
    guest = seed < 0 ? -1 : level.seeds[seed].customers.findIndex((c) => c.customer_id === failure.customer_id);
  const event = record.result.events.findLast(
    (e) => e.seed_id === failure.seed_id && e.customer.customer_id === failure.customer_id,
  );
  return {
    failure,
    decisions: decisionsOf(event?.trace ?? []),
    programs: record.programs,
    practice: record.mode === 'practice',
    bench: isBenchSeed(failure.seed_id),
    ...(level.seeds[seed]?.eased && { eased: level.seeds[seed].eased }),
    round: Math.max(seed, 0) + 1,
    guest: guest < 0 ? undefined : guest + 1,
    name: guest < 0 ? undefined : guestCalled(level, failure.seed_id, failure.customer_id),
  };
}

/** True once any robot's routine differs from the one that ran: the evidence, or record, no longer describes the code. */
export function isStale(evidence: Pick<RunEvidence, 'programs'>, programs: RobotPrograms): boolean {
  return (Object.keys(evidence.programs) as (keyof RobotPrograms)[]).some(
    (role) => evidence.programs[role] !== programs[role],
  );
}

/** What a comparison row is about, so the card can draw an icon beside the words. */
export type Aspect = 'drink' | 'tickets' | 'sugar' | 'to-go' | 'rush' | 'together' | 'lid' | 'table' | 'facing';

/** One thing the guest or ticket wanted, against what the routine produced. */
export interface Difference {
  aspect: Aspect;
  label: string;
  wanted: string;
  got: string;
}

/** A failure's comparison: what each column means, and a row per difference. */
export interface Comparison {
  /** Column headings, like “Ordered” against “Handed over”. */
  columns: [wanted: string, got: string];
  rows: Difference[];
  /** Which ticket of the order the rows are about, when the order had more than one. */
  ticket?: number;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const drink = (item: unknown) => (typeof item === 'string' && item ? capital(item) : 'Nothing written');
const sugar = (value: unknown) =>
  typeof value === 'boolean'
    ? value
      ? 'With sugar'
      : 'No sugar'
    : Number(value)
      ? count(Number(value), 'sugar')
      : 'No sugar';
const place = (value: unknown) =>
  value === 'shelf' ? 'To-go shelf' : value === undefined ? 'Somewhere else' : `Table ${value}`;

const QUERY: Comparison['columns'] = ['Ordered', 'Handed over'];
const BREW: Comparison['columns'] = ['Ticket', 'Cup'];
const PORTER: Comparison['columns'] = ['Ticket', 'Went to'];

/**
 * Expected against actual, from the failure's code and the values it carries, never from its wording. Failures that
 * aren't about the order, like a routine that won't compile or a robot in the wrong place, compare nothing: the card
 * shows their own details instead of an empty ticket.
 */
export function comparisonOf(failure: RunFailure): Comparison | undefined {
  const { code, context = {} } = failure,
    { expected, actual, ticket } = context;
  const tickets = failure.expected.tickets ?? (failure.expected.item ? [failure.expected] : []);
  // Only number a ticket when the order had several: “ticket 1” of one is noise.
  const which = tickets.length > 1 ? ticket : undefined;
  const query = (row: Difference): Comparison => ({ columns: QUERY, rows: [row], ticket: which });
  const rows: Partial<Record<FailureCode, () => Comparison>> = {
    'ticket-item': () => query({ aspect: 'drink', label: 'Drink', wanted: drink(expected), got: drink(actual) }),
    'ticket-sugar': () => query({ aspect: 'sugar', label: 'Sugar', wanted: sugar(expected), got: sugar(actual) }),
    'ticket-to-go-missing': () => query({ aspect: 'to-go', label: 'To go', wanted: 'To go', got: 'Not marked' }),
    'ticket-to-go-extra': () => query({ aspect: 'to-go', label: 'To go', wanted: 'Staying in', got: 'To go' }),
    'ticket-rush-missing': () => query({ aspect: 'rush', label: 'Rush', wanted: 'In a hurry', got: 'Not marked' }),
    'ticket-rush-extra': () => query({ aspect: 'rush', label: 'Rush', wanted: 'No hurry', got: 'Rush' }),
    'ticket-together-missing': () =>
      query({ aspect: 'together', label: 'Together', wanted: 'All at once', got: 'Not marked' }),
    'ticket-together-extra': () =>
      query({ aspect: 'together', label: 'Together', wanted: 'On their own', got: 'Together' }),
    'ticket-count': () => ({
      columns: QUERY,
      rows: [
        {
          aspect: 'tickets',
          label: 'Tickets',
          wanted: count(Number(expected ?? tickets.length), 'drink'),
          got: count(Number(actual), 'ticket'),
        },
      ],
    }),
    'no-ticket': () => ({
      columns: QUERY,
      rows: [{ aspect: 'tickets', label: 'Tickets', wanted: count(tickets.length, 'drink'), got: 'No tickets' }],
    }),
    // The blank sheet never reached the kitchen, so it's the one after every sheet that did.
    'blank-ticket': () => {
      const index = failure.actual.reduce((sum, paper) => sum + (paper.quantity ?? 1), 0);
      return {
        columns: QUERY,
        rows: [{ aspect: 'drink', label: 'Drink', wanted: drink(tickets[index]?.item), got: 'Nothing written' }],
        ticket: tickets.length > 1 ? index + 1 : undefined,
      };
    },
    'sugar-count': () => ({
      columns: BREW,
      rows: [{ aspect: 'sugar', label: 'Sugar', wanted: sugar(expected), got: sugar(actual) }],
    }),
    'too-much-sugar': () => ({
      columns: BREW,
      rows: [{ aspect: 'sugar', label: 'Sugar', wanted: sugar(expected), got: sugar(actual) }],
    }),
    'lid-missing': () => ({
      columns: BREW,
      rows: [{ aspect: 'lid', label: 'Lid', wanted: 'To go, lid on', got: 'No lid' }],
    }),
    'wrong-table': () => ({
      columns: PORTER,
      rows: [{ aspect: 'table', label: 'Table', wanted: place(expected), got: place(actual) }],
    }),
    'wrong-dirty-table': () => ({
      columns: ['Cup left on', 'Looked at'],
      rows: [{ aspect: 'table', label: 'Table', wanted: place(expected), got: place(actual) }],
    }),
    'to-go-to-shelf': () => ({
      columns: PORTER,
      rows: [{ aspect: 'to-go', label: 'Destination', wanted: place(expected), got: place(actual) }],
    }),
    'stay-in-to-table': () => ({
      columns: PORTER,
      rows: [{ aspect: 'table', label: 'Destination', wanted: place(expected), got: place(actual) }],
    }),
    'wrong-direction': () => ({
      columns: ['Needed', 'Used'],
      rows: [
        {
          aspect: 'facing',
          label: 'Facing',
          wanted: capital(String(expected)),
          got: actual === undefined ? 'Another way' : capital(String(actual)),
        },
      ],
    }),
  };
  // A second lid, or Porter searching for a table it doesn't have, carries nothing to compare.
  if (code === 'lid-extra')
    return context.expected === false
      ? { columns: BREW, rows: [{ aspect: 'lid', label: 'Lid', wanted: 'Staying in, no lid', got: 'Lid on' }] }
      : undefined;
  if (
    (code === 'to-go-to-shelf' || code === 'stay-in-to-table' || code === 'wrong-direction') &&
    expected === undefined
  )
    return undefined;
  return rows[code]?.();
}
