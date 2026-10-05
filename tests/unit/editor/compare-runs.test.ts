import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { createLiveRun, keepRecord, recordRun } from '../../../src/domain';
import type { RobotPrograms, RunRecord } from '../../../src/domain';
import {
  comparableTo,
  compareRuns,
  latestPair,
  routineChanges,
  runName,
} from '../../../src/features/workspace/compare';

const level = levels[2];
const solution = { query: lessons[2].solution, prep: '', floor: '' };
const slipping = { query: 'LISTEN\nITEM coffee', prep: '', floor: '' };
// The solution with a walk it doesn't need, so the run is bigger and runs more steps, and is still served.
const padded = { ...solution, query: solution.query.replace('JUMP listen', 'MOVE RIGHT 1\nMOVE LEFT 1\nJUMP listen') };

function run(id: number, programs: RobotPrograms, practice?: number): RunRecord {
  const { result } = createLiveRun(level, programs, practice === undefined ? {} : { practice }).advance(1e9);
  return recordRun(id, level, programs, result, practice === undefined ? level.seeds.map((_, i) => i) : [practice]);
}

describe('comparing two runs', () => {
  const failed = run(1, slipping),
    served = run(2, solution),
    practice = run(3, solution, 1),
    bigger = run(4, padded);

  it('only sets runs of the same rounds against each other', () => {
    const records = [failed, served, practice, bigger];
    expect(comparableTo(records, bigger).map((r) => r.id)).toEqual([2, 1]);
    expect(comparableTo(records, practice)).toEqual([]);
    expect(latestPair(records)?.map((r) => r.id)).toEqual([2, 4]);
    expect(latestPair([served, practice])).toBeUndefined();
    expect(runName(level, served)).toBe('Run 2 · Service · Served');
    expect(runName(level, practice)).toBe('Run 3 · Practice, round 2 · Served');
    expect(runName(level, failed)).toBe('Run 1 · Service · Stopped');
  });

  it('says what a fix got right, without judging what a stopped run never finished', () => {
    const rows = compareRuns(level, failed, served);
    const row = (label: string) => rows.find((r) => r.label === label)!;
    expect(row('Outcome')).toMatchObject({
      before: 'Query stopped · Round 1 · Mr. Albert',
      after: 'Served',
      change: 'better',
      delta: 'Now served',
    });
    expect(row('Rounds right')).toMatchObject({ before: '0 of 3', after: '3 of 3', change: 'better', delta: '3 more' });
    expect(row('Guests served').change).toBe('better');
    // The stopped run's steps and time only go up to its slip.
    expect(row('Steps run')).toMatchObject({ change: undefined, note: expect.stringMatching(/stopped/) });
    expect(row('Service time').change).toBeUndefined();
    expect(rows.some((r) => r.label === 'Stars')).toBe(false);
  });

  it('judges two served runs on size, steps, time, mood and stars', () => {
    const rows = compareRuns(level, served, bigger);
    const row = (label: string) => rows.find((r) => r.label === label)!;
    expect(row('Outcome')).toMatchObject({ change: 'same' });
    expect(row('Blocks used')).toMatchObject({ before: '8', after: '10', change: 'worse', delta: '2 more' });
    expect(row('Steps run')).toMatchObject({ before: '99', after: '123', change: 'worse', delta: '24 more' });
    expect(row('Stars')).toMatchObject({ after: '2 of 3', change: 'worse', delta: '1 star fewer' });
    expect(compareRuns(level, served, served).every((r) => r.change === 'same')).toBe(true);
  });

  it('keeps each run’s own routines, to say what changed between them', () => {
    const [query] = routineChanges(['query'], served, bigger);
    expect(query).toMatchObject({ role: 'query', added: 2, removed: 0 });
    expect(query.diff.filter((line) => line.kind === 'add').map((line) => line.text.trim())).toEqual([
      'MOVE RIGHT 1',
      'MOVE LEFT 1',
    ]);
    expect(routineChanges(['query'], served, served)[0]).toMatchObject({ added: 0, removed: 0 });
  });

  it('compares and names a run the same once a newer one has let go of its steps', () => {
    const steps = (record: RunRecord) => record.result.execution!.reduce((n, round) => n + round.events.length, 0);
    let records: RunRecord[] = [];
    for (const record of [failed, served, practice, bigger]) records = keepRecord(records, record);
    const [oldFailed, oldServed, oldPractice, newest] = records;
    expect(newest).toBe(bigger);
    expect([oldFailed, oldServed, oldPractice].map(steps)).toEqual([0, 0, 0]);
    expect(steps(served)).toBeGreaterThan(0);
    expect(compareRuns(level, oldFailed, oldServed)).toEqual(compareRuns(level, failed, served));
    expect(compareRuns(level, oldServed, newest)).toEqual(compareRuns(level, served, bigger));
    expect(records.map((r) => runName(level, r))).toEqual(
      [failed, served, practice, bigger].map((r) => runName(level, r)),
    );
    expect(latestPair(records)?.map((r) => r.id)).toEqual([2, 4]);
  });
});
