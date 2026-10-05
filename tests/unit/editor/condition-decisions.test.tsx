import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { lessons, levels } from '../../../src/data';
import { createLiveRun, recordRun, spokenBlock } from '../../../src/domain';
import type { RobotPrograms, TraceStep } from '../../../src/domain';
import { decisionsOf, evidenceOf } from '../../../src/features/workspace/evidence';
import { FailureCard } from '../../../src/features/workspace/FailureCard';
import { finishLiveRun, runCampaignLevel } from '../../helpers/run';

/** Shift 5's routine, with its sugar check needing coffee too: a tea with sugar goes out without it. */
const SUGARLESS = lessons[4].solution.replace(
  'IF sugar IN CUSTOMER SPEECH',
  'IF sugar IN CUSTOMER SPEECH AND coffee IN CUSTOMER SPEECH',
);

function failedEvidence(index: number, query: string) {
  const programs: RobotPrograms = { query, prep: '', floor: '' };
  const run = runCampaignLevel(index, query);
  const level = levels[index];
  return evidenceOf(
    level,
    recordRun(
      1,
      level,
      programs,
      run,
      level.seeds.map((_, i) => i),
    ),
  )!;
}

describe('why an IF went the way it did', () => {
  it('records each IF’s outcome and the tokens it tested, as Query heard them', () => {
    const evidence = failedEvidence(4, SUGARLESS);
    expect(evidence.failure.phrase).toBe('tea with sugar');
    expect(evidence.decisions).toEqual([
      { line: 3, condition: 'if tea in orders', holds: true, parts: [], heard: ['orders: tea, sugar'] },
      {
        line: 8,
        condition: 'if sugar in orders and coffee in orders',
        holds: false,
        parts: [
          { text: 'sugar in orders', holds: true },
          { text: 'coffee in orders', holds: false },
        ],
        heard: ['orders: tea, sugar'],
      },
    ]);
  });

  it('keeps them through a live run, as the workspace plays it', () => {
    const programs: RobotPrograms = { query: SUGARLESS, prep: '', floor: '' };
    const { result } = finishLiveRun(createLiveRun(levels[4], programs));
    const evidence = evidenceOf(levels[4], recordRun(1, levels[4], programs, result, [0]))!;
    expect(evidence.decisions.map((decision) => decision.holds)).toEqual([true, false]);
  });

  it('shows Or and Not in, item by item, and words tokens and empty places plainly', () => {
    const step = (command: string, holds: boolean, heard: Record<string, string[]>): TraceStep => ({
      line: 4,
      command,
      function_depth: 0,
      decision: { holds, heard },
    });
    const [or, empty] = decisionsOf([
      { line: 2, command: 'LISTEN', function_depth: 0 },
      step('IF togo NOT IN item OR rush IN item', true, { item: ['coffee', 'togo', 'rush'] }),
      step('IF tea IN CUSTOMER SPEECH', false, { 'CUSTOMER SPEECH': [] }),
    ]);
    expect(or).toEqual({
      line: 4,
      condition: 'if to go not in item or rush in item',
      holds: true,
      parts: [
        { text: 'to go not in item', holds: false },
        { text: 'rush in item', holds: true },
      ],
      heard: ['item: coffee, to go, rush'],
    });
    expect(empty.heard).toEqual(['orders: nothing']);
  });

  it('names every part of a compound condition the way the editor does', () => {
    expect(spokenBlock('IF tea IN CUSTOMER SPEECH OR sugar IN CUSTOMER SPEECH')).toBe(
      'if tea in orders or sugar in orders',
    );
  });

  it('puts Query’s choices on the failure card, the latest last', () => {
    render(
      <FailureCard
        evidence={failedEvidence(4, SUGARLESS)}
        stale={false}
        rounds={1}
        onShowLine={() => {}}
        onPractise={() => {}}
      />,
    );
    const list = within(screen.getByRole('region', { name: 'What Query decided' }));
    const items = list.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'Block 4if tea in orders? YesHeard in orders: tea, sugar',
      'Block 9if sugar in orders and coffee in orders? Nosugar in orders: yes · coffee in orders: noHeard in orders: tea, sugar',
    ]);
  });

  it('leaves the choices off a failure that isn’t Query’s, and off a routine that won’t run', () => {
    const evidence = failedEvidence(4, SUGARLESS);
    const { rerender } = render(
      <FailureCard
        evidence={{ ...evidence, failure: { ...evidence.failure, role: 'prep' } }}
        stale={false}
        rounds={1}
        onShowLine={() => {}}
        onPractise={() => {}}
      />,
    );
    expect(screen.queryByRole('region', { name: 'What Query decided' })).toBeNull();
    rerender(
      <FailureCard
        evidence={{ ...evidence, failure: { ...evidence.failure, code: 'loop-limit' } }}
        stale={false}
        rounds={1}
        onShowLine={() => {}}
        onPractise={() => {}}
      />,
    );
    expect(screen.queryByRole('region', { name: 'What Query decided' })).toBeNull();
  });
});
