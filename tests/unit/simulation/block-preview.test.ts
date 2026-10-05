import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { blockVisits, previewKind, reachedName, standingName, type RobotPrograms } from '../../../src/domain';
import { dryRound, visitWords } from '../../../src/features/workspace/blockPreview';

/** Shift 3, with Query's routine as given. */
const query = (source: string): RobotPrograms => ({ query: source, prep: '', floor: '' });
const lineOf = (source: string, command: string) => source.split('\n').findIndex((l) => l.trim() === command);

describe('where a block goes in the café', () => {
  it('previews only the blocks that walk or reach', () => {
    expect(['MOVE RIGHT 3', 'MOVE var1', 'TAKE UP', 'PICKUP DOWN', 'DEPOSIT LEFT', 'USE UP'].map(previewKind)).toEqual([
      'move',
      'move',
      'reach',
      'reach',
      'reach',
      'reach',
    ]);
    expect(['LISTEN', 'ITEM coffee', 'JUMP listen', 'POSITION listen', ''].map(previewKind)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('gathers a walk of several tiles into one way, made each time round', () => {
    const programs = referencePrograms(9);
    const round = dryRound(levels[8], 9, programs).execution![0];
    const line = lineOf(programs.prep, 'MOVE RIGHT 3');
    expect(blockVisits(round, 'prep', line)).toEqual([
      {
        path: [
          [-1, 5],
          [0, 5],
          [1, 5],
          [2, 5],
        ],
        times: 2,
      },
    ]);
    const [use] = blockVisits(round, 'prep', lineOf(programs.prep, 'USE UP'));
    expect(use).toMatchObject({ path: [[2, 5]], target: [2, 4], action: 'GRIND' });
  });

  it('says each way in words, naming where a robot stands and what it reaches', () => {
    const programs = referencePrograms(9);
    const round = dryRound(levels[8], 9, programs).execution![0];
    const words = (command: string) =>
      blockVisits(round, 'prep', lineOf(programs.prep, command)).map((v) => visitWords(v, command, 'prep', 9));
    expect(words('MOVE RIGHT 3')).toEqual(['Brew walks 3 tiles right, from storage to the coffee machine.']);
    expect(words('DEPOSIT UP')).toEqual(['Brew reaches up to the pickup counter, and puts the drink out.']);
    const source = lessons[2].solution;
    const q = dryRound(levels[2], 3, query(source)).execution![0];
    const said = (command: string) =>
      blockVisits(q, 'query', lineOf(source, command)).map((v) => visitWords(v, command, 'query', 3));
    expect(said('TAKE UP')).toEqual(['Query reaches up to the paper, and takes a sheet.']);
    expect(said('MOVE RIGHT 1')).toEqual(['Query walks 1 tile right, from the register to the order handoff.']);
    expect(said('DEPOSIT RIGHT')).toEqual(['Query reaches right to the order handoff, and puts the ticket down.']);
  });

  it('keeps each table a block walks to as its own way', () => {
    const programs = referencePrograms(17);
    const round = dryRound(levels[16], 17, programs).execution![0];
    const line = programs.floor.split('\n').findIndex((l) => l.trim() === 'MOVE var1');
    const visits = blockVisits(round, 'floor', line);
    expect(visits.length).toBeGreaterThan(3);
    const tables = visits.map((v) => visitWords(v, 'MOVE var1', 'floor', 17).match(/to table (\d+)\.$/)?.[1]);
    expect(new Set(tables).size).toBe(visits.length);
  });

  it('marks a reach into nothing, and leaves the blocks after it unrun', () => {
    const source = lessons[2].solution.replace('DEPOSIT RIGHT', 'DEPOSIT DOWN');
    const run = dryRound(levels[2], 3, query(source));
    expect(run.passed).toBe(false);
    const [reach] = blockVisits(run.execution![0], 'query', lineOf(source, 'DEPOSIT DOWN'));
    expect(reach.target).toEqual([-4, 6]);
    expect(reachedName(reach.target!)).toBeUndefined();
    expect(visitWords(reach, 'DEPOSIT DOWN', 'query', 3)).toMatch(
      /^Query reaches down, but nothing is there\. The run stops here: .+\.$/,
    );
    expect(blockVisits(run.execution![0], 'query', lineOf(source, 'MOVE LEFT 1'))).toEqual([]);
    const blocked = lessons[2].solution.replace('MOVE RIGHT 1', 'MOVE LEFT 3');
    const [stuck] = blockVisits(dryRound(levels[2], 3, query(blocked)).execution![0], 'query', 4);
    expect(visitWords(stuck, 'MOVE LEFT 3', 'query', 3)).toBe('Query can’t move: the way is blocked.');
  });

  it('names stations by where each robot stands at them', () => {
    expect(standingName([-1, 5], 'prep')).toBe('storage');
    expect(standingName([0, 5], 'prep')).toBeUndefined();
    expect(standingName([6, 3], 'floor')).toBe('the pickup counter');
    expect(standingName([-6, 0], 'floor')).toBe('table 9');
    expect(reachedName([-6, -1])).toBe('table 9');
    expect(reachedName([5, 4])).toBe('the lids');
  });
});
