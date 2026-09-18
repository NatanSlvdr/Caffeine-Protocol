import { compileProgram, executeCustomerEvent } from '../../src/domain/program';
import type { Customer } from '../../src/domain/types';
import { coffeeFixture } from './customers';

/** Compile and execute one customer event for query-language assertions. */
export function execCustomer(source: string, customer: Customer = coffeeFixture, level = 14, id = 'test') {
  return executeCustomerEvent(compileProgram(source, level), customer, id);
}
