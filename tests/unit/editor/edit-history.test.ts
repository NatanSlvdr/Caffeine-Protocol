import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  TYPING_BURST_MS,
  emptyHistory,
  keepHistories,
  keptHistories,
  record,
  redo,
  undo,
} from '../../../src/features/workspace/history';
import type { RoutineHistory } from '../../../src/features/workspace/history';

/** Apply edits in order, `ms` apart, and return the history plus the routine it ends on. */
function edits(sources: string[], ms = TYPING_BURST_MS * 2, start = emptyHistory()) {
  let history: RoutineHistory = start,
    present = sources[0];
  for (const [i, next] of sources.slice(1).entries()) {
    history = record(history, present, next, i * ms);
    present = next;
  }
  return { history, present };
}

describe('routine edit history', () => {
  it('undoes and redoes edits in order, back to the exact routine', () => {
    const { history, present } = edits(['LISTEN', 'LISTEN\nWRITE coffee', 'LISTEN\nWRITE coffee\nSUBMIT']);
    const one = undo(history, present)!;
    expect(one.source).toBe('LISTEN\nWRITE coffee');
    const two = undo(one.history, one.source)!;
    expect(two.source).toBe('LISTEN');
    expect(undo(two.history, two.source)).toBeNull();
    const back = redo(two.history, two.source)!;
    expect(back.source).toBe('LISTEN\nWRITE coffee');
    expect(redo(back.history, back.source)!.source).toBe(present);
  });
  it('drops the redo steps once a new edit is made', () => {
    const { history, present } = edits(['A', 'A\nB', 'A\nB\nC']);
    const undone = undo(history, present)!;
    const branched = record(undone.history, undone.source, 'A\nB\nD', 10_000);
    expect(redo(branched, 'A\nB\nD')).toBeNull();
    expect(undo(branched, 'A\nB\nD')!.source).toBe('A\nB');
  });
  it('groups a burst of typing on one line into one step', () => {
    const typed = ['MOVE', 'MOVE ', 'MOVE R', 'MOVE RI', 'MOVE RIGHT'];
    const { history, present } = edits(typed, 100);
    expect(history.past).toEqual(['MOVE']);
    expect(undo(history, present)!.source).toBe('MOVE');
  });
  it('starts a new step after a pause, on a new line, or when lines are added', () => {
    expect(edits(['MOVE', 'MOVE R', 'MOVE RI'], TYPING_BURST_MS + 1).history.past).toHaveLength(2);
    // Line 2 changes after line 1 did: two steps, even typed quickly.
    expect(edits(['A\nB', 'Ax\nB', 'Ax\nBy'], 50).history.past).toHaveLength(2);
    // Enter adds a line: its own step, and typing on the new line is another.
    expect(edits(['A', 'A\n', 'A\nB'], 50).history.past).toHaveLength(2);
  });
  it('records a layout-only change without making it an undo step', () => {
    const history = record(emptyHistory(), 'IF x\nLISTEN\nEND', 'IF x\n  LISTEN\nEND', 0, 'format');
    expect(history.past).toEqual([]);
    expect(record(emptyHistory(), 'A', 'A', 0).past).toEqual([]);
  });
  it('keeps a bounded number of steps', () => {
    const sources = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => `LINE ${i}\n`.repeat(i + 1));
    const { history } = edits(sources);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past.at(-1)).toBe(sources.at(-2));
  });
  it('keeps a shift’s histories only while they still lead to its routines', () => {
    const programs = { query: 'LISTEN', prep: 'WAIT ORDER', floor: '' };
    const query = edits(['', 'LISTEN']).history;
    keepHistories('L41', programs, { query, prep: query, floor: emptyHistory() });
    const back = keptHistories('L41', { ...programs, prep: 'WAIT ORDER\nSTOP' });
    expect(back.query).toBe(query);
    expect(back.prep.past).toEqual([]);
    expect(keptHistories('L42', programs).query.past).toEqual([]);
  });
});
