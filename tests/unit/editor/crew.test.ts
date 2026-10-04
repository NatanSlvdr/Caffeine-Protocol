import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { createLiveRun, sampleReplay, UNLOCKS } from '../../../src/domain';
import { crewActivity } from '../../../src/features/workspace/crew';
import { finishLiveRun, referenceProgramsFor } from '../../helpers/run';

/** Every activity each robot shows across a whole service, sampled every half second. */
function activities(index: number) {
  const { result } = finishLiveRun(createLiveRun(levels[index], referenceProgramsFor(index)));
  const seed = result.execution![0];
  const seen = { query: new Set<string>(), prep: new Set<string>(), floor: new Set<string>() };
  for (let t = -2; t < seed.duration; t += 0.5) {
    const activity = crewActivity(sampleReplay(result, seed.start + t));
    for (const role of ['query', 'prep', 'floor'] as const)
      if (activity[role]) seen[role].add(`${activity[role]!.state}: ${activity[role]!.label}`);
  }
  return seen;
}

describe('crew activity', () => {
  it('tells a robot waiting for orders from one at work', () => {
    const { query } = activities(UNLOCKS.prep - 1);
    expect(query).toContain('waiting: Waiting for orders');
    expect([...query].some((label) => label.startsWith('working: Working on “'))).toBe(true);
  });

  it('says when a robot has stopped for the night', () => {
    const seen = activities(UNLOCKS.closing - 1);
    expect([...seen.query, ...seen.prep, ...seen.floor]).toContain('stopped: Stopped for the night');
  });
});
