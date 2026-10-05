import type { Customer, ValidationSeed } from '../../../domain/types';
import { extensionShiftConfig, shiftId } from '../extension-config.ts';

/**
 * Deterministic extension customers: drinks alternate by seed, sugar counts cycle, finales group up.
 * Act IV shifts turn some of them into take-away or rush orders, and a finale has every kind, a rush order to go
 * among them.
 */
/** "1 sugar", "2 sugars", as a guest says it. */
const sugars = (n: number) => `${n} sugar${n === 1 ? '' : 's'}`;

export function extensionSeed(level: number, seed: number): ValidationSeed {
  const config = extensionShiftConfig(level);
  const count = config.customers;
  const customers: Customer[] = Array.from({ length: count }, (_, n) => {
    const drink = config.tea && (n + seed) % 2 ? ('tea' as const) : ('coffee' as const),
      sugar_count = config.sugar ? (n + seed) % 3 : 0;
    const intent = { confidence: 'clear' as const, drink, sugar_count };
    if (config.finale && n % 4 === 0)
      return {
        customer_id: `C${n + 1}`,
        arrival: n * config.arrivalGap,
        phrase: 'Our usual, please',
        intent: { confidence: 'ambiguous' },
        heard_orders: [{ tokens: ['ambiguous'] }],
        clarification_heard_orders: [{ tokens: [drink, 'sugar', 'number'], number: sugar_count }],
        clarification: `${drink}, ${sugars(sugar_count)}`,
        clarification_intent: intent,
        expected: { item: drink, sugar_count, ask_help: true },
      };
    if (config.finale && n % 4 === 1)
      return {
        customer_id: `C${n + 1}`,
        arrival: n * config.arrivalGap,
        phrase: 'Coffee with 0 sugar and tea with 2 sugars, please',
        heard_orders: [
          { tokens: ['coffee', 'sugar', 'number'], number: 0 },
          { tokens: ['tea', 'sugar', 'number'], number: 2 },
        ],
        intent: {
          orders: [
            { drink: 'coffee', sugar_count: 0 },
            { drink: 'tea', sugar_count: 2 },
          ],
        },
        expected: {
          tickets: [
            { item: 'coffee', sugar_count: 0 },
            { item: 'tea', sugar_count: 2 },
          ],
        },
      };
    // In a finale every other rush order is also to go, so the two marks meet on one ticket at least once.
    const toGo = config.toGo && (config.finale ? n % 4 === 2 || n % 8 === 7 : n % 3 === 1),
      rush = config.rush && (config.finale ? n % 4 === 3 : n % 3 === 2);
    const marks = { ...(toGo ? { to_go: true } : {}), ...(rush ? { rush: true } : {}) };
    return {
      customer_id: `C${n + 1}`,
      arrival: n * config.arrivalGap,
      phrase: `${rush ? 'A quick ' : ''}${drink}, ${sugars(sugar_count)}${toGo ? ', to go' : ''}${rush ? '. I’m in a rush!' : ''}`,
      heard_orders: [
        {
          tokens: [drink, 'sugar', 'number', ...(toGo ? ['togo'] : []), ...(rush ? ['rush'] : [])],
          number: sugar_count,
        },
      ],
      intent: { ...intent, ...marks },
      expected: { item: drink, sugar_count, ...marks },
    };
  });
  // Batch lessons have an even number of tickets, including grouped final orders. At closing time an odd one
  // leaves a robot that claims two at a time with half a batch.
  const tickets = customers.reduce((n, c) => n + (c.expected.tickets?.length ?? 1), 0);
  if (tickets % 2 !== (config.closing ? 1 : 0))
    customers.push({
      customer_id: `C${count + 1}`,
      arrival: count * config.arrivalGap,
      phrase: 'Coffee with 0 sugar',
      heard_orders: [{ tokens: ['coffee', 'sugar', 'number'], number: 0 }],
      intent: { drink: 'coffee', sugar_count: 0 },
      expected: { item: 'coffee', sugar_count: 0 },
    });
  return { id: `${shiftId(level)}_${String.fromCharCode(65 + seed)}`, customers };
}
