import { evaluateQueryComparison, isBenchSeed, parseConditionExpression, spokenBlock } from '@/domain';
import type {
  BenchEase,
  FailureCode,
  LevelDefinition,
  RobotPrograms,
  RunFailure,
  RunRecord,
  TraceStep,
} from '@/domain';
import { FAILURE_WORDS } from './failureWords';
import { regularCalled } from './route';

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
  /** That guest's name when they're a regular, "Mr. Albert"; anyone else goes by `guest`, their number. */
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
    name: regularCalled(level, failure.seed_id, failure.customer_id),
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

type CompareWords = (typeof FAILURE_WORDS.en)['compare'];

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const drink = (item: unknown, say: CompareWords) =>
  typeof item === 'string' && item ? (say.drinks[item] ?? capital(item)) : say.nothingWritten;
const sugar = (value: unknown, say: CompareWords) =>
  typeof value === 'boolean'
    ? value
      ? say.withSugar
      : say.noSugar
    : Number(value)
      ? say.sugars(Number(value))
      : say.noSugar;
const place = (value: unknown, say: CompareWords) =>
  value === 'shelf' ? say.shelf : value === undefined ? say.somewhereElse : say.tableN(String(value));

/**
 * Expected against actual, from the failure's code and the values it carries, never from its wording. Failures that
 * aren't about the order, like a routine that won't compile or a robot in the wrong place, compare nothing: the card
 * shows their own details instead of an empty ticket.
 */
export function comparisonOf(
  failure: RunFailure,
  say: CompareWords = FAILURE_WORDS.en.compare,
): Comparison | undefined {
  const { code, context = {} } = failure,
    { expected, actual, ticket } = context;
  const tickets = failure.expected.tickets ?? (failure.expected.item ? [failure.expected] : []);
  // Only number a ticket when the order had several: “ticket 1” of one is noise.
  const which = tickets.length > 1 ? ticket : undefined;
  const QUERY: Comparison['columns'] = [say.ordered, say.handedOver],
    BREW: Comparison['columns'] = [say.ticket, say.cup],
    PORTER: Comparison['columns'] = [say.ticket, say.wentTo];
  const query = (row: Difference): Comparison => ({ columns: QUERY, rows: [row], ticket: which });
  const rows: Partial<Record<FailureCode, () => Comparison>> = {
    'ticket-item': () =>
      query({ aspect: 'drink', label: say.drink, wanted: drink(expected, say), got: drink(actual, say) }),
    'ticket-sugar': () =>
      query({ aspect: 'sugar', label: say.sugar, wanted: sugar(expected, say), got: sugar(actual, say) }),
    'ticket-to-go-missing': () => query({ aspect: 'to-go', label: say.toGo, wanted: say.toGo, got: say.notMarked }),
    'ticket-to-go-extra': () => query({ aspect: 'to-go', label: say.toGo, wanted: say.stayingIn, got: say.toGo }),
    'ticket-rush-missing': () => query({ aspect: 'rush', label: say.rush, wanted: say.inAHurry, got: say.notMarked }),
    'ticket-rush-extra': () => query({ aspect: 'rush', label: say.rush, wanted: say.noHurry, got: say.rush }),
    'ticket-together-missing': () =>
      query({ aspect: 'together', label: say.together, wanted: say.allAtOnce, got: say.notMarked }),
    'ticket-together-extra': () =>
      query({ aspect: 'together', label: say.together, wanted: say.onTheirOwn, got: say.together }),
    'ticket-count': () => ({
      columns: QUERY,
      rows: [
        {
          aspect: 'tickets',
          label: say.tickets,
          wanted: say.drinkCount(Number(expected ?? tickets.length)),
          got: say.ticketCount(Number(actual)),
        },
      ],
    }),
    'no-ticket': () => ({
      columns: QUERY,
      rows: [{ aspect: 'tickets', label: say.tickets, wanted: say.drinkCount(tickets.length), got: say.noTickets }],
    }),
    // The blank sheet never reached the kitchen, so it's the one after every sheet that did.
    'blank-ticket': () => {
      const index = failure.actual.reduce((sum, paper) => sum + (paper.quantity ?? 1), 0);
      return {
        columns: QUERY,
        rows: [
          { aspect: 'drink', label: say.drink, wanted: drink(tickets[index]?.item, say), got: say.nothingWritten },
        ],
        ticket: tickets.length > 1 ? index + 1 : undefined,
      };
    },
    'sugar-count': () => ({
      columns: BREW,
      rows: [{ aspect: 'sugar', label: say.sugar, wanted: sugar(expected, say), got: sugar(actual, say) }],
    }),
    'too-much-sugar': () => ({
      columns: BREW,
      rows: [{ aspect: 'sugar', label: say.sugar, wanted: sugar(expected, say), got: sugar(actual, say) }],
    }),
    'lid-missing': () => ({
      columns: BREW,
      rows: [{ aspect: 'lid', label: say.lid, wanted: say.toGoLidOn, got: say.noLid }],
    }),
    'wrong-table': () => ({
      columns: PORTER,
      rows: [{ aspect: 'table', label: say.table, wanted: place(expected, say), got: place(actual, say) }],
    }),
    'wrong-dirty-table': () => ({
      columns: [say.cupLeftOn, say.lookedAt],
      rows: [{ aspect: 'table', label: say.table, wanted: place(expected, say), got: place(actual, say) }],
    }),
    'to-go-to-shelf': () => ({
      columns: PORTER,
      rows: [{ aspect: 'to-go', label: say.destination, wanted: place(expected, say), got: place(actual, say) }],
    }),
    'stay-in-to-table': () => ({
      columns: PORTER,
      rows: [{ aspect: 'table', label: say.destination, wanted: place(expected, say), got: place(actual, say) }],
    }),
    'wrong-direction': () => ({
      columns: [say.needed, say.used],
      rows: [
        {
          aspect: 'facing',
          label: say.facing,
          wanted: capital(String(expected)),
          got: actual === undefined ? say.anotherWay : capital(String(actual)),
        },
      ],
    }),
  };
  // A second lid, or Porter searching for a table it doesn't have, carries nothing to compare.
  if (code === 'lid-extra')
    return context.expected === false
      ? { columns: BREW, rows: [{ aspect: 'lid', label: say.lid, wanted: say.stayingNoLid, got: say.lidOn }] }
      : undefined;
  if (
    (code === 'to-go-to-shelf' || code === 'stay-in-to-table' || code === 'wrong-direction') &&
    expected === undefined
  )
    return undefined;
  return rows[code]?.();
}
