import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { failureLines, successLines } from '../../../src/features/workspace/reactions';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { line } from '../../../src/domain';
import type { ProgressSave, RunResult } from '../../../src/domain';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.location.hash = '/shift/2';
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

const solution = lessons[1].solution;
const slipped = solution.replace('DEPOSIT RIGHT', 'DEPOSIT UP');

describe('brief reactions', () => {
  const failed = {
    passed: false,
    observation: false,
    stars: 0,
    first_failure: { code: 'wrong-direction', reason: 'Query faced the wrong way.', phrase: 'coffee', role: 'query' },
  } as unknown as RunResult;
  const served = { passed: true, observation: false, stars: 3, block_count: 9, executed_instructions: 40 } as RunResult;
  const targets = { block_target: 9, instruction_target: 40 };
  const payoff = [line('guest:happy', 'Thanks!'), line('query', '*bip*')];

  it('keep a slip to the reaction alone, leaving the explanation to the card', () => {
    expect(failureLines(failed, 'query')).toHaveLength(2);
    expect(failureLines(failed, 'query', true)).toEqual([failureLines(failed, 'query')[0]]);
  });
  it('keep a shift served before to Niko’s verdict, and a watched one to its receipt', () => {
    expect(successLines(served, 'query', 1, targets, payoff)).toHaveLength(3);
    expect(successLines(served, 'query', 1, targets, payoff, true).map((l) => l.text)).toEqual([
      'Three stars. That’s the tidiest routine I’ve ever seen.',
    ]);
    expect(successLines({ ...served, observation: true }, 'query', 0, targets, payoff, true)).toEqual([]);
  });
});

describe('shorter repeats', () => {
  function open(source: string | null, shortRepeats: boolean, overrides: Partial<ProgressSave> = {}) {
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 1,
      selected: 1,
      settings: { ...save.settings, text_editor: true, short_repeats: shortRepeats },
      robotDrafts: source === null ? {} : { 1: { query: source, prep: '', floor: '' } },
      ...overrides,
    });
    render(<App />);
  }
  const intro = () => screen.queryByRole('dialog', { name: /^Shift 02/ });
  const reaction = () => screen.queryByRole('dialog', { name: 'Dialogue' });
  const lineCount = () => within(reaction()!).getByText(/^Line 1 of/).textContent;
  function run() {
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    for (let i = 0; i < 60 && !reaction(); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
  }
  const back = () => fireEvent.keyDown(window, { key: 'Escape' });

  it('open a shift already worked on straight on the code, with the intro still in Help', () => {
    open(slipped, true);
    expect(intro()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    fireEvent.click(screen.getByRole('button', { name: /Replay the intro/ }));
    expect(intro()).not.toBeNull();
  });

  it('still play the intro of a shift never worked on', () => {
    open(null, true);
    expect(intro()).not.toBeNull();
  });

  it('play every intro when off', () => {
    open(slipped, false, { stars: { 1: 2 } });
    expect(intro()).not.toBeNull();
  });

  it('keep a slip the crew has already reacted to on this visit to one line', () => {
    open(slipped, true);
    run();
    expect(lineCount()).toBe('Line 1 of 2');
    back();
    run();
    expect(lineCount()).toBe('Line 1 of 1');
    // The card under the routine says the rest, once the crew is done.
    back();
    expect(screen.getByRole('region', { name: /^Query stopped/ }).textContent).toContain('Deposit right');
  });

  it('react in full to every slip when off', () => {
    open(slipped, false);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    run();
    back();
    run();
    expect(lineCount()).toBe('Line 1 of 2');
  });

  it('keep the cheer for a shift served before to the verdict, before the receipt', () => {
    open(solution, true, { unlocked: 2, stars: { 1: 3 } });
    run();
    expect(lineCount()).toBe('Line 1 of 1');
    expect(reaction()!.textContent).toContain('Three stars');
    back();
    expect(screen.getByRole('dialog', { name: 'Service complete' })).toBeTruthy();
  });

  it('are offered in the shift’s options and kept for every shift', () => {
    open(slipped, false);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Shorter repeats' }));
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.short_repeats).toBe(true);
  });

  it('are offered in house settings too, in the same words', () => {
    window.location.hash = '/';
    seedLocalStorage(makeSave());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const toggle = screen.getByRole('checkbox', { name: 'Shorter repeats' });
    expect(toggle.getAttribute('aria-describedby')).toBeTruthy();
    fireEvent.click(toggle);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.short_repeats).toBe(true);
  });
});
