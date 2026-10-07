import { describe, expect, it } from 'vitest';
import { levels } from '../../../src/data';
import { referencePrograms } from '../../../src/data/extension';
import { preparationSource } from '../../../src/domain/defaultPrograms';
import type { ShiftRules } from '../../../src/domain/defaultPrograms';
import { measureService, meetsChallenge, type ChallengeMeasure } from '../../../src/domain/challenges';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { DRINK_SECONDS } from '../../../src/domain/street';
import type { RobotPrograms, RunResult } from '../../../src/domain/types';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { CHALLENGE_WORDS } from '../../../src/features/workspace/challenges';

/**
 * A shift's optional challenges have to be within reach and worth reaching for: a routine the player could write meets
 * every one, and the worked example meets none, so a challenge is never met by copying it. The notes the challenges
 * come with are claims about the café, and each is run here to be borne out.
 */

/** The source with one passage rewritten; the passage has to be there, so a changed reference can't pass quietly. */
function edit(source: string, from: string | RegExp, to: string): string {
  if (!source.match(from)) throw new Error(`Not in the routine:\n${String(from)}`);
  return source.replace(from, to);
}

function run(level: number, programs: Partial<RobotPrograms> = {}): RunResult {
  const all = { ...referencePrograms(level), ...programs };
  const result = runLevel(levels[level - 1], compileProgram(all.query, level), all);
  expect(result.passed, `${levels[level - 1].id} serves every seed`).toBe(true);
  return result;
}

/**
 * Porter waiting by the table for the cup it just served, and clearing it there and then, instead of walking back to
 * the counter and coming out again for it once the guest has drunk up.
 */
function lingeringPorter(level: number): string {
  const delivered = edit(
    referencePrograms(level).floor,
    'DEPOSIT UP\nMOVE var2\nRETURN',
    'DEPOSIT UP\nWAIT DIRTY\nTAKE UP\nMOVE var2\nMOVE RIGHT 1\nDEPOSIT DOWN\nMOVE LEFT 1\nRETURN',
  );
  return edit(edit(delivered, /\nCALL clear/g, ''), /\nFUNCTION clear\n[\s\S]*?\nEND/, '');
}

/** Brew's routine from Double Trouble, still claiming two tickets before making either, with every rule met so far. */
function batchedBrew(level: number): string {
  const rules: ShiftRules = {
    toGo: true,
    cups: level >= UNLOCKS.cups,
    rush: level >= UNLOCKS.rush,
    closing: level >= UNLOCKS.closing,
  };
  return preparationSource(level, 2, rules);
}

const challenged = levels.flatMap((level, index) => (level.challenges ? [{ level, n: index + 1 }] : []));

describe('optional challenges', () => {
  it('come on the later shifts, where the crew is whole', () => {
    expect(challenged.map(({ level }) => level.id)).toEqual(['L15', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21']);
  });

  describe.each(challenged)('$level.id', ({ level, n }) => {
    const challenges = level.challenges!;

    it('are met by a routine that lingers to clear, and missed by the worked example', () => {
      const lingering = run(n, { floor: lingeringPorter(n) });
      const reference = run(n);
      for (const challenge of challenges) {
        const label = `${challenge.measure} ≤ ${challenge.target}`;
        expect(
          meetsChallenge(challenge, lingering),
          `${label}: lingering ${measureService(challenge.measure, lingering)}`,
        ).toBe(true);
        expect(
          meetsChallenge(challenge, reference),
          `${label}: reference ${measureService(challenge.measure, reference)}`,
        ).toBe(false);
      }
    });

    it('earn nothing from a practice service', () => {
      const practice = { ...run(n, { floor: lingeringPorter(n) }), practice: true };
      for (const challenge of challenges) expect(meetsChallenge(challenge, practice)).toBe(false);
    });
  });

  const shiftsWith = (measure: ChallengeMeasure) =>
    challenged.filter(({ level }) => level.challenges!.some((challenge) => challenge.measure === measure));

  it('walk: a guest drinks up sooner than Porter walks back out, so lingering walks less and serves no later', () => {
    for (const say of [CHALLENGE_WORDS.en, CHALLENGE_WORDS.fr]) expect(say.walk.note).toContain(`${DRINK_SECONDS} s`);
    for (const { n } of shiftsWith('walk')) {
      const lingering = run(n, { floor: lingeringPorter(n) });
      const reference = run(n);
      expect(measureService('walk', lingering)).toBeLessThan(measureService('walk', reference));
      expect(measureService('wait', lingering)).toBeLessThanOrEqual(measureService('wait', reference));
    }
  });

  const shift = (id: string) => {
    const n = levels.findIndex((level) => level.id === id) + 1;
    return { n, batched: run(n, { prep: batchedBrew(n) }), reference: run(n) };
  };

  // Each holds on a shift that has the challenge: Brew claiming two tickets at once runs fewer steps and serves later.
  it.each([
    ['wait', 'L17'],
    ['close', 'L20'],
  ] as const)('%s: fewer steps are not a quicker service on %s', (measure, id) => {
    expect(shiftsWith(measure).map(({ level }) => level.id)).toContain(id);
    const { batched, reference } = shift(id);
    expect(batched.executed_instructions).toBeLessThan(reference.executed_instructions);
    expect(measureService(measure, batched)).toBeGreaterThan(measureService(measure, reference));
  });

  it('rush: claiming two tickets at once holds rush orders up, though Brew makes a rush order first', () => {
    expect(shiftsWith('rush').map(({ level }) => level.id)).toContain('L19');
    const { n, batched, reference } = shift('L19');
    expect(batchedBrew(n)).toContain('IF rush IN CUSTOMER SPEECH');
    expect(measureService('rush', batched)).toBeGreaterThan(measureService('rush', reference));
  });
});
