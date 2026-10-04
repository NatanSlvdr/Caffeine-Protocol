import { describe, expect, it } from 'vitest';
import { lessons, levels } from '../../../src/data';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { campaignNarrative } from '../../../src/data/campaign/narrative';
import { evidenceOf } from '../../../src/features/workspace/evidence';
import { clueFor } from '../../../src/features/workspace/hints';

// Shift 4: tea joins the menu, and the example tells the two drinks apart.
const example = lessons[3].solution;

describe('a clue about the routine', () => {
  it('names the blocks the example uses that the routine has none of', () => {
    expect(clueFor('query', (lessons[3] as { starter: string }).starter, example, null, false)).toEqual({
      text: 'The worked example uses If and Else, which Query’s routine doesn’t have yet.',
    });
    expect(clueFor('query', '', 'POSITION listen\nLISTEN\nJUMP listen', null, false).text).toBe(
      'The worked example uses Jump destination, Wait for Orders and Jump, which Query’s routine doesn’t have yet.',
    );
  });

  it('points at the first block where the routine and the example part ways, never calling it wrong', () => {
    const coffee = example.replace('ITEM tea', 'ITEM coffee');
    expect(clueFor('query', coffee, example, null, false)).toEqual({
      text: 'Query’s routine follows the worked example as far as “if tea in orders”, then parts ways at “write coffee”.',
      show: { role: 'query', line: 4 },
    });
    // Blank lines and indentation aren't differences; the line shown is the block's own.
    expect(clueFor('query', `\n${coffee}`, example, null, false).show).toEqual({ role: 'query', line: 5 });
    expect(clueFor('query', example.replace('POSITION listen', 'LISTEN'), example, null, false).text).toBe(
      'The worked example uses Jump destination, which Query’s routine doesn’t have yet.',
    );
  });

  it('says when the routine stops short of the example, runs on past it, or is the same', () => {
    const short = example.replace(/\nJUMP listen$/, '');
    expect(clueFor('query', short + '\nJUMP listen\nMOVE LEFT 1', example, null, false).text).toBe(
      'Query’s routine follows the whole worked example, then carries on at “move left 1”.',
    );
    expect(clueFor('query', example, example + '\nJUMP listen', null, false)).toEqual({
      text: 'Query’s routine follows the worked example as far as it goes, then ends at “jump listen”, where the example carries on.',
      show: { role: 'query', line: 11 },
    });
    expect(clueFor('query', example, example, null, false)).toEqual({
      text: 'Query’s routine matches the worked example, block for block.',
    });
  });

  it('sends the player to the robot that stopped, while the last run still describes the routines', () => {
    const level = levels[3];
    const programs = { query: example.replace('ITEM tea', 'ITEM coffee'), prep: '', floor: '' };
    const evidence = evidenceOf(level, runLevel(level, compileProgram(programs.query, 4), programs), programs)!;
    const elsewhere = { ...evidence, failure: { ...evidence.failure, role: 'prep' as const, error_line: 2 } };
    expect(clueFor('query', example, example, elsewhere, false)).toEqual({
      text: 'The last run stopped in Brew’s routine, not Query’s. Look there first.',
      show: { role: 'prep', line: 2 },
    });
    // Once the routines move on, the run no longer says where to look.
    expect(clueFor('query', example, example, elsewhere, true).text).toContain('block for block');
    // A run that stopped in the open routine leaves the clue to the routine itself.
    expect(clueFor('query', programs.query, example, evidence, false).text).toContain('parts ways at “write coffee”');
  });
});

describe('the idea behind each shift', () => {
  it('gives every shift a reminder that isn’t its lesson note again', () => {
    for (const row of campaignNarrative) {
      expect(row.concept.length).toBeGreaterThan(40);
      expect(row.concept).not.toBe(row.lessonNote);
      expect(row.concept).not.toMatch(/'/);
    }
  });
});
