import { describe, expect, it } from 'vitest';
import { longDay, waveThanks, type Wave } from '../../../src/data/longDay';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { Customer, ExpectedTicket, RobotPrograms } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';

const { waves } = longDay;
const run = (wave: Wave, programs: RobotPrograms) =>
  runLevel(wave.level, compileProgram(programs.query, UNLOCKS.together), programs);
const guests = (wave: Wave): Customer[] => wave.level.seeds.flatMap((seed) => seed.customers);
const tickets = (wave: Wave): ExpectedTicket[] =>
  guests(wave).flatMap((guest) => guest.expected.tickets ?? [guest.expected]);

/** What a wave asks of the routines, each a thing one of the waves brings in. */
const asks = (wave: Wave) => ({
  // A guest with two drinks of their own, not a table ordering together.
  twoDrinks: guests(wave).some(
    ({ expected }) => (expected.tickets?.length ?? 1) > 1 && !expected.tickets?.some((ticket) => ticket.together),
  ),
  toGo: tickets(wave).some((ticket) => ticket.to_go),
  rush: tickets(wave).some((ticket) => ticket.rush),
  cups: wave.level.service?.cups !== undefined,
  mumbles: guests(wave).some((guest) => guest.expected.ask_help),
  together: tickets(wave).some((ticket) => ticket.together),
  closing: !!wave.level.service?.closing,
});

describe('the Long Day', () => {
  it('runs six waves through the day, each one shift with one round of guests', () => {
    expect(waves.map((wave) => wave.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(longDay.by).toBe('juno');
    for (const wave of waves) expect(wave.level.seeds).toHaveLength(1);
    // Each wave brings more guests than the one before it, or as many.
    const counts = waves.map((wave) => guests(wave).filter((guest) => !guest.expected.closing).length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it('asks in each wave for everything the waves before it did, and one thing more', () => {
    const order = ['twoDrinks', 'toGo', 'rush', 'mumbles', 'together', 'closing'] as const;
    waves.forEach((wave, index) => {
      const asked = asks(wave);
      order.forEach((ask, at) => expect([wave.number, ask, asked[ask]]).toEqual([wave.number, ask, at <= index]));
      // The lunch rush comes with its cups counted.
      expect(asked.cups).toBe(index >= 2);
    });
  });

  it.each(waves.map((wave) => [wave.number, wave] as const))(
    'serves wave %i for every star with the day’s reference routines',
    (_, wave) => {
      const result = run(wave, wave.lesson.robotSolution);
      expect(result.first_failure).toBeNull();
      expect(result.stars).toBe(3);
    },
  );

  it('is served by one set of routines all day', () => {
    const [first] = waves;
    for (const wave of waves) expect(wave.lesson.robotSolution).toEqual(first.lesson.robotSolution);
  });

  it('carries Shift 21’s routines through the morning, not past the study groups', () => {
    const shift21 = referencePrograms(UNLOCKS.together - 1);
    for (const wave of waves.slice(0, 4)) expect(run(wave, shift21).first_failure).toBeNull();
    for (const wave of waves.slice(4)) expect(run(wave, shift21).first_failure?.code).toBe('ticket-together-missing');
  });

  it('names the next wave on the receipt, and thanks the café after the last', () => {
    expect(waveThanks(1)).toBe(
      `Wave 1 of 6 served. Next, at ten o’clock: ${waves[1].adds.charAt(0).toLowerCase()}${waves[1].adds.slice(1)}`,
    );
    expect(waveThanks(6)).toMatch(/^Thank you\./);
  });
});
