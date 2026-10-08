import { describe, expect, it } from 'vitest';
import { specials, specialById, TEA_LEFT } from '../../../src/data/specials';
import { queryReference, referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { runLevel, validate } from '../../../src/domain/simulation';
import type { Customer, CustomerExecution, RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('sold-out')!;
const { level } = special;
const run = (programs: RobotPrograms) => runLevel(level, compileProgram(programs.query, UNLOCKS.soldOut), programs);
const shift21 = referencePrograms(UNLOCKS.soldOut - 1);
const ASK = 'IF ambiguous IN CUSTOMER SPEECH\n';
/** Shift 21's routines, once Query asks about a sold-out drink as it does about an order nobody caught. */
const wayIn: RobotPrograms = {
  ...shift21,
  query: shift21.query.replace(ASK, 'IF ambiguous IN CUSTOMER SPEECH OR soldout IN CUSTOMER SPEECH\n'),
};
const soldOut = (customer: Customer) => customer.heard_orders.some((order) => order.tokens.includes('soldout'));

describe('The Last of the Tea, Juno’s morning without a delivery', () => {
  it('is the third special, asked for by Juno, at the address its id makes', () => {
    expect(specials[2]).toBe(special);
    expect(special.by).toBe('juno');
    expect(level.id).toBe(`L${UNLOCKS.soldOut}-sold-out`);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });

  it('runs out of tea after the tin’s last cups, and every tea asked for after them is sold out', () => {
    expect(TEA_LEFT).toBe(3);
    expect(special.brief.story).toContain('three cups’ worth');
    for (const { customers } of level.seeds) {
      const first = customers.findIndex(soldOut);
      const teas = customers
        .slice(0, first)
        .filter((c) => (c.clarification_heard_orders ?? c.heard_orders)[0].tokens.includes('tea'));
      expect(teas).toHaveLength(TEA_LEFT);
      const after = customers.slice(first).filter((c) => c.heard_orders[0].tokens.includes('tea'));
      expect(after.every(soldOut)).toBe(true);
      // Someone has a coffee instead, and someone goes without.
      expect(after.map((c) => c.expected.item ?? null)).toContain('coffee');
      expect(after.map((c) => c.expected.item ?? null)).toContain(null);
      expect(customers.filter((c) => c.heard_orders[0].tokens.includes('ambiguous'))).toHaveLength(1);
    }
  });

  it('serves every round with its reference, for every star: a coffee for one, nothing for the other', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
    const [round] = level.seeds;
    for (const customer of round.customers.filter(soldOut)) {
      const tickets = result.tickets.filter(
        (t) => t.ticket_id.startsWith(round.id) && t.customer_id === customer.customer_id,
      );
      if (customer.expected.item) {
        expect(tickets.map((t) => t.item)).toEqual(['coffee']);
        expect(tickets[0].sugar_count).toBe(customer.heard_orders[0].number);
      } else expect(tickets).toEqual([]);
    }
  });

  it('turns away the routines Shift 21 was served with: Query writes down a tea that isn’t there', () => {
    const result = run(shift21);
    expect(result.first_failure?.code).toBe('sold-out');
    expect(result.first_failure?.role).toBe('query');
    expect(result.first_failure?.reason).toBe(
      'What they asked for is sold out: use Help to ask what they’d like instead.',
    );
  });

  it('turns away a Query that asks only about what’s sold out: the guest who mumbled is guessed at', () => {
    const query = special.lesson.robotSolution.query.replace(
      'IF ambiguous IN CUSTOMER SPEECH OR soldout IN CUSTOMER SPEECH\n',
      'IF soldout IN CUSTOMER SPEECH\n',
    );
    expect(query).not.toBe(special.lesson.robotSolution.query);
    expect(run({ ...special.lesson.robotSolution, query }).first_failure?.code).toBe('unclear-order');
  });

  it('earns every star for the way most players in: Shift 21’s routines, asking about a sold-out drink', () => {
    expect(wayIn.query).not.toBe(shift21.query);
    expect(special.lesson.robotSolution.query).toBe(queryReference({ soldOut: true }));
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
  });

  it('plays live as it does headless', () => {
    expect(finishLiveRun(createLiveRun(level, special.lesson.robotSolution)).result.first_failure).toBeNull();
    expect(finishLiveRun(createLiveRun(level, shift21)).result.first_failure?.code).toBe('sold-out');
  });

  it('hears Sold out only on this special', () => {
    for (const other of specials.filter((s) => s !== special))
      expect(other.level.seeds.flatMap((seed) => seed.customers).some(soldOut), other.id).toBe(false);
  });
});

describe('a guest whose drink has run out, checked offline', () => {
  const customers = level.seeds[0].customers.filter(soldOut);
  const switches = customers.find((c) => c.expected.item)!,
    leaves = customers.find((c) => !c.expected.item)!;
  const execution = (over: Partial<CustomerExecution>): CustomerExecution => ({
    tickets: [],
    asked_help: true,
    error: '',
    executed_instructions: 1,
    trace: [],
    state: { pc: 0, stopped: false },
    ...over,
  });

  it('is asked what they’d have instead, and turned away as sold out if not', () => {
    expect(switches.clarification).toMatch(/^Tea’s sold out\. They’ll have coffee, \d sugars?\.$/);
    expect(leaves.clarification).toBe('Tea’s sold out. They’ll come back for one tomorrow.');
    expect(validate(switches, execution({ asked_help: false }))?.code).toBe('sold-out');
    expect(validate(leaves, execution({ asked_help: false }))?.code).toBe('sold-out');
  });

  it('who goes without is right to get no ticket, and wrong to get one', () => {
    expect(validate(leaves, execution({}))).toBeUndefined();
    // A coffee, as a guest who has one instead would get it.
    const ticket = { ...run(special.lesson.robotSolution).tickets[0], customer_id: leaves.customer_id };
    expect(validate(leaves, execution({ tickets: [ticket] }))?.code).toBe('guessed-drink');
  });
});
