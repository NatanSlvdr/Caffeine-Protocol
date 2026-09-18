import { levels } from '../../src/data';
import type { Customer, HeardOrder } from '../../src/domain/types';

/** Shared Act I fixtures: the L04 coffee and tea customers plus a request builder. */
export const coffeeFixture: Customer = levels[3].seeds[0].customers[0];
export const teaFixture: Customer = levels[3].seeds[1].customers[0];

export function requestFixture(orders: HeardOrder[], expected: Customer['expected'] = {}): Customer {
  return { ...coffeeFixture, heard_orders: orders, intent: {}, expected };
}
