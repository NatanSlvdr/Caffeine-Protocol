import { describe, expect, it } from 'vitest';
import { levels, lessons } from '../src/data';
import { BOUNDS, ENTRANCE, ROOM, STATIONS, tableFront } from '../src/domain/layout';
import { compileProgram } from '../src/domain/program';
import { sampleReplay } from '../src/domain/replay';
import { runLevel } from '../src/domain/simulation';
import { customerApproach, customerExit, samplePath, SIDEWALK_X, STREET_APPROACH_SECONDS, STREET_EXIT_SECONDS, STREET_BOUNDS } from '../src/domain/street';

describe('street customer routes', () => {
  it('matches the café length and places customer spawning beyond the clipped edges', () => {
    expect(STREET_BOUNDS.length).toBe(ROOM[1]);
    expect(STREET_BOUNDS.minZ).toBe(BOUNDS.minZ - .5);
    expect(STREET_BOUNDS.maxZ).toBe(BOUNDS.maxZ + .5);
    for (const index of [0, 1]) {
      const first = customerApproach(index)[0], last = customerExit(tableFront(0), index).at(-1)!;
      for (const point of [first, last]) expect(point[1] < STREET_BOUNDS.minZ - .5 || point[1] > STREET_BOUNDS.maxZ + .5).toBe(true);
    }
  });
  it('approaches from both sidewalk ends and enters through the doorway', () => {
    for (const index of [0, 1]) {
      const path = customerApproach(index);
      expect(path[0]).toEqual([SIDEWALK_X, index % 2 ? STREET_BOUNDS.minZ - 1 : STREET_BOUNDS.maxZ + 1]);
      expect(path.slice(1, 3)).toEqual([[SIDEWALK_X, ENTRANCE[1]], ENTRANCE]);
      expect(path.at(-1)).toEqual(STATIONS.orders.floor);
      path.slice(1).forEach((point, i) => expect(point[0] === path[i][0] || point[1] === path[i][1]).toBe(true));
    }
  });

  it('returns from the tables through the same door onto the sidewalk', () => {
    const path = customerExit(tableFront(0), 0);
    expect(path[0]).toEqual(tableFront(0));
    expect(path.slice(-3)).toEqual([ENTRANCE, [SIDEWALK_X, ENTRANCE[1]], [SIDEWALK_X, STREET_BOUNDS.minZ - 1]]);
  });

  it('samples by distance without jumping at waypoint boundaries', () => {
    const path = [[-10, 0], [-10, 6], [-8, 6]] as const;
    expect(samplePath(path, .5)).toEqual([-10, 4]);
    expect(samplePath(path, .75)).toEqual([-10, 6]);
    expect(samplePath(path, .875)).toEqual([-9, 6]);
    expect(samplePath(path, -1)).toEqual(path[0]);
    expect(samplePath(path, 2)).toEqual(path.at(-1));
  });

  it('shows the first customer outside before service and keeps recorded service times intact', () => {
    const result = runLevel(levels[0], compileProgram(lessons[0].solution, 1));
    const event = result.events[0];
    const before = JSON.stringify(result);
    const approach = sampleReplay(result, -STREET_APPROACH_SECONDS);
    expect(approach.seed?.seed_id).toBe(result.execution?.[0].seed_id);
    expect(approach.customers.find(c => c.id === event.customer.customer_id)?.position).toEqual(customerApproach(0)[0]);
    const counter = sampleReplay(result, event.timing.created);
    expect(counter.customers.find(c => c.id === event.customer.customer_id)?.position).toEqual(STATIONS.orders.floor);
    const exiting = sampleReplay(result, event.timing.left + STREET_EXIT_SECONDS - .01);
    expect(exiting.customers.find(c => c.id === event.customer.customer_id)?.position[0]).toBe(SIDEWALK_X);
    const gone = sampleReplay(result, event.timing.left + STREET_EXIT_SECONDS);
    expect(gone.customers.some(c => c.id === event.customer.customer_id)).toBe(false);
    expect(JSON.stringify(result)).toBe(before);
  });
});
