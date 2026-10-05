import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { createLiveRun, runMoments } from '../../../src/domain';
import type { Moment, RobotPrograms } from '../../../src/domain';
import { jumpTargets, landOn, momentWords, nextMoment, whenWords } from '../../../src/features/workspace/timeline';

const played = (shift: number, programs: RobotPrograms, seconds = 1e9) =>
  createLiveRun(levels[shift - 1], programs).advance(seconds);

describe('the moments of a run', () => {
  it('reads every order and handoff off the records, in time order', () => {
    const { result } = played(14, referencePrograms(14));
    const moments = runMoments(result, Infinity);
    expect(moments.map((m) => m.at)).toEqual(moments.map((m) => m.at).sort((a, b) => a - b));
    // Each guest is heard once, and each ticket taken by Brew and its drinks by Porter.
    const orders = moments.filter((m) => m.kind === 'order');
    expect(orders.map((m) => m.guest)).toEqual(expect.arrayContaining(result.events));
    expect(orders).toHaveLength(result.events.length);
    const handoffs = moments.filter((m) => m.kind === 'handoff');
    expect(handoffs.filter((m) => m.event.role === 'prep').length).toBeGreaterThan(0);
    expect(handoffs.filter((m) => m.event.role === 'floor').length).toBeGreaterThan(0);
    expect(moments.some((m) => m.kind === 'slip')).toBe(false);
    // Each round counts from its own start.
    expect(new Set(moments.map((m) => m.round))).toEqual(new Set([1, 2, 3]));
  });

  it('tells the past the same while the run is still going as once it is over', () => {
    const live = played(14, referencePrograms(14), 250);
    const after = runMoments(played(14, referencePrograms(14)).result, live.time);
    // A block still running has no end yet, so what is compared is what each moment was, and when.
    const told = (moments: Moment[]) => moments.map((m) => [m.at, m.kind, m.round, m.event.role, m.event.line]);
    expect(told(runMoments(live.result, live.time))).toEqual(told(after));
    expect(after.every((m) => m.at <= live.time)).toBe(true);
  });

  it('ends a run that slipped on the slip', () => {
    const { result } = played(3, { query: 'LISTEN\nITEM coffee', prep: '', floor: '' });
    const moments = runMoments(result, Infinity);
    expect(moments[0]).toMatchObject({ at: 0, kind: 'order' });
    expect(moments.at(-1)).toMatchObject({ kind: 'slip', event: { role: 'query', line: 1 } });
  });
});

describe('jumping between moments', () => {
  const { result } = played(14, referencePrograms(14));
  const moments = runMoments(result, Infinity);
  const crew = ['query', 'prep', 'floor'] as const;

  it('jumps between the big moments, one kind of them, or one robot’s starts', () => {
    const big = jumpTargets(moments, 'all', crew);
    expect(new Set(big.map((m) => m.kind))).toEqual(new Set(['order', 'handoff']));
    expect(jumpTargets(moments, 'handoff', crew).every((m) => m.kind === 'handoff')).toBe(true);
    const brew = jumpTargets(moments, 'prep', crew);
    expect(brew.every((m) => m.event.role === 'prep')).toBe(true);
    expect(brew.length).toBeGreaterThan(jumpTargets(moments, 'handoff', crew).length);
    // Without Brew and Porter in the crew, the stand-ins' handoffs stay off the timeline.
    expect(jumpTargets(moments, 'all', ['query']).every((m) => m.kind === 'order')).toBe(true);
    expect(jumpTargets(moments, 'prep', ['query'])).toEqual([]);
  });

  it('steps over the moment it is on, either way', () => {
    const orders = jumpTargets(moments, 'order', crew);
    expect(nextMoment(orders, landOn(orders[1]), 1)).toBe(orders[2]);
    expect(nextMoment(orders, landOn(orders[1]), -1)).toBe(orders[0]);
    expect(nextMoment(orders, 0, -1)).toBeUndefined();
    expect(nextMoment(orders, Infinity, 1)).toBeUndefined();
  });

  it('says what happened, and when', () => {
    const programs = referencePrograms(14);
    const order = moments.find((m) => m.kind === 'order')!;
    expect(momentWords(order, programs, false)).toBe(`Query takes an order: “${order.guest!.customer.phrase}”`);
    const handoff = moments.find((m) => m.kind === 'handoff')!;
    expect(momentWords(handoff, programs, false)).toMatch(/^(Brew takes a ticket|Porter takes a drink)$/);
    const start = moments.find((m) => m.kind === 'start' && m.event.role === 'prep' && !m.event.waiting)!;
    expect(momentWords(start, programs, true)).toMatch(/^Brew: .+, line \d+$/);
    expect(whenWords(3, 2, 42)).toBe('Round 2 · 42.0 s');
    expect(whenWords(1, 1, -2)).toBe('Before opening');
    const slip = runMoments(
      played(3, { query: lessons[2].solution.replace('TAKE UP', 'MOVE RIGHT 1'), prep: '', floor: '' }).result,
      Infinity,
    ).at(-1)!;
    expect(momentWords(slip, programs, false)).toMatch(/^Query stopped: .+/);
  });
});
