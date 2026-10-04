import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons } from '../../../src/data';
import { firstRoutineStep } from '../../../src/features/workspace/firstRoutine';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
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
// Every block is there, but the ticket goes the wrong way at the handoff.
const slipped = solution.replace('DEPOSIT RIGHT', 'DEPOSIT UP');

describe('first routine steps', () => {
  it('build until every kind of block a ticket needs is there, then run, then fix', () => {
    expect(firstRoutineStep('LISTEN', false)).toBe(0);
    expect(firstRoutineStep('LISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1', false)).toBe(0);
    expect(firstRoutineStep(solution, false)).toBe(1);
    expect(firstRoutineStep(solution, true)).toBe(2);
    // Running an unfinished routine doesn't skip the building.
    expect(firstRoutineStep('LISTEN', true)).toBe(0);
  });
});

describe('the first routine tips', () => {
  function open(source: string, overrides: Parameters<typeof makeSave>[0] = {}) {
    const save = makeSave();
    seedLocalStorage({
      ...save,
      unlocked: 1,
      selected: 1,
      settings: { ...save.settings, text_editor: true },
      robotDrafts: { 1: { query: source, prep: '', floor: '' } },
      ...overrides,
    });
    render(<App />);
    // A served shift's intro has been seen, so there's nothing to skip on a replay.
    const skip = screen.queryByRole('button', { name: 'Skip' });
    if (skip) fireEvent.click(skip);
  }
  const tips = () => screen.queryByRole('complementary', { name: /^First routine/ });
  const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.first_routine_tips;
  function serve() {
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    for (let i = 0; i < 60 && !screen.queryByRole('dialog', { name: 'Dialogue' }); i++)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    fireEvent.keyDown(window, { key: 'Escape' });
  }

  it('tick themselves off as the routine is built, run and fixed', () => {
    open('LISTEN');
    expect(tips()!.textContent).toContain('Step 1 of 3');
    expect(tips()!.textContent).toContain('Build it.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Routine text' }), { target: { value: slipped } });
    expect(tips()!.textContent).toContain('Step 2 of 3');
    expect(tips()!.textContent).toContain('Run it.');
    serve();
    expect(tips()!.textContent).toContain('Step 3 of 3');
    expect(tips()!.textContent).toContain('The card below says where Query stopped.');
    expect(screen.getByRole('region', { name: /^Query stopped/ })).toBeTruthy();
  });

  it('pick up where the player is on coming back, rather than starting over', () => {
    open(slipped);
    expect(tips()!.textContent).toContain('Run it.');
  });

  it('hide for good, and come back from Workspace options', () => {
    open('LISTEN');
    fireEvent.click(within(tips()!).getByRole('button', { name: 'Hide the first-routine tips' }));
    expect(tips()).toBeNull();
    expect(saved()).toBe(false);
    const options = screen.getByRole('button', { name: 'Options' });
    expect(document.activeElement).toBe(options);
    fireEvent.click(options);
    const toggle = screen.getByRole('checkbox', { name: /First-routine tips/ });
    expect((toggle as HTMLInputElement).checked).toBe(false);
    fireEvent.click(toggle);
    expect(saved()).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(tips()!.textContent).toContain('Build it.');
  });

  it('go once the shift is served', () => {
    open(solution);
    expect(tips()).not.toBeNull();
    serve();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).stars[1]).toBeGreaterThan(0);
    expect(tips()).toBeNull();
  });

  it('stay away on a replay of a served shift', () => {
    open(solution, { unlocked: 2, stars: { 0: 3, 1: 2 } });
    expect(screen.getByRole('button', { name: /Run service/ })).toBeTruthy();
    expect(tips()).toBeNull();
  });

  it('only come on the first shift with a routine to write', () => {
    window.location.hash = '/shift/3';
    open('LISTEN', { unlocked: 2, selected: 2, robotDrafts: { 2: { query: 'LISTEN', prep: '', floor: '' } } });
    expect(tips()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.queryByRole('checkbox', { name: /First-routine tips/ })).toBeNull();
  });
});
