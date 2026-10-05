import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { failureHint, failureLines } from '../../../src/features/workspace/reactions';
import { runServiceShift } from '../../helpers/run';

/** Porter's routine with its first Wait for Orders swapped for Wait for Dirty cups. */
const waitsForCups = (shift: number) =>
  referencePrograms(shift).floor.replace('POSITION listen\nLISTEN', 'POSITION listen\nWAIT DIRTY');

describe('a robot waiting on another, when the service stalls', () => {
  it('names Porter, waiting for a used cup while drinks wait at pickup, on every shift that clears tables', () => {
    for (const shift of [15, 16, 17, 18, 19, 20, 21]) {
      const failure = runServiceShift({ floor: waitsForCups(shift) }, shift).first_failure!;
      expect(failure.code, `shift ${shift}`).toBe('wrong-wait');
      expect(failure.role).toBe('floor');
      // The Wait for Dirty cups itself, after Store var2 and the jump destination.
      expect(failure.error_line).toBe(2);
      expect(failure.reason).toMatch(/^Porter is waiting for a used cup, but no guest has a drink to leave one: /);
      expect(failure.context).toEqual({ expected: 'a drink to serve', actual: 'waiting for a used cup' });
    }
  });

  it('points at the guest whose drink is waiting, and counts the drinks', () => {
    const failure = runServiceShift({ floor: waitsForCups(18) }, 18).first_failure!;
    expect(failure.reason).toContain('4 drinks are still at pickup.');
    expect(failure.customer_id).toBe(levels[17].seeds[0].customers[0].customer_id);
  });

  it('names Porter, not Brew at the sink, while Porter still carries a drink it never put down', () => {
    for (const shift of [18, 21]) {
      const floor = referencePrograms(shift).floor.replace('DEPOSIT UP', 'MOVE var1');
      const failure = runServiceShift({ floor }, shift).first_failure!;
      expect(failure.code, `shift ${shift}`).toBe('unfinished-work');
      expect(failure.role).toBe('floor');
      expect(failure.reason).toMatch(/^Porter is still holding the coffee for table 1/);
    }
  });

  it('gives Porter its say, and a hint that tells the two Waits apart', () => {
    const [reaction, niko] = failureLines(runServiceShift({ floor: waitsForCups(18) }, 18), 'query');
    expect(reaction.who).toBe('porter');
    expect(failureHint('wrong-wait')).toMatch(/Wait for Orders the next drink to serve, Wait for Dirty cups a cup/);
    expect(niko.text).toContain(failureHint('wrong-wait'));
  });
});
