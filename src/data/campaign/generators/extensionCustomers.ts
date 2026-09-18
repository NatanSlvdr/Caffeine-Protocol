import type { Customer, ValidationSeed } from '../../../domain/types';
import { extensionShiftConfig } from '../extension-config.ts';

/** Deterministic extension customers: drinks alternate by seed, sugar counts cycle, finales group up. */
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
        clarification: `${drink}, ${sugar_count} sugars`,
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
    return {
      customer_id: `C${n + 1}`,
      arrival: n * config.arrivalGap,
      phrase: `${drink}, ${sugar_count} sugars`,
      heard_orders: [{ tokens: [drink, 'sugar', 'number'], number: sugar_count }],
      intent,
      expected: { item: drink, sugar_count },
    };
  });
  // Batch lessons have an even number of tickets, including grouped final orders.
  if (customers.reduce((n, c) => n + (c.expected.tickets?.length ?? 1), 0) % 2)
    customers.push({
      customer_id: `C${count + 1}`,
      arrival: count * config.arrivalGap,
      phrase: 'Coffee with 0 sugar',
      heard_orders: [{ tokens: ['coffee', 'sugar', 'number'], number: 0 }],
      intent: { drink: 'coffee', sugar_count: 0 },
      expected: { item: 'coffee', sugar_count: 0 },
    });
  return { id: `L${level}_${String.fromCharCode(65 + seed)}`, customers };
}
