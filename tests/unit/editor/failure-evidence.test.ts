import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { FailureCode, FailureContext, RunFailure } from '../../../src/domain';
import { comparisonOf, evidenceOf, isStale } from '../../../src/features/workspace/evidence';
import { referencePrograms } from '../../../src/data/extension';
import { runCampaignLevel, runServiceShift } from '../../helpers/run';
import { recordRun } from '../../../src/domain';

const failure = (
  code: FailureCode,
  context?: FailureContext,
  expected: RunFailure['expected'] = { item: 'tea' },
): RunFailure => ({
  seed_id: 's1',
  customer_id: 'c1',
  error_line: 3,
  event_time: 0,
  phrase: 'tea please',
  intent: {},
  expected,
  actual: [],
  code,
  context,
  reason: 'Something went wrong.',
});

describe('expected against actual', () => {
  it('compares the drink, sugar, and marks on a ticket, numbering it only when the order had several', () => {
    expect(comparisonOf(failure('ticket-item', { ticket: 1, expected: 'tea', actual: 'coffee' }))).toEqual({
      columns: ['Ordered', 'Handed over'],
      rows: [{ aspect: 'drink', label: 'Drink', wanted: 'Tea', got: 'Coffee' }],
      ticket: undefined,
    });
    const two = { tickets: [{ item: 'tea' as const }, { item: 'coffee' as const, sugar_count: 2 }] };
    expect(comparisonOf(failure('ticket-sugar', { ticket: 2, expected: 2, actual: 1 }, two))).toMatchObject({
      rows: [{ label: 'Sugar', wanted: '2 sugars', got: '1 sugar' }],
      ticket: 2,
    });
    expect(comparisonOf(failure('ticket-sugar', { ticket: 1, expected: true, actual: false }))?.rows[0]).toMatchObject({
      wanted: 'With sugar',
      got: 'No sugar',
    });
    expect(comparisonOf(failure('ticket-to-go-missing', { ticket: 1 }))?.rows[0]).toMatchObject({
      aspect: 'to-go',
      wanted: 'To go',
      got: 'Not marked',
    });
    expect(comparisonOf(failure('ticket-rush-extra', { ticket: 1 }))?.rows[0]).toMatchObject({
      wanted: 'No hurry',
      got: 'Rush',
    });
  });

  it('counts missing and extra tickets, and names the drink a blank sheet was missing', () => {
    const two = { tickets: [{ item: 'tea' as const }, { item: 'coffee' as const }] };
    expect(comparisonOf(failure('ticket-count', { expected: 2, actual: 3 }, two))?.rows[0]).toMatchObject({
      aspect: 'tickets',
      wanted: '2 drinks',
      got: '3 tickets',
    });
    expect(comparisonOf(failure('no-ticket', { expected: 1, actual: 0 }))?.rows[0]).toMatchObject({
      wanted: '1 drink',
      got: 'No tickets',
    });
    // The first sheet reached the kitchen, so the blank one was the second.
    const blank = { ...failure('blank-ticket', undefined, two), actual: [{ quantity: 1 } as RunFailure['actual'][0]] };
    expect(comparisonOf(blank)).toMatchObject({
      rows: [{ label: 'Drink', wanted: 'Coffee', got: 'Nothing written' }],
      ticket: 2,
    });
  });

  it('compares the cup in the kitchen and where Porter took it', () => {
    expect(comparisonOf(failure('too-much-sugar', { expected: 1, actual: 2 }))).toMatchObject({
      columns: ['Ticket', 'Cup'],
      rows: [{ wanted: '1 sugar', got: '2 sugars' }],
    });
    expect(comparisonOf(failure('lid-missing', { expected: true, actual: false }))?.rows[0].got).toBe('No lid');
    expect(comparisonOf(failure('wrong-table', { expected: 2, actual: 4 }))).toMatchObject({
      columns: ['Ticket', 'Went to'],
      rows: [{ wanted: 'Table 2', got: 'Table 4' }],
    });
    expect(comparisonOf(failure('to-go-to-shelf', { expected: 'shelf', actual: 3 }))?.rows[0]).toMatchObject({
      wanted: 'To-go shelf',
      got: 'Table 3',
    });
  });

  it('gives routine and movement failures their own details instead of an empty ticket', () => {
    for (const code of ['compile', 'loop-limit', 'out-of-reach', 'nothing-there', 'wrong-spot'] as const)
      expect(comparisonOf(failure(code))).toBeUndefined();
    // A second lid carries nothing to compare; a lid on a drink that stays in does.
    expect(comparisonOf(failure('lid-extra'))).toBeUndefined();
    expect(comparisonOf(failure('lid-extra', { expected: false, actual: true }))?.rows[0].got).toBe('Lid on');
    expect(comparisonOf(failure('wrong-direction', { expected: 'up', actual: 'right' }))).toMatchObject({
      columns: ['Needed', 'Used'],
      rows: [{ aspect: 'facing', wanted: 'Up', got: 'Right' }],
    });
  });

  it('reads what the simulator reports, so the card and the run agree', () => {
    // Shift 4's routine writes coffee for everyone: the second guest wanted tea.
    const run = runCampaignLevel(3, lessons[3].solution.replace('ITEM tea', 'ITEM coffee'));
    expect(comparisonOf(run.first_failure!)?.rows).toEqual([
      { aspect: 'drink', label: 'Drink', wanted: 'Tea', got: 'Coffee' },
    ]);
    // Handing the same sheet over twice is one ticket too many.
    const again = 'DEPOSIT RIGHT\nMOVE LEFT 1\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT';
    const twice = runCampaignLevel(2, lessons[2].solution.replace('DEPOSIT RIGHT', again));
    expect(twice.first_failure?.code).toBe('ticket-count');
    expect(comparisonOf(twice.first_failure!)?.rows[0]).toMatchObject({ wanted: '1 drink', got: '2 tickets' });
    // Brew turned toward the wrong side of the pickup counter.
    const turned = runServiceShift({
      prep: referencePrograms(levels.length).prep.replace('DEPOSIT UP', 'DEPOSIT RIGHT'),
    });
    expect(comparisonOf(turned.first_failure!)?.rows).toEqual([
      { aspect: 'facing', label: 'Facing', wanted: 'Up', got: 'Right' },
    ]);
  });
});

describe('the evidence a failed run leaves', () => {
  const level = levels[3];
  const programs = { query: lessons[3].solution.replace('ITEM tea', 'ITEM coffee'), prep: '', floor: '' };
  const run = runLevel(level, compileProgram(programs.query, 4), programs);
  const record = (result = run) =>
    recordRun(
      1,
      level,
      programs,
      result,
      level.seeds.map((_, i) => i),
    );

  it('places the failure in its round and guest, and keeps the routines it ran on', () => {
    expect(evidenceOf(level, record())).toMatchObject({ round: 1, guest: 2, programs, practice: false });
    expect(evidenceOf(level, record({ ...run, passed: true, first_failure: null }))).toBeNull();
  });

  it('goes stale when any robot’s routine changes, and fresh again when it changes back', () => {
    const evidence = evidenceOf(level, record())!;
    expect(isStale(evidence, { ...programs })).toBe(false);
    expect(isStale(evidence, { ...programs, floor: 'WAIT DRINKS' })).toBe(true);
  });
});
