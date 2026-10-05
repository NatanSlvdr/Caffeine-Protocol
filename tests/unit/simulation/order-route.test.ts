import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import {
  STREET_APPROACH_SECONDS,
  createLiveRun,
  orderRoute,
  orderWhereabouts,
  sampleReplay,
} from '../../../src/domain';
import type { RobotPrograms } from '../../../src/domain';
import { followable, guestName, legWords, routeDone } from '../../../src/features/workspace/route';

const played = (shift: number, programs: RobotPrograms, seconds = 1e9) =>
  createLiveRun(levels[shift - 1], programs).advance(seconds);
const solution = (shift: number) => ({ query: lessons[shift - 1].solution, prep: '', floor: '' });

describe('following an order', () => {
  it('reads one guest’s order off the records, from walking in to the cup cleared', () => {
    const { result } = played(3, solution(3));
    const guest = result.events[0];
    const route = orderRoute(result, guest);
    expect(route.map((leg) => leg.stage)).toEqual([
      'arrive',
      'order',
      'write',
      'claim',
      'make',
      'ready',
      'pickup',
      'serve',
      'leave',
      'clear',
    ]);
    expect(route.map((leg) => leg.at)).toEqual(route.map((leg) => leg.at).sort((a, b) => a - b));
    // The stand-ins are named as the café names them, and the drink once, where it is made.
    expect(route.map((leg) => legWords(leg, guest, 3))).toEqual([
      'Walks in',
      'Query takes the order',
      'Query writes the ticket',
      'Moka takes the ticket',
      'Moka makes the coffee',
      'Moka puts it out for pickup',
      'Pip picks it up',
      'Pip serves it at table 1',
      'Leaves',
      'Pip clears the cup',
    ]);
    expect(routeDone(route, true, false)).toBe(true);
    expect(guestName(levels[2], guest)).toBe('Guest 1');
  });

  it('keeps each cup of a two-drink order on its own way', () => {
    const { result } = played(21, referencePrograms(21));
    const guest = result.events.find((e) => e.tickets.length > 1)!;
    const route = orderRoute(result, guest);
    const cups = [...new Set(guest.tickets.map((paper) => paper.item))];
    for (const cup of cups) {
      const own = route.filter((leg) => leg.cup === cup).map((leg) => leg.stage);
      expect(own).toEqual(['write', 'claim', 'make', 'ready', 'pickup', 'serve', 'clear']);
    }
    // Each cup is served and cleared by its own id, and both are said by name.
    const serves = route.filter((leg) => leg.stage === 'serve');
    expect(new Set(serves.map((leg) => leg.unit)).size).toBe(2);
    expect(serves.map((leg) => legWords(leg, guest, 21))).toEqual(
      cups.map((cup) => `Porter serves the ${cup} at table ${guest.table}`),
    );
  });

  it('hands a to-go cup over, and has nothing to clear', () => {
    const { result } = played(17, referencePrograms(17));
    const guest = result.events.find((e) => e.customer.phrase.includes('to go'))!;
    const route = orderRoute(result, guest);
    const serve = route.find((leg) => leg.stage === 'serve')!;
    expect(serve.toGo).toBe(true);
    expect(legWords(serve, guest, 17)).toBe('Porter hands it over to go');
    expect(route.some((leg) => leg.stage === 'clear')).toBe(false);
    expect(routeDone(route, true, false)).toBe(true);
  });

  it('ends an order that slipped on the slip', () => {
    const { result } = played(3, { query: 'LISTEN\nITEM coffee', prep: '', floor: '' });
    const guest = result.events[0];
    const route = orderRoute(result, guest);
    expect(route.at(-1)).toMatchObject({ stage: 'slip', role: 'query', line: 1 });
    expect(legWords(route.at(-1)!, guest, 3)).toBe('Query stopped: Take the order paper before writing its item');
    expect(routeDone(route, true, false)).toBe(true);
  });

  it('only tells what has happened by a time, and says it is still on its way', () => {
    const { result } = played(3, solution(3));
    const guest = result.events[0];
    const whole = orderRoute(result, guest);
    const serve = whole.find((leg) => leg.stage === 'serve')!;
    const sofar = orderRoute(result, guest, serve.at);
    expect(sofar.at(-1)!.stage).toBe('serve');
    expect(sofar.every((leg) => leg.at <= serve.at)).toBe(true);
    expect(routeDone(sofar, true, false)).toBe(false);
    // The same, told while the run is still playing.
    const live = played(3, solution(3), STREET_APPROACH_SECONDS + serve.at + 1);
    expect(orderRoute(live.result, live.result.events[0], live.time).map((leg) => [leg.stage, leg.at])).toEqual(
      orderRoute(result, guest, live.time).map((leg) => [leg.stage, leg.at]),
    );
  });

  it('finds who holds the order, and where it waits', () => {
    const { result } = played(3, solution(3));
    const guest = result.events[0];
    const route = orderRoute(result, guest);
    const middle = (stage: string) => {
      const leg = route.find((l) => l.stage === stage)!;
      return orderWhereabouts(sampleReplay(result, (leg.at + leg.end) / 2), guest);
    };
    expect(middle('write').holders).toEqual(['query']);
    expect(middle('make').holders).toEqual(['prep']);
    const ready = route.find((l) => l.stage === 'ready')!;
    const pickup = route.find((l) => l.stage === 'pickup')!;
    expect(orderWhereabouts(sampleReplay(result, (ready.end + pickup.at) / 2), guest).pickup).toBe(true);
    expect(middle('serve').holders).toEqual(['floor']);
  });

  it('offers the guests who have walked in, round by round', () => {
    const level = levels[2];
    const { result } = played(3, solution(3));
    const all = followable(level, result, Infinity);
    expect(all).toHaveLength(result.events.length);
    expect(all[0]).toMatchObject({ round: 1, label: 'Guest 1 · “coffee”' });
    expect(new Set(all.map((f) => f.round))).toEqual(new Set([1, 2, 3]));
    expect(followable(level, result, 0).map((f) => f.label)).toEqual(['Guest 1 · “coffee”']);
  });
});
