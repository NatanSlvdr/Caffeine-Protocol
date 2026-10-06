import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../../src/App';
import { SAVE_KEY } from '../../../src/features/campaign/save/persistence';
import { benchKey } from '../../../src/features/workspace/bench';
import { makeSave, seedLocalStorage } from '../../helpers/saves';
import { lessons, levels } from '../../../src/data';
import { benchGuests } from '../../../src/domain';
import { BenchModal } from '../../../src/features/workspace/modals/BenchModal';
import { referenceProgramsFor } from '../../helpers/run';

vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div data-testid="cafe" /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.location.hash = '/shift/4';
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

/** Shift 4's routine with every drink written as coffee: right for coffee, wrong for tea. */
const coffeeOnly = lessons[3].solution.replace('ITEM tea', 'ITEM coffee');

/** Shift 4, with Query's routine set and the scene skipped. */
function ready(source = coffeeOnly) {
  const save = makeSave();
  seedLocalStorage({
    ...save,
    unlocked: 3,
    selected: 3,
    settings: { ...save.settings, text_editor: true },
    robotDrafts: { 3: { query: source, prep: '', floor: '' } },
  });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
}
const openBench = () => fireEvent.click(screen.getByRole('button', { name: 'Test bench' }));
const slip = () => screen.getByRole('dialog', { name: 'Test bench' });
const guests = () =>
  within(slip())
    .queryAllByRole('listitem')
    .filter((li) => li.classList.contains('bench-guest'));
const runBench = () => within(slip()).getByRole('button', { name: /^Run the bench/ });
const card = () => screen.queryByRole('region', { name: /^Query stopped/ });
const wentRight = () => screen.queryByRole('region', { name: /went right/ });
/** Let focus move, a frame after the change it follows. */
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(20);
  });
const play = () => {
  for (let i = 0; i < 90 && !screen.queryByRole('dialog', { name: 'Dialogue' }) && !wentRight(); i++)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
};

describe('the test bench', () => {
  it('opens on a copy of the shift’s first round, ready to run', () => {
    ready();
    openBench();
    expect(slip().textContent).toContain('For no stars');
    expect(guests()).toHaveLength(4);
    expect(guests().map((g) => g.querySelector('.bench-says')!.textContent)).toEqual([
      'Says “Coffee” · Should get coffee',
      'Says “Tea” · Should get tea',
      'Says “Tea” · Should get tea',
      'Says “Coffee” · Should get coffee',
    ]);
    expect(within(guests()[0]).getByText('Comes in as the café opens')).toBeTruthy();
    expect((within(guests()[1]).getByRole('combobox', { name: 'Guest 2 comes in' }) as HTMLSelectElement).value).toBe(
      '8',
    );
    // Shift 4's guests say nothing about sugar, so neither does the bench.
    expect(within(slip()).queryByRole('combobox', { name: /sugar/ })).toBeNull();
    expect(document.activeElement).toBe(runBench());
    expect(runBench().textContent).toBe('Run the bench · 4 guests');
    // Another round starts the bench from its guests instead.
    fireEvent.click(within(slip()).getByRole('button', { name: 'Round 2, 4 guests' }));
    expect(guests()[0].querySelector('.bench-says')!.textContent).toBe('Says “Tea” · Should get tea');
    expect(within(slip()).getByRole('status').textContent).toBe('Copied round 2: 4 guests.');
  });

  it('writes guests of the player’s own, and keeps them for the shift', () => {
    ready();
    openBench();
    for (let i = 3; i >= 1; i--)
      fireEvent.click(within(guests()[i]).getByRole('button', { name: `Remove guest ${i + 1}` }));
    expect(guests()).toHaveLength(1);
    settle();
    expect(document.activeElement).toBe(within(guests()[0]).getByRole('button', { name: 'Remove guest 1' }));
    fireEvent.change(within(guests()[0]).getByRole('combobox', { name: 'Guest 1: drink' }), {
      target: { value: 'tea' },
    });
    fireEvent.click(within(slip()).getByRole('button', { name: 'Add a guest' }));
    expect(within(slip()).getByRole('status').textContent).toBe('Guest 2 added.');
    settle();
    expect(document.activeElement).toBe(within(guests()[1]).getByRole('combobox', { name: 'Guest 2 comes in' }));
    fireEvent.change(document.activeElement!, { target: { value: '2' } });
    const kept = JSON.parse(localStorage.getItem(benchKey())!).L04;
    expect(kept).toEqual([
      { orders: [{ drink: 'tea', sugar: 'plain' }], after: 0 },
      { orders: [{ drink: 'coffee', sugar: 'plain' }], after: 2 },
    ]);
    // Closed and opened again, the bench is the one written.
    fireEvent.click(within(slip()).getByRole('button', { name: 'Close dialog' }));
    openBench();
    expect(guests().map((g) => g.querySelector('.bench-says')!.textContent)).toEqual([
      'Says “Tea” · Should get tea',
      'Says “Coffee” · Should get coffee',
    ]);
    // Removing the first guest lets the next come in as the café opens.
    fireEvent.click(within(guests()[0]).getByRole('button', { name: 'Remove guest 1' }));
    expect(within(guests()[0]).getByText('Comes in as the café opens')).toBeTruthy();
    fireEvent.click(within(guests()[0]).getByRole('button', { name: 'Remove guest 1' }));
    expect(guests()).toHaveLength(0);
    expect(slip().textContent).toContain('No guests on the bench.');
    settle();
    expect(document.activeElement).toBe(within(slip()).getByRole('button', { name: 'Add a guest' }));
    expect(runBench).toThrow();
    expect(within(slip()).getByRole('button', { name: 'Add a guest to run the bench' })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('starts again from the shift’s round when the kept bench can’t be run here', () => {
    localStorage.setItem(benchKey(), JSON.stringify({ L04: [{ orders: [{ drink: 'tea', sugar: 2 }], after: 0 }] }));
    ready();
    openBench();
    expect(guests()).toHaveLength(4);
  });

  it('runs the bench for no stars, and says where it slipped', () => {
    ready();
    openBench();
    fireEvent.click(runBench());
    expect(screen.queryByRole('dialog', { name: 'Test bench' })).toBeNull();
    expect(document.querySelector('.playback-round')!.textContent).toBe('BenchFor no stars');
    const status = screen.getByRole('group', { name: 'Simulation controls' }).querySelector('[role="status"]')!;
    expect(status.textContent).toBe('Running the bench, for no stars. The routines are locked until it stops.');
    play();
    fireEvent.keyDown(window, { key: 'Escape' });
    // A tea with no word on sugar is Juno's order: the café knows a regular on the bench too.
    expect(within(card()!).getByText('Query stopped').textContent).toBe('Query stopped · Bench · Juno');
    expect(card()!.querySelector('blockquote')!.textContent).toBe('“Tea”');
    // Fixed, the bench runs again from its card, and going right says so beside the code: no cheer, no stars.
    fireEvent.change(screen.getByRole('textbox', { name: 'Routine text' }), { target: { value: lessons[3].solution } });
    expect(card()!.textContent).toContain('run the bench again to check it.');
    fireEvent.click(within(card()!).getByRole('button', { name: 'Run the bench again' }));
    play();
    expect(wentRight()!.textContent).toContain('The bench went right · Bench');
    expect(wentRight()!.textContent).toContain('The bench earns no stars');
    expect(screen.queryByRole('dialog', { name: 'Dialogue' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).stars['3']).toBeUndefined();
  });

  it('waits for the service to stop before running', () => {
    ready(lessons[3].solution);
    fireEvent.click(screen.getByRole('button', { name: /Run service/ }));
    openBench();
    expect(runBench()).toHaveProperty('disabled', true);
    expect(slip().textContent).toContain('Stop the service to run the bench.');
  });
});

describe('the test bench on the last shift', () => {
  it('offers every way the finale’s guests order: sugar, marks, two drinks and a mumble', () => {
    localStorage.setItem(
      benchKey(),
      JSON.stringify({ [levels[20].id]: [{ orders: [{ drink: 'coffee', sugar: 0 }], after: 0 }] }),
    );
    const onRun = vi.fn();
    render(<BenchModal level={levels[20]} running={false} onRun={onRun} onClose={() => {}} />);
    const guest = () => guests()[0];
    const says = () => guest().querySelector('.bench-says')!.textContent;
    expect(says()).toBe('Says “Coffee, 0 sugars” · Should get coffee · 0 sugars');
    const sugar = within(guest()).getByRole('combobox', { name: 'Guest 1: sugar' }) as HTMLSelectElement;
    expect([...sugar.options].map((o) => o.text)).toEqual(['0 sugars', '1 sugar', '2 sugars']);
    fireEvent.change(sugar, { target: { value: '2' } });
    fireEvent.click(within(guest()).getByRole('checkbox', { name: 'To go' }));
    fireEvent.click(within(guest()).getByRole('checkbox', { name: 'In a rush' }));
    expect(says()).toBe(
      'Says “A quick coffee, 2 sugars, to go. I’m in a rush!” · Should get coffee · 2 sugars · to go · rushed',
    );
    fireEvent.click(within(guest()).getByRole('button', { name: 'Another drink' }));
    expect(within(guest()).queryByRole('button', { name: 'Another drink' })).toBeNull();
    fireEvent.change(within(guest()).getByRole('combobox', { name: 'Guest 1, drink 2: drink' }), {
      target: { value: 'tea' },
    });
    expect(says()).toBe(
      'Says “A quick coffee, 2 sugars, to go and tea, 2 sugars” · Should get coffee · 2 sugars · to go · rushed and tea · 2 sugars',
    );
    // A guest who mumbles asks for one drink, and Query has to ask what they meant.
    fireEvent.click(within(guest()).getByRole('checkbox', { name: 'Mumbles first' }));
    expect(within(guest()).queryByRole('combobox', { name: /drink 2/ })).toBeNull();
    expect(says()).toBe(
      'Mumbles “The usual, please.”, then says “A quick coffee, 2 sugars, to go. I’m in a rush!” once asked · Should get coffee · 2 sugars · to go · rushed, once Query asks for help',
    );
    fireEvent.click(runBench());
    expect(onRun).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          customer_id: 'B1',
          phrase: 'The usual, please.',
          expected: expect.objectContaining({ ask_help: true }),
        }),
      ],
      [],
    );
  });
});

describe('a bench that eases the shift’s rules', () => {
  /** The first guest of shift 18's first round. */
  const guest = benchGuests(levels[17].seeds[0].customers)[0];
  /** Shift 18, four cups to wash, with the reference routines, and a bench of one guest that eases the cups. */
  function cups(query = referenceProgramsFor(17).query) {
    const save = makeSave();
    localStorage.setItem(
      benchKey(),
      JSON.stringify({
        L18: { guests: [guest], eased: ['cups', 'closing'] },
      }),
    );
    seedLocalStorage({
      ...save,
      unlocked: 17,
      selected: 17,
      settings: { ...save.settings, text_editor: true },
      robotDrafts: { 17: { ...referenceProgramsFor(17), query } },
    });
    window.location.hash = '/shift/18';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    openBench();
  }
  const ease = () => within(slip()).getByRole('group', { name: 'Ease the shift’s rules' });

  it('offers the rules the shift has, and keeps the choice with the bench', () => {
    cups();
    // Shift 18 has cups to wash but no closing time, so a kept ease it doesn't have is let go.
    const twice = within(ease()).getByRole('checkbox', { name: /Twice the cups/ }) as HTMLInputElement;
    expect(within(ease()).getAllByRole('checkbox')).toHaveLength(1);
    expect(twice.checked).toBe(true);
    expect(ease().textContent).toContain('8 cups instead of 4.');
    expect(runBench().textContent).toBe('Run the bench · 1 guest · eased');
    fireEvent.click(twice);
    expect(runBench().textContent).toBe('Run the bench · 1 guest');
    expect(JSON.parse(localStorage.getItem(benchKey())!).L18).toEqual([guest]);
    fireEvent.click(twice);
    expect(JSON.parse(localStorage.getItem(benchKey())!).L18.eased).toEqual(['cups']);
  });

  it('says which rules a run eased, as it plays and once it’s done', () => {
    cups();
    fireEvent.click(runBench());
    expect(document.querySelector('.playback-round')!.textContent).toBe('BenchEased, for no stars');
    const status = screen.getByRole('group', { name: 'Simulation controls' }).querySelector('[role="status"]')!;
    expect(status.textContent).toBe(
      'Running the bench with twice the cups, for no stars. The routines are locked until it stops.',
    );
    play();
    expect(wentRight()!.textContent).toContain(
      'The bench ran with twice the cups, and earns no stars: they come from the shift’s own guests and rules',
    );
  });

  it('says so on the card when a run eased slips', () => {
    // Query writes every drink as the one the guest didn't ask for.
    const wrong = guest.orders[0].drink === 'coffee' ? 'tea' : 'coffee';
    cups(referenceProgramsFor(17).query.replace(/ITEM \w+/g, `ITEM ${wrong}`));
    fireEvent.click(runBench());
    play();
    fireEvent.keyDown(window, { key: 'Escape' });
    const slipped = screen.getByRole('region', { name: /^Query stopped/ });
    expect(slipped.textContent).toContain('The bench ran with twice the cups.');
  });

  it('isn’t offered on a shift with no rule to ease', () => {
    ready();
    openBench();
    expect(within(slip()).queryByRole('group', { name: 'Ease the shift’s rules' })).toBeNull();
  });
});
