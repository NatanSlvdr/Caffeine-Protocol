import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { createLiveRun } from '../../../src/domain/liveSimulation';
import { startsIn } from '../../../src/domain/live/steps';
import { sampleReplay } from '../../../src/domain/replay';
import type { ExecutionEvent, RobotPrograms } from '../../../src/domain/types';

type LiveRun = ReturnType<typeof createLiveRun>;
const live = (shift: number, programs: RobotPrograms = referencePrograms(shift)) =>
  createLiveRun(levels[shift - 1], programs);
const said = (events: readonly ExecutionEvent[] = []) =>
  events.map((e) => `${e.actor}:${e.line}:${e.command}${e.waiting ? ` (${e.waiting})` : ''}`);

/** Step a run to its end, mixing every kind of step with stretches of plain play. */
function stepThrough(run: LiveRun) {
  const moves = [
    (r: LiveRun) => r.step(),
    (r: LiveRun) => r.step('prep'),
    (r: LiveRun) => r.advance(7.3),
    (r: LiveRun) => r.step('floor'),
    (r: LiveRun) => r.step('query'),
  ];
  let frame = run.snapshot();
  for (let n = 0; !frame.done && n < 100_000; n++) frame = moves[n % moves.length](run);
  expect(frame.done).toBe(true);
  return frame;
}

describe('stepping a live run', () => {
  it.each([
    ['L09', 9, 9],
    ['L13', 13, 13],
    ['L16', 16, 16],
    ['L19', 19, 19],
    ['L21', 21, 21],
    ['L17’s routines on L18', 18, 17],
    ['L19’s routines on L20', 20, 19],
  ])('ends %s exactly as a run left to play does', (_, shift, from) => {
    const played = live(shift, referencePrograms(from)).advance(1e9).result;
    expect(stepThrough(live(shift, referencePrograms(from))).result).toEqual(played);
  });

  it('stops at the first moment, telling everyone who starts there in the order an order travels', () => {
    const run = live(13);
    const first = run.step();
    expect(first.time).toBe(0);
    expect(first.started?.map((e) => e.actor)).toEqual(['query', 'prep', 'floor']);
    expect(said(first.started)[1]).toBe('prep:1:LISTEN (ticket)');
    // The next step is the next moment anyone starts something, however short the gap.
    const next = run.step();
    expect(next.time).toBeGreaterThan(0);
    expect(next.time).toBeLessThan(0.5);
    expect(said(next.started)).toEqual(['floor:2:LISTEN (drink)']);
  });

  it('counts a wait once, however long it lasts, and stops for the robot asked about', () => {
    const run = live(16);
    expect(said(run.step('floor').started)).toContain('floor:0:STORE var2 FROM here');
    const waiting = run.step('floor');
    expect(said(waiting.started)).toContain('floor:2:LISTEN (drink)');
    // Porter's wait is written again on every tick, but the next step for Porter is the drink it claims, a minute on.
    const claimed = run.step('floor');
    expect(claimed.time - waiting.time).toBeGreaterThan(30);
    expect(said(claimed.started)).toContain('floor:2:LISTEN');
    // What the others start at that moment is told too.
    expect(claimed.started?.some((e) => e.actor !== 'floor')).toBe(true);
  });

  it('hands every start over once and only once, a Move as one start rather than one per tile', () => {
    const run = live(16),
      told: ExecutionEvent[] = [];
    let frame = run.snapshot();
    for (let n = 0; !frame.done && n < 10_000; n++) {
      frame = run.step();
      told.push(...(frame.started ?? []));
    }
    expect(frame.done).toBe(true);
    // Rounds follow one another, so the log read straight through holds every start, in order but for ties.
    const all = frame.result.execution!.flatMap((round) => startsIn(round.events));
    expect(new Set(told)).toEqual(new Set(all));
    expect(told).toHaveLength(all.length);
    expect(told.every((e) => (e.completed ?? 1) <= 1)).toBe(true);
    expect(told.some((e) => e.command.startsWith('MOVE ') && e.end - e.start > 0)).toBe(true);
  });

  it('plays to the end of the service when the robot asked about has nothing more to start', () => {
    const run = live(20, { ...referencePrograms(20), floor: 'STOP' });
    expect(said(run.step('floor').started)).toContain('floor:0:STOP');
    const frame = run.step('floor');
    expect(frame.done).toBe(true);
    expect(frame.started?.some((e) => e.actor === 'floor')).toBe(false);
    expect(frame.result).toEqual(live(20, { ...referencePrograms(20), floor: 'STOP' }).advance(1e9).result);
  });
});

describe('what the records hold for the inspector', () => {
  it('says what each wait is for', () => {
    const reasons = new Set(
      live(18)
        .advance(1e9)
        .result.execution!.flatMap((round) => round.events.map((e) => e.waiting && `${e.role}:${e.waiting}`)),
    );
    expect([...reasons].filter(Boolean).sort()).toEqual([
      'floor:drink',
      'floor:used-cup',
      'prep:ticket',
      'query:guest',
    ]);
  });

  it('keeps a waiting robot’s memory, so nothing it stored reads as unset', () => {
    const waits = live(16)
      .advance(1e9)
      .result.execution![0].events.filter((e) => e.actor === 'floor' && e.waiting);
    expect(waits.length).toBeGreaterThan(0);
    expect(waits.every((e) => e.variables?.var2 !== undefined)).toBe(true);
  });

  it('records a For loop’s lap: the item Query heard, and how many times a worker repeats', () => {
    const events = live(11).advance(1e9).result.execution![0].events;
    const queryLaps = events.filter((e) => e.actor === 'query' && e.loop);
    expect(queryLaps.length).toBeGreaterThan(0);
    for (const e of queryLaps) {
      expect(e.loop).toMatchObject({ line: 5, item: { tokens: expect.arrayContaining([expect.any(String)]) } });
      expect(e.loop!.pass).toBeLessThanOrEqual(e.loop!.passes);
    }
    const sugarLaps = events.filter((e) => e.actor === 'prep' && e.loop);
    expect(sugarLaps.length).toBeGreaterThan(0);
    for (const e of sugarLaps) {
      expect(e.loop!.line).toBe(16);
      expect(e.loop!.passes).toBe(e.variables?.var1);
      expect(e.loop!.pass).toBeGreaterThanOrEqual(1);
      expect(e.loop!.pass).toBeLessThanOrEqual(e.loop!.passes);
      expect(e.loop!.item).toBeUndefined();
    }
  });

  it('puts the wait and the lap on the sampled robot', () => {
    const run = live(13),
      first = run.step('prep');
    const prep = sampleReplay(first.result, first.time).actors.prep!;
    expect(prep.action?.waiting).toBe('ticket');
    const result = live(11).advance(1e9).result;
    const lap = result.execution![0].events.find((e) => e.actor === 'query' && e.loop && e.end > e.start)!;
    const query = sampleReplay(result, result.execution![0].start + lap.end).actors.query!;
    expect(query.loop?.line).toBe(5);
  });
});
