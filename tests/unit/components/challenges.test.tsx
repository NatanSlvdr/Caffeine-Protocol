import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ReceiptModal } from '../../../src/features/workspace/modals/ReceiptModal';
import { HelpModal } from '../../../src/features/workspace/modals/HelpModal';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import type { ChallengeMeasure, RunResult } from '../../../src/domain';

// Shift 15 has one challenge, Short legs: Porter walks 480 tiles or fewer. The worked example walks 837.
const index = 14;
const level = levels[index];
const programs = referencePrograms(index + 1);
const served = runLevel(level, compileProgram(programs.query, index + 1), programs);
/** The same service with Porter's moves left out: the walk is read from them, so this one meets Short legs. */
const unwalked: RunResult = {
  ...served,
  execution: served.execution!.map((round) => ({
    ...round,
    events: round.events.filter((event) => event.role !== 'floor'),
  })),
};

const receipt = (result: RunResult, metBefore?: ChallengeMeasure[], observation = false) =>
  render(
    <ReceiptModal
      label="Shift 15"
      level={level}
      result={result}
      observation={observation}
      metBefore={metBefore}
      onNext={() => {}}
      onClose={() => {}}
    />,
  );
const challenges = () => within(screen.getByRole('region', { name: /Challenges/ }));

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

describe('challenges on the receipt', () => {
  it('reads each one against the service, and says it earns no stars', () => {
    receipt(served);
    expect(screen.getByRole('region', { name: 'Challenges · optional, for no stars' })).toBeTruthy();
    const item = challenges().getByRole('listitem');
    expect(item.textContent).toContain('Short legs Not yet');
    expect(item.textContent).toContain(
      'Porter walks 480 tiles or fewer over the whole service. This service: 837 tiles.',
    );
  });

  it('tells a challenge met for the first time from one met again', () => {
    const { unmount } = receipt(unwalked);
    expect(challenges().getByRole('listitem').textContent).toContain('Met, for the first time');
    unmount();
    receipt(unwalked, ['walk']);
    expect(challenges().getByText('Met')).toBeTruthy();
  });

  it('remembers a challenge met before when this service falls short', () => {
    receipt(served, ['walk']);
    expect(challenges().getByText('Not this time · met before')).toBeTruthy();
  });

  it('has none on a shift without them', () => {
    render(
      <ReceiptModal
        label="Shift 03"
        level={levels[2]}
        result={served}
        observation={false}
        onNext={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('region', { name: /Challenges/ })).toBeNull();
  });
});

describe('challenges in the field notes', () => {
  const notes = (challengesMet?: ChallengeMeasure[]) =>
    render(
      <HelpModal
        label="Shift 15"
        title="Shift"
        lesson={{ note: 'Note', solution: '' }}
        brief={{ story: 'Story', objective: 'Goal', concept: 'Idea' }}
        level={level}
        role="floor"
        source=""
        opening=""
        observation={false}
        running={false}
        challengesMet={challengesMet}
        hints={0}
        onHints={() => {}}
        evidence={null}
        stale={false}
        onShowClue={() => {}}
        onUseExample={() => {}}
        onReplayIntro={() => {}}
        onClose={() => {}}
      />,
    );

  it('stay hidden until the shift has been served', () => {
    notes();
    expect(screen.queryByRole('region', { name: /Challenges/ })).toBeNull();
  });

  it('list each one with the café fact it turns on, and whether it has been met', () => {
    const { unmount } = notes([]);
    const item = within(screen.getByRole('region', { name: /Challenges/ })).getByRole('listitem');
    expect(item.textContent).toContain('Short legs');
    expect(item.textContent).toContain('A guest drinks up in 12 s');
    expect(item.textContent).not.toContain('Met');
    unmount();
    notes(['walk']);
    expect(screen.getByText('· Met')).toBeTruthy();
  });
});
