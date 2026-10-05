import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { canPauseAt, createLiveRun, splitByUnlock } from '../../../src/domain';
import type { LiveFrame, RobotPrograms, Start } from '../../../src/domain';
import {
  carryMarks,
  noMarks,
  pauseNowhere,
  pauseReason,
  pauseWhen,
  pausedBy,
  toggleMark,
} from '../../../src/features/workspace/breakpoints';

const routine = ['POSITION top', 'LISTEN', 'TAKE UP', 'ITEM coffee', 'MOVE RIGHT 1', 'DEPOSIT RIGHT', 'MOVE LEFT 1'];
const text = (lines: string[]) => [...lines, 'JUMP top'].join('\n');
const marked = new Set([2, 4]);
const carried = (after: string[]) => [...carryMarks(text(routine), text(after), marked)].sort((a, b) => a - b);

describe('marks carried through an edit', () => {
  it('follows its block past an edit above, and ignores one below', () => {
    expect(carried([routine[0], 'MOVE LEFT 1', ...routine.slice(1)])).toEqual([3, 5]);
    expect(carried([...routine.slice(0, 6), 'MOVE LEFT 2'])).toEqual([2, 4]);
  });

  it('stays on a block given a new value, and follows one moved', () => {
    expect(carried(routine.map((line, i) => (i === 4 ? 'MOVE RIGHT 2' : line)))).toEqual([2, 4]);
    const swapped = [...routine];
    [swapped[2], swapped[3]] = [swapped[3], swapped[2]];
    expect(carried(swapped)).toEqual([3, 4]);
  });

  it('goes with a block deleted or rewritten, so it never lands on other code', () => {
    expect(carried(routine.filter((_, i) => i !== 2))).toEqual([3]);
    expect(carried([...routine.slice(0, 2), 'TAKE DOWN', 'ITEM tea', ...routine.slice(4)])).toEqual([4]);
    // Commented out, the line no longer starts anything to pause at.
    expect(carried(routine.map((line, i) => (i === 2 ? '# TAKE UP' : line)))).toEqual([4]);
  });

  it('marks only blocks that start something', () => {
    const source = text(routine);
    expect(canPauseAt(source, 0)).toBe(false);
    expect(routine.slice(1).every((_, i) => canPauseAt(source, i + 1))).toBe(true);
    expect(canPauseAt('IF guest == coffee\n  TAKE UP\nELSE\n  TAKE DOWN\nEND', 2)).toBe(false);
    const marks = toggleMark(toggleMark(noMarks, 'prep', 3), 'prep', 5);
    expect([...marks.prep]).toEqual([3, 5]);
    expect([...toggleMark(marks, 'prep', 3).prep]).toEqual([5]);
    expect(marks.query.size).toBe(0);
  });
});

/** Play a run to its end, pausing wherever it is told to, and keep each pause. */
function playThrough(shift: number, programs: RobotPrograms, stop: ReturnType<typeof pauseWhen>) {
  const run = createLiveRun(levels[shift - 1], programs),
    pauses: Start[][] = [];
  let frame: LiveFrame = run.snapshot();
  for (let n = 0; !frame.done && n < 10_000; n++) {
    frame = run.advance(1e9, stop);
    if (frame.stopped && !frame.done) pauses.push(frame.stopped);
  }
  expect(frame.done).toBe(true);
  // Pausing never changes how the service goes.
  expect(frame.result).toEqual(createLiveRun(levels[shift - 1], programs).advance(1e9).result);
  return pauses;
}

describe('pausing a running service', () => {
  const crew = (shift: number) => splitByUnlock(shift).unlocked;

  it('asks for nothing when nothing is set', () => {
    expect(pauseWhen(crew(13), noMarks, pauseNowhere)).toBeUndefined();
  });

  it('pauses each time a robot arrives at a marked block, never as a ticket ends its wait there', () => {
    const programs = referencePrograms(13),
      listen = programs.prep.split('\n').findIndex((line) => line.trim() === 'LISTEN');
    const marks = toggleMark(noMarks, 'prep', listen);
    const pauses = playThrough(13, programs, pauseWhen(crew(13), marks, pauseNowhere));
    expect(pauses.length).toBeGreaterThan(1);
    for (const stopped of pauses)
      for (const { event, resumed } of stopped) {
        expect([event.role, event.line, resumed]).toEqual(['prep', listen, false]);
        expect(pausedBy(marks, stopped)).toEqual({ reason: 'mark', robot: 'prep' });
      }
  });

  it('pauses at every handoff, when Brew takes a ticket or Porter a drink', () => {
    const pauses = playThrough(
      14,
      referencePrograms(14),
      pauseWhen(crew(14), noMarks, { ...pauseNowhere, handoffs: true }),
    );
    const events = pauses.flat().map((s) => s.event);
    expect(events.every((e) => e.command === 'LISTEN' && !e.waiting && e.role !== 'query')).toBe(true);
    expect(new Set(events.map((e) => e.role))).toEqual(new Set(['prep', 'floor']));
    expect(pauseReason(pausedBy(noMarks, pauses[0]))).toMatch(/^(Brew takes a ticket|Porter takes a drink)$/);
  });

  it('leaves the stand-ins alone: only the player’s robots pause the service', () => {
    const programs = { query: lessons[2].solution, prep: '', floor: '' };
    const marks = toggleMark(toggleMark(noMarks, 'prep', 0), 'floor', 0);
    expect(playThrough(3, programs, pauseWhen(crew(3), marks, { ...pauseNowhere, handoffs: true }))).toEqual([]);
  });

  it('names a mark ahead of a handoff at the same moment', () => {
    const at = (role: 'prep' | 'floor', line: number): Start => ({
      event: { actor: role, role, line, command: 'LISTEN', start: 0, end: 0 } as Start['event'],
      at: 0,
      resumed: false,
    });
    expect(pausedBy(toggleMark(noMarks, 'floor', 2), [at('prep', 1), at('floor', 2)])).toEqual({
      reason: 'mark',
      robot: 'floor',
    });
    expect(pauseReason({ reason: 'mark', robot: 'floor' })).toBe('At Porter’s mark');
    expect(pauseReason({ reason: 'slip', robot: 'query' })).toBe('Query’s slip, before the crew reacts');
  });
});
