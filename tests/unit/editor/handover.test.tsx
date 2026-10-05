import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { handoverCovered, handoverFor } from '../../../src/features/workspace/handover';
import type { RobotPrograms } from '../../../src/domain/types';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => localStorage.clear());

const brew = handoverFor(UNLOCKS.prep)!,
  porter = handoverFor(UNLOCKS.floor)!;
const lesson = (level: number) => lessons[level - 1];
const missing = (steps: typeof brew.steps, source: string) =>
  steps.filter((_, i) => !handoverCovered(steps, source)[i]).map((step) => step.text);

describe('the job a robot takes over', () => {
  it('comes on the shifts where Brew and Porter take over, and no other', () => {
    expect(brew.helper).toBe('Moka');
    expect(porter.helper).toBe('Pip');
    for (let level = 1; level <= lessons.length; level++)
      if (level !== UNLOCKS.prep && level !== UNLOCKS.floor) expect(handoverFor(level)).toBeUndefined();
  });
  it('finds the one step each starter leaves out, and nothing missing from the worked example', () => {
    expect(missing(brew.steps, lesson(UNLOCKS.prep).robotStarter!.prep)).toEqual(['Grind them in the coffee machine']);
    expect(missing(brew.steps, lesson(UNLOCKS.prep).robotSolution!.prep)).toEqual([]);
    expect(missing(porter.steps, lesson(UNLOCKS.floor).robotStarter!.floor)).toEqual(['Read the table off its ticket']);
    expect(missing(porter.steps, lesson(UNLOCKS.floor).robotSolution!.floor)).toEqual([]);
  });
  it('needs a block of its own for each step done with the same block, in its place', () => {
    const solution = lesson(UNLOCKS.prep).robotSolution!.prep;
    // Without the second Use up the coffee is never brewed, even though the beans were ground.
    const unbrewed = solution.replace(/(USE UP[\s\S]*?)\nUSE UP/, '$1');
    expect(missing(brew.steps, unbrewed)).toEqual(['Brew the coffee in the machine']);
    expect(missing(brew.steps, 'LISTEN\nJUMP listen')).toHaveLength(5);
  });
  it('counts steps inside a function where the routine calls it', () => {
    const solution = lesson(UNLOCKS.floor).robotSolution!.floor;
    expect(solution.indexOf('FUNCTION deliver')).toBeGreaterThan(solution.indexOf('JUMP listen'));
    expect(missing(porter.steps, solution.replace('CALL deliver', '# not called'))).toEqual([
      'Read the table off its ticket',
      'Walk to that table',
      'Serve the drink',
      'Walk back to the counter',
    ]);
  });
});

describe('the handover card', () => {
  function open(level: number, programs?: RobotPrograms, overrides: Parameters<typeof makeSave>[0] = {}) {
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: level - 1,
      selected: level - 1,
      settings: { ...save.settings, text_editor: true },
      ...(programs ? { robotDrafts: { [level - 1]: programs } } : {}),
      ...overrides,
    });
    window.location.hash = `/shift/${level}`;
    render(<App />);
    const skip = screen.queryByRole('button', { name: 'Skip' });
    if (skip) fireEvent.click(skip);
  }
  const card = () => screen.queryByRole('complementary', { name: /^Taking over from/ });
  const named = (name: string) => screen.queryByRole('complementary', { name });
  /** Whether the text is on show: not inside the folded list. */
  const shown = (text: string | RegExp) => within(card()!).getByText(text).closest('[hidden]') === null;
  const status = () => card()!.querySelector('.handover-status')!.textContent;
  const grind = /^Grind them in the coffee machine, with Use up: not in Brew’s routine yet\.$/;

  it('sets out Moka’s job on Brew’s first shift, and ticks the missing step off once it’s written', () => {
    open(UNLOCKS.prep);
    const aside = named('Taking over from Moka · 6 of 7 in Brew’s routine')!;
    expect(aside).not.toBeNull();
    expect(shown(/Pip still serves the room/)).toBe(true);
    expect(within(aside).getByText(grind).closest('li')!.className).toBe('missing');
    expect(status()).toBe('Not in Brew’s routine yet: grind them in the coffee machine, with a Use up block.');

    fireEvent.change(screen.getByRole('textbox', { name: 'Routine text' }), {
      target: { value: lesson(UNLOCKS.prep).robotSolution!.prep },
    });
    expect(named('Taking over from Moka · 7 of 7 in Brew’s routine')).not.toBeNull();
    expect(card()!.querySelector('li.missing')).toBeNull();
    expect(status()).toBe('Brew’s routine covers all of Moka’s job. Run the service to see it work.');
  });

  it('sets out Pip’s deliveries on Porter’s first shift, and only on Porter’s tab', () => {
    open(UNLOCKS.floor);
    expect(named('Taking over from Pip · 6 of 7 in Porter’s routine')).not.toBeNull();
    expect(shown(/Pip still clears the tables/)).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Query' }));
    expect(card()).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Porter' }));
    expect(card()).not.toBeNull();
  });

  it('folds down to its count, and opens again', () => {
    open(UNLOCKS.prep);
    const fold = within(card()!).getByRole('button', { name: 'Moka’s steps' });
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(fold);
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(shown(grind)).toBe(false);
    expect(card()!.querySelector('.handover-status')!.closest('[hidden]')).not.toBeNull();
    expect(named('Taking over from Moka · 6 of 7 in Brew’s routine')).not.toBeNull();
    fireEvent.click(fold);
    expect(shown(grind)).toBe(true);
  });

  it('goes once the shift has been served, and never comes on another shift', () => {
    open(UNLOCKS.prep, undefined, { stars: { [UNLOCKS.prep - 1]: 2 } });
    expect(card()).toBeNull();
  });

  it('stays away from the shift after a takeover', () => {
    open(UNLOCKS.prep + 1);
    screen.getByRole('tab', { name: 'Brew', selected: true });
    expect(card()).toBeNull();
  });
});
