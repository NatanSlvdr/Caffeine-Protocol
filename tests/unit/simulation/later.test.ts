import { describe, expect, it } from 'vitest';
import { BOOKED, specials, specialById } from '../../../src/data/specials';
import { specialsFr } from '../../../src/data/specials.fr';
import { queryReference, referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { compileRobot } from '../../../src/domain/robotProgram';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { runLevel, validate } from '../../../src/domain/simulation';
import { benchGuests, benchKit, benchProblems, benchSeed } from '../../../src/domain/bench';
import { bookingsOf, regularsOf } from '../../../src/domain/regulars';
import { heardToIconOrders } from '../../../src/domain/orders';
import type { Customer, CustomerExecution, RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { SCENE_WORDS } from '../../../src/components/sceneWords';
import { finishLiveRun } from '../../helpers/run';

const special = specialById('later')!;
const { level } = special;
const run = (programs: RobotPrograms) => runLevel(level, compileProgram(programs.query, UNLOCKS.later), programs);
const shift21 = referencePrograms(UNLOCKS.later - 1);
const ASK = 'IF ambiguous IN CUSTOMER SPEECH\n';
const LET_GO = 'IF later IN CUSTOMER SPEECH\n  JUMP listen\nEND\n';
/** Shift 21's routines, once Query lets a drink booked for later go before it asks or writes anything. */
const wayIn: RobotPrograms = { ...shift21, query: shift21.query.replace(ASK, LET_GO + ASK) };
const books = (customer: Customer) => customer.heard_orders.some((order) => order.tokens.includes('later'));

describe('Keep One for Me, Juno’s office upstairs', () => {
  it('is the sixth special, asked for by Juno, at the address its id makes', () => {
    expect(specials[5]).toBe(special);
    expect(special.by).toBe('juno');
    expect(level.id).toBe(`L${UNLOCKS.later}-later`);
    expect(level.seeds.map((seed) => seed.id)).toEqual(['A', 'B', 'C'].map((round) => `${level.id}_${round}`));
  });

  it('has two guests a round book a drink to go, each back for it later as a guest who asks again', () => {
    for (const { customers } of level.seeds) {
      const bookings = bookingsOf(customers);
      expect([...bookings]).toEqual([...BOOKED].map(([back, booker]) => [`C${back + 1}`, `C${booker + 1}`]));
      for (const [back, booker] of bookings) {
        const [first, again] = [booker, back].map((id) => customers.find((c) => c.customer_id === id)!);
        expect(books(first)).toBe(true);
        expect(first.phrase).toMatch(/^Could you keep me a (coffee|tea), \d sugars?, to go\? I’ll be back for it\.$/);
        // Nothing to write yet: the drink is written down when they're back.
        expect(first.expected).toEqual({});
        expect(again.phrase).toMatch(/^I’m back for it! (Coffee|Tea), \d sugars?, to go$/);
        expect(again.heard_orders[0].tokens).toEqual(first.heard_orders[0].tokens.filter((t) => t !== 'later'));
        expect(again.expected).toMatchObject({ to_go: true, item: first.intent.drink });
      }
      expect(customers.filter(books)).toHaveLength(BOOKED.size);
    }
  });

  it('serves every round with its reference, for every star, making each booked drink once', () => {
    const result = run(special.lesson.robotSolution);
    expect(result.first_failure).toBeNull();
    expect(result.passed_seeds).toBe(level.seeds.length);
    expect(result.stars).toBe(3);
    expect(result.block_count).toBe(level.reference_block_count);
    const [round] = level.seeds;
    for (const [back, booker] of bookingsOf(round.customers)) {
      const written = (id: string) =>
        result.tickets.filter((t) => t.ticket_id.startsWith(round.id) && t.customer_id === id);
      expect(written(booker)).toEqual([]);
      expect(written(back)).toHaveLength(1);
    }
  });

  it('turns away the routines Shift 21 was served with: Query writes a booked drink down at once', () => {
    const result = run(shift21);
    expect(result.first_failure?.code).toBe('booked-for-later');
    expect(result.first_failure?.role).toBe('query');
    expect(result.first_failure?.customer_id).toBe(`C${[...BOOKED.values()][0] + 1}`);
    expect(result.first_failure?.reason).toBe(
      'This drink is booked for later: made now, it’s cold by the time they’re back. Write nothing down until they come for it.',
    );
  });

  it('earns every star for the way most players in: Shift 21’s routines, letting a booking go', () => {
    expect(wayIn.query).not.toBe(shift21.query);
    expect(special.lesson.robotSolution.query).toBe(queryReference({ toGo: true, later: true }));
    expect(special.lesson.robotSolution.query).toContain(LET_GO + ASK);
    const result = run(wayIn);
    expect(result.first_failure).toBeNull();
    expect(result.stars).toBe(3);
    expect(result.block_count! + 2).toBe(level.block_target);
  });

  it('turns away a Query that lets the booking go only after taking paper', () => {
    const query = special.lesson.robotSolution.query
      .replace(LET_GO, '')
      .replace('  TAKE UP\n', '  TAKE UP\n  IF later IN item\n    JUMP listen\n  END\n');
    expect(compileProgram(query, UNLOCKS.later).compile_error).toBe('');
    expect(run({ ...special.lesson.robotSolution, query }).first_failure?.code).toBe('booked-for-later');
  });

  it('plays live as it does headless', () => {
    for (const programs of [special.lesson.robotSolution, wayIn])
      expect(finishLiveRun(createLiveRun(level, programs)).result.first_failure).toBeNull();
    expect(finishLiveRun(createLiveRun(level, shift21)).result.first_failure?.code).toBe('booked-for-later');
  });

  it('hears For later only on this special, and only Query hears it, past the campaign', () => {
    for (const other of specials.filter((s) => s !== special))
      expect(other.level.seeds.flatMap((seed) => seed.customers).some(books), other.id).toBe(false);
    const source = 'LISTEN\nIF later IN CUSTOMER SPEECH\nEND';
    expect(compileProgram(source, UNLOCKS.later).compile_error).toBe('');
    expect(compileProgram(source, UNLOCKS.later - 1).compile_error).not.toBe('');
    expect(compileRobot(source, 'prep', UNLOCKS.later).compile_error).not.toBe('');
    expect(compileRobot(source, 'floor', UNLOCKS.later).compile_error).not.toBe('');
  });

  it('is told in French, line for line', () => {
    const fr = specialsFr.later;
    expect(fr.title).toBe('Gardez-m’en un');
    expect(fr.intro).toHaveLength(special.intro.length);
    expect(fr.outro).toHaveLength(special.outro.length);
    expect(fr.intro.join(' ')).toContain('[IF later IN CUSTOMER SPEECH|If For later IN Orders]');
  });
});

describe('a guest who books a drink for later, checked offline', () => {
  const [round] = level.seeds;
  const booker = round.customers.find(books)!;
  const execution = (over: Partial<CustomerExecution>): CustomerExecution => ({
    tickets: [],
    asked_help: false,
    error: '',
    executed_instructions: 1,
    trace: [],
    state: { pc: 0, stopped: false },
    ...over,
  });

  it('is right to get no ticket yet, and wrong to get one', () => {
    expect(validate(booker, execution({}))).toBeUndefined();
    const ticket = { ...run(special.lesson.robotSolution).tickets[0], customer_id: booker.customer_id };
    expect(validate(booker, execution({ tickets: [ticket] }))?.code).toBe('booked-for-later');
  });

  it('is the same person when they’re back: the same regular, or the same face', () => {
    for (const { customers } of level.seeds) {
      const regulars = regularsOf(customers);
      for (const [back, first] of bookingsOf(customers)) expect(regulars.get(back)).toBe(regulars.get(first));
    }
    // A booking nobody comes back for is nobody's regular.
    const alone = round.customers.filter((c) => !bookingsOf(round.customers).has(c.customer_id));
    for (const guest of alone.filter(books)) expect(regularsOf(alone).has(guest.customer_id)).toBe(false);
  });

  it('shows on the order rail as booked for later, in both languages', () => {
    const [order] = heardToIconOrders(booker.heard_orders);
    expect(order.later).toBe(true);
    expect(SCENE_WORDS.en.order({ ...order, quantity: 1 })).toMatch(/, to go, for later$/);
    expect(SCENE_WORDS.fr.order({ ...order, quantity: 1 })).toMatch(/, à emporter, pour plus tard$/);
  });
});

describe('a bench guest who books a drink for later', () => {
  const kit = benchKit(level);
  const coffee = { drink: 'coffee' as const, sugar: 1, toGo: true };

  it('is offered on this special’s bench, and not on one where nobody books', () => {
    expect(kit.later).toBe(true);
    expect(benchKit(specialById('sold-out')!.level).later).toBe(false);
    const elsewhere = benchKit(specialById('sold-out')!.level);
    expect(benchProblems(elsewhere, [{ orders: [{ ...coffee, toGo: undefined }], later: true, after: 0 }])).toEqual([
      'Guest 1 books a drink for later, and nobody does on this shift.',
    ]);
  });

  it('books one drink, unhurried', () => {
    expect(benchProblems(kit, [{ orders: [coffee, coffee], later: true, after: 0 }])).toContain(
      'Guest 1 books a drink for later, so asks for one.',
    );
    expect(benchProblems(kit, [{ orders: [{ ...coffee, rush: true }], later: true, after: 0 }])).toContain(
      'Guest 1 books a drink for later, so isn’t in a rush.',
    );
  });

  it('says so, expects nothing yet, and reads back from a round as they were written', () => {
    const [guest] = benchSeed(kit, [{ orders: [coffee], later: true, after: 0 }]).customers;
    expect(guest.phrase).toBe('Could you keep me a coffee, 1 sugar, to go? I’ll be back for it.');
    expect(guest.heard_orders).toEqual([{ tokens: ['coffee', 'sugar', 'number', 'togo', 'later'], number: 1 }]);
    expect(guest.expected).toEqual({});
    expect(benchGuests([guest])).toEqual([{ orders: [coffee], later: true, after: 0 }]);
  });
});
