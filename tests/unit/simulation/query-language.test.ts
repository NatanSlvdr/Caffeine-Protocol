import { describe, it, expect } from 'vitest';
import { lessons } from '../../../src/data';
import { compileProgram, executeCustomerEvent, evaluateQueryComparison, parseFor } from '../../../src/domain/program';
import { QUERY_INSTRUCTION_LIMIT } from '../../../src/domain/constants';
import { validate } from '../../../src/domain/simulation';
import { execCustomer as exec } from '../../helpers/query';
import { coffeeFixture as coffee, teaFixture as tea, requestFixture as request } from '../../helpers/customers';
import { runCampaignLevel as run } from '../../helpers/run';
import { UNLOCKS } from '../../../src/domain/unlocks';

describe('token interpreter and physical order handling', () => {
  it('membership tests use only the selected binding and arbitrary token strings', () => {
    const bindings = { item: { tokens: ['coffee', 'sugar', 'negation'] } };
    expect(evaluateQueryComparison({ left: 'coffee', operator: 'IN', right: 'item' }, bindings)).toBe(true);
    expect(evaluateQueryComparison({ left: 'tea', operator: 'IN', right: 'item' }, bindings)).toBe(false);
    expect(evaluateQueryComparison({ left: 'coffee', operator: 'IN', right: 'missing' }, bindings)).toBe(false);
    expect(
      evaluateQueryComparison(
        { left: 'future_token', operator: 'IN', right: 'item' },
        { item: { tokens: ['future_token'] } },
      ),
    ).toBe(true);
  });
  it.each([
    ['sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH', ['sugar'], true],
    ['sugar IN CUSTOMER SPEECH AND negation NOT IN CUSTOMER SPEECH', ['sugar', 'negation'], false],
    ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH', ['tea'], true],
    ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH', ['sugar'], false],
    ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH', ['coffee'], true],
    ['coffee IN CUSTOMER SPEECH OR tea IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH', ['tea'], false],
    ['coffee NOT IN CUSTOMER SPEECH', ['coffee'], false],
    ['coffee NOT IN CUSTOMER SPEECH', ['tea'], true],
  ])('evaluates %s against %j', (condition, tokens, yes) => {
    const result = exec(
      `LISTEN\nTAKE UP\nIF ${condition}\nITEM coffee\nELSE\nITEM tea\nEND\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1`,
      request([{ tokens }]),
    );
    expect(result.error).toBe('');
    expect(result.tickets[0].item).toBe(yes ? 'coffee' : 'tea');
  });
  it('rejects incomplete or locked compound clauses', () => {
    // A malformed clause is no block at all; a well-formed one waits for its word to unlock.
    for (const [condition, why] of [
      ['coffee IN CUSTOMER SPEECH AND', 'doesn’t know'],
      ['coffee IN CUSTOMER SPEECH OR OR tea IN CUSTOMER SPEECH', 'doesn’t know'],
      ['coffee IN CUSTOMER SPEECH AND sugar IN CUSTOMER SPEECH', 'can’t use'],
    ])
      expect(compileProgram(`LISTEN\nIF ${condition}\nEND`, UNLOCKS.choices).compile_error).toContain(why);
  });
  it('does not read solved intent or expected output to choose a drink', () => {
    const customer = {
      ...coffee,
      intent: { drink: 'tea' as const, with_sugar: true },
      expected: { item: 'tea' as const },
    };
    const result = exec(lessons[UNLOCKS.choices - 1].solution, customer, UNLOCKS.choices);
    expect(result.tickets[0].item).toBe('coffee');
    expect(result.tickets[0].source_intent).toEqual({});
  });
  it('resumes at the next customer without stale tokens', () => {
    const p = compileProgram(lessons[UNLOCKS.choices - 1].solution, UNLOCKS.choices),
      a = executeCustomerEvent(p, coffee, 'a'),
      b = executeCustomerEvent(p, tea, 'b', a.state);
    expect(b.error).toBe('');
    expect(b.tickets[0].item).toBe('tea');
  });
  it('creates exactly two separately taken and deposited tickets for coffee and tea', () => {
    const customer = request([{ tokens: ['coffee'] }, { tokens: ['tea'] }], {
      tickets: [{ item: 'coffee' }, { item: 'tea' }],
    });
    const result = exec(lessons[UNLOCKS.forEach - 1].solution, customer);
    expect(validate(customer, result)).toBeUndefined();
    expect(result.tickets.map((t) => t.item)).toEqual(['coffee', 'tea']);
    for (const command of ['TAKE UP', 'DEPOSIT RIGHT'])
      expect(result.trace.filter((t) => t.command === command)).toHaveLength(2);
    expect(new Set(result.tickets.map((t) => t.ticket_id)).size).toBe(2);
  });
  const sugarShift = UNLOCKS.sugar - 1,
    negationCheck = 'IF negation IN CUSTOMER SPEECH\n    WRITE 0 sugar\n  ELSE\n    WRITE 1 sugar\n  END';
  it('plain drinks reject unconditional sugar after modifiers are introduced', () => {
    const source = lessons[sugarShift].solution.replace(
      `IF sugar IN CUSTOMER SPEECH\n  ${negationCheck}\nEND`,
      'WRITE 1 sugar',
    );
    expect(source).not.toBe(lessons[sugarShift].solution);
    expect(run(sugarShift, source).first_failure?.reason).toContain('sugar');
  });
  it('rejects a sugar-only check on a negated request', () => {
    const customer = request([{ tokens: ['coffee', 'sugar', 'negation'] }], { item: 'coffee', with_sugar: false });
    const sugarOnly = lessons[sugarShift].solution.replace(negationCheck, 'WRITE 1 sugar');
    expect(sugarOnly).not.toBe(lessons[sugarShift].solution);
    expect(validate(customer, exec(sugarOnly, customer))).toMatchObject({
      code: 'ticket-sugar',
      context: { ticket: 1, expected: false, actual: true },
    });
    expect(validate(customer, exec(lessons[sugarShift].solution, customer))).toBeUndefined();
  });
  it.each([0, 1, 2])('copies explicitly read numeric metadata including %i', (number) => {
    const customer = request([{ tokens: ['tea', 'sugar', 'number'], number }], { item: 'tea', sugar_count: number });
    const result = exec(lessons[UNLOCKS.numbers - 1].solution, customer);
    expect(validate(customer, result)).toBeUndefined();
  });
  it('says a Jump into a For loop skipped its For', () => {
    expect(exec('LISTEN\nJUMP in\nFOR item IN heard orders\nPOSITION in\nEND', coffee).error).toBe(
      'This For loop’s End was reached without its For: jump to the For line, not into the loop.',
    );
  });
  it('does not retain a number from the previous loop item', () => {
    const customer = request([{ tokens: ['coffee', 'sugar', 'number'], number: 2 }, { tokens: ['tea'] }]);
    const source =
      'LISTEN\nFOR item IN heard orders\nTAKE UP\nITEM coffee\nIF number IN item\nREAD number\nEND\nSUGAR number\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nEND';
    expect(exec(source, customer).error).toContain('Store a number in');
  });
  it('requires HELP before taking paper for ambiguity and replaces all heard groups', () => {
    const customer = {
      ...request([{ tokens: ['ambiguous'] }], { ask_help: true, tickets: [{ item: 'tea' }, { item: 'coffee' }] }),
      clarification_heard_orders: [{ tokens: ['tea'] }, { tokens: ['coffee'] }],
    };
    expect(exec(lessons[UNLOCKS.help - 2].solution, customer).error).toContain('This order is unclear');
    const result = exec(lessons[UNLOCKS.help - 1].solution, customer);
    expect(validate(customer, result)).toBeUndefined();
    expect(result.tickets.map((t) => t.item)).toEqual(['tea', 'coffee']);
  });
  it('defers unresolved speech without guessing and resumes service', () => {
    const customer = request([{ tokens: ['ambiguous'] }], { ask_help: true });
    const p = compileProgram(lessons[UNLOCKS.help - 1].solution);
    const result = executeCustomerEvent(p, customer, 'a');
    expect(validate(customer, result)).toBeUndefined();
    expect(result.tickets).toEqual([]);
    expect(executeCustomerEvent(p, tea, 'b', result.state).tickets[0].item).toBe('tea');
  });
  it('skips an empty selected collection', () =>
    expect(exec('LISTEN\nFOR item IN heard orders\nTAKE UP\nEND', request([])).trace.map((t) => t.command)).toEqual([
      'LISTEN',
      'FOR item IN heard orders',
    ]));
  it('parses loop operands separately and rejects unsupported selectors, variables and nesting', () => {
    expect(parseFor('FOR item IN heard orders')).toEqual({ variable: 'item', selector: 'heard orders' });
    for (const source of [
      'FOR ticket IN waiting tickets',
      'FOR item IN occupied tables',
      'FOR other IN heard orders',
      'FOR item IN heard orders\nFOR item IN heard orders\nEND\nEND',
    ])
      expect(compileProgram('LISTEN\n' + source).compile_error).not.toBe('');
  });
  it('bounds large loops at exactly 1024 executed instructions', () => {
    const customer = request(Array.from({ length: 400 }, () => ({ tokens: ['coffee'] })));
    const result = exec(lessons[UNLOCKS.forEach - 1].solution, customer);
    expect(result.error).toContain('limit');
    expect(result.executed_instructions).toBe(QUERY_INSTRUCTION_LIMIT);
  });
  for (const source of [
    '',
    'LISTEN\nEND',
    'LISTEN\nFOR item IN heard orders',
    'LISTEN\nREPEAT\nTAKE UP',
    'LISTEN\nBOGUS',
    'TAKE UP\nLISTEN',
    'LISTEN\nELSE',
    'LISTEN\nIF tea IN CUSTOMER SPEECH\nELSE\nELSE\nEND',
    'LISTEN\nJUMP listen',
    'POSITION listen\nLISTEN\nPOSITION listen',
    'LISTEN\nLISTEN',
  ])
    it(`rejects invalid structure ${JSON.stringify(source)}`, () =>
      expect(compileProgram(source).compile_error).not.toBe(''));
  it('names a Jump with nowhere to land, and a jump destination named twice', () => {
    const lost = compileProgram('LISTEN\nJUMP again', UNLOCKS.loop);
    expect([lost.compile_error, lost.error_line]).toEqual(['Jump again needs a jump destination named again.', 1]);
    expect(compileProgram('POSITION again\nLISTEN\nPOSITION again', UNLOCKS.loop).compile_error).toBe(
      'Two jump destinations are named again; give each its own name.',
    );
  });
  it('names a misplaced Else or End, and points an open block at the line that needs its End', () => {
    const error = (source: string) => {
      const p = compileProgram(source, UNLOCKS.choices);
      return [p.compile_error, p.error_line];
    };
    const IF = 'IF coffee IN CUSTOMER SPEECH';
    expect(error('LISTEN\nELSE')).toEqual(['Else needs an If above it.', 1]);
    expect(error(`LISTEN\n${IF}\nELSE\nELSE\nEND`)).toEqual(['An If takes only one Else.', 3]);
    expect(error('LISTEN\nEND')).toEqual(['End needs an If, For or Function above it.', 1]);
    expect(error(`LISTEN\n${IF}\nITEM coffee`)).toEqual(['This If needs an End to close it.', 1]);
  });
  it('lights the line each whole-routine problem is about, reporting the first one found', () => {
    const error = (source: string) => {
      const p = compileProgram(source, UNLOCKS.loop);
      return [p.compile_error, p.error_line];
    };
    expect(error('# opening\nTAKE UP\nLISTEN')).toEqual(['Start with Wait for Orders, or a jump destination.', 1]);
    expect(error('LISTEN\nTAKE UP\nLISTEN\nLISTEN')).toEqual([
      'Use one Wait for Orders; jump back to it for continuous service.',
      2,
    ]);
    // Both Jumps are lost: the first one is named.
    expect(error('LISTEN\nJUMP a\nJUMP b')).toEqual(['Jump a needs a jump destination named a.', 1]);
    expect(error('LISTEN\n' + 'TAKE UP\n'.repeat(128))).toEqual(['Query has room for at most 128 blocks.', 128]);
  });
  it('enforces 128 blocks', () => {
    expect(compileProgram('LISTEN\n' + 'TAKE UP\n'.repeat(127)).compile_error).toBe('');
    expect(compileProgram('LISTEN\n' + 'TAKE UP\n'.repeat(128)).compile_error).toContain('128');
  });
  it('rejects reads before speech and missing numeric tokens', () => {
    expect(exec('POSITION listen\nREAD number\nLISTEN').error).toContain('Wait for Orders first');
    expect(exec('LISTEN\nREAD number').error_line).toBe(1);
    expect(exec('LISTEN\nREAD number').error).toContain('has no number to store');
  });
  it('requires held paper for writes and forbids overwriting it', () => {
    for (const command of ['ITEM coffee', 'SUGAR true'])
      expect(exec('LISTEN\n' + command).error).toContain('Take the order paper');
    expect(exec('LISTEN\nTAKE UP\nTAKE UP').error).toContain('Deposit the current paper');
    expect(exec('LISTEN\nTAKE UP\nMOVE RIGHT 1\nDEPOSIT RIGHT').error).toContain('no drink written');
    expect(exec('LISTEN\nMOVE RIGHT 1\nDEPOSIT RIGHT').error).toContain('isn’t holding a ticket');
  });
  it('rejects jumping from an active loop', () =>
    expect(exec('POSITION listen\nLISTEN\nFOR item IN heard orders\nJUMP listen\nEND').error).toContain(
      'Finish the function or For loop',
    ));
  it('rejects carrying an unfinished sheet into the next loop item', () =>
    expect(exec('LISTEN\nFOR item IN heard orders\nTAKE UP\nITEM coffee\nEND').error).toContain(
      'Deposit this item’s paper',
    ));
  it('fails on first customer mismatch and highlights the item source', () => {
    const r = run(UNLOCKS.choices - 1, lessons[UNLOCKS.loop - 1].solution);
    expect(r.events).toHaveLength(2);
    expect(r.first_failure?.seed_id).toBe('L04_A');
    expect(r.first_failure?.error_line).toBe(3);
  });
});
