import { describe, expect, it } from 'vitest';
import { drills } from '../../../src/data/drills';
import { drillShift, flights } from '../../../src/data/flights';
import { predictions } from '../../../src/data/predictions';

/** A flight only names drills: each must exist, in campaign order, and every drill belongs to some flight. */
describe('flights', () => {
  const ids = [...drills, ...predictions].map((each) => each.id);

  it('have their own ids and titles', () => {
    expect(new Set(flights.map((flight) => flight.id)).size).toBe(flights.length);
    expect(new Set(flights.map((flight) => flight.title)).size).toBe(flights.length);
  });

  it.each(flights.map((flight) => [flight.id, flight] as const))(
    '%s is a few drills, in campaign order',
    (_, flight) => {
      expect(flight.items.length).toBeGreaterThanOrEqual(3);
      expect(new Set(flight.items).size).toBe(flight.items.length);
      for (const id of flight.items) expect(ids, id).toContain(id);
      const shifts = flight.items.map(drillShift);
      expect(shifts).toEqual([...shifts].sort((a, b) => a - b));
    },
  );

  it('leave no drill out', () => {
    const flown = new Set(flights.flatMap((flight) => flight.items));
    expect(ids.filter((id) => !flown.has(id))).toEqual([]);
  });

  it('name no robot, since a flight shows before its later drills open', () => {
    for (const flight of flights) expect(`${flight.title} ${flight.idea}`, flight.id).not.toMatch(/Query|Brew|Porter/);
  });
});
