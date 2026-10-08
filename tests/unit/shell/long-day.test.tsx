import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { longDay } from '../../../src/data/longDay';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { ReceiptModal } from '../../../src/features/workspace/modals/ReceiptModal';
import { newSave } from '../../../src/features/campaign/save/persistence';
import type { EnduranceProgress } from '../../../src/domain/types';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const KEY = 'caffeine-protocol.v1';
const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 3]));
const finished = { ...newSave(), selected: 20, unlocked: 20, complete: true, stars };
const { version } = longDay;
const stored = () => JSON.parse(localStorage.getItem(KEY)!) as { endurance?: EnduranceProgress };

beforeEach(() => {
  window.location.hash = '/';
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

function openBoard(endurance?: EnduranceProgress) {
  localStorage.setItem(KEY, JSON.stringify({ ...finished, ...(endurance && { endurance }) }));
  window.location.hash = '#/campaign';
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Specials, 8 specials/ }));
  const board = screen.getByRole('dialog');
  const entry = within(board).getByRole('heading', { name: longDay.title }).closest('li')!;
  return within(entry as HTMLElement);
}

describe('the Long Day', () => {
  it('is on the specials board after the menu, asked for by Juno', () => {
    const entry = openBoard();
    expect(entry.getByText(/Asked for by Juno/)).toBeTruthy();
    expect(entry.getByText('6 waves')).toBeTruthy();
    expect(entry.queryByRole('button', { name: /^Carry on/ })).toBeNull();
  });

  it('starts a day on its first wave, laid out as a shift', async () => {
    const entry = openBoard();
    fireEvent.click(entry.getByRole('button', { name: `Start the day, ${longDay.title}` }));
    await waitFor(() => expect(window.location.hash).toBe('#/long-day/1'));
    expect(stored().endurance).toEqual({ version, wave: 1 });
    expect(document.title).toBe(`${longDay.title}: wave 1 · Caffeine Protocol`);
    expect(screen.getByRole('dialog', { name: `Wave 1 of 6 · ${longDay.waves[0].title}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Campaign/ }).textContent).toMatch(/Campaign \/ Wave 1 of 6$/);
    expect(document.querySelector('.app.workspace.long-day')).toBeTruthy();
  });

  it('carries an open day on from its wave, or starts it over', async () => {
    const entry = openBoard({ version, wave: 3, best: 2, stars: { 1: 3, 2: 2 } });
    expect(entry.getByText('Best: wave 2 of 6')).toBeTruthy();
    fireEvent.click(entry.getByRole('button', { name: `Carry on: wave 3, ${longDay.title}` }));
    await waitFor(() => expect(window.location.hash).toBe('#/long-day/3'));
    expect(stored().endurance?.wave).toBe(3);
  });

  it('starts over on waves that have changed since, saying so', () => {
    const entry = openBoard({ version: version + 1, wave: 3, best: 2 });
    expect(entry.getByText(/The waves have changed since your last day/)).toBeTruthy();
    expect(entry.getByText('6 waves')).toBeTruthy();
    expect(entry.getByRole('button', { name: `Start the day, ${longDay.title}` })).toBeTruthy();
  });

  it.each([
    ['a café still in the campaign', { ...newSave(), endurance: { version, wave: 1 } }, '#/long-day/1'],
    ['a café that never started a day', finished, '#/long-day/1'],
    ['a wave the day hasn’t reached', { ...finished, endurance: { version, wave: 2, best: 1 } }, '#/long-day/3'],
    ['a day on waves that have changed', { ...finished, endurance: { version: version + 1, wave: 1 } }, '#/long-day/1'],
  ])('keeps the address out of reach for %s', (_, save, hash) => {
    localStorage.setItem(KEY, JSON.stringify(save));
    window.location.hash = hash;
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
  });

  it('ends a wave on what the next one brings, with a way on and a way to stop', () => {
    const wave = longDay.waves[1];
    const programs = wave.lesson.robotSolution;
    const result = runLevel(wave.level, compileProgram(programs.query, UNLOCKS.together), programs);
    const onNext = vi.fn(),
      onStop = vi.fn();
    render(
      <ReceiptModal
        label="Wave 2 of 6"
        level={wave.level}
        result={result}
        observation={false}
        thanks="Wave 2 of 6 served."
        onward={{ next: 'Next wave', stop: 'Stop for now', onStop }}
        onNext={onNext}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Wave 2 of 6 · Service receipt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Stop for now' }));
    expect(onStop).toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Next wave/ }));
    expect(onNext).toHaveBeenCalled();
  });
});
