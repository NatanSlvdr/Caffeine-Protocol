import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { repairById } from '../../../src/data/repairs';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { newSave } from '../../../src/features/campaign/save/persistence';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const query = repairById('query')!;
const served = (shifts: number, more: object = {}) => ({
  ...newSave(),
  selected: shifts,
  unlocked: shifts,
  stars: Object.fromEntries(Array.from({ length: shifts }, (_, index) => [index, 3])),
  ...more,
});
const open = (save: object) => {
  localStorage.setItem('caffeine-protocol.v1', JSON.stringify(save));
  window.location.hash = '#/campaign';
  render(<App />);
};
const kept = () => JSON.parse(localStorage.getItem('caffeine-protocol.v1')!) as { repairs?: string[] };
const wire = (board: HTMLElement, name: string, value: string) =>
  fireEvent.change(within(board).getByRole('combobox', { name }), { target: { value } });

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

describe('the repair bay', () => {
  it('stays off the campaign page until the first robot comes to the bench', async () => {
    open(served(UNLOCKS.sugar - 1));
    await screen.findByRole('heading', { name: 'Choose a shift' });
    expect(screen.queryByRole('button', { name: /^Repair bay/ })).toBeNull();
  });

  it('opens a panel on the scrapyard’s wiring, and counts the cases it gets right', () => {
    open(served(UNLOCKS.sugar));
    fireEvent.click(screen.getByRole('button', { name: 'Repair bay, 1 robot on the bench' }));
    const bay = screen.getByRole('dialog');
    expect(within(bay).getByText('Query · On the bench')).toBeTruthy();
    expect(within(bay).getByText(/2 more robots come to the bench/)).toBeTruthy();
    fireEvent.click(within(bay).getByRole('button', { name: `Open the panel, ${query.title}` }));
    expect(within(bay).getByRole('heading', { name: query.title })).toBeTruthy();
    expect((within(bay).getByRole('combobox', { name: 'Writes tea, when' }) as HTMLSelectElement).value).toBe('sugar');
    expect(within(bay).getByRole('status').textContent).toBe('2 of 6 cases right.');
    expect((within(bay).getByRole('button', { name: /Close the panel/ }) as HTMLButtonElement).disabled).toBe(true);
    // Two wires moved, one more case right; starting over puts the scrapyard's back.
    wire(bay, 'Writes coffee, when', '!tea');
    wire(bay, 'Writes tea, when', 'tea');
    expect(within(bay).getByRole('status').textContent).toBe('3 of 6 cases right.');
    expect(within(bay).getAllByRole('img', { name: 'Not yet' })).toHaveLength(3);
    fireEvent.click(within(bay).getByRole('button', { name: /Start over/ }));
    expect(within(bay).getByRole('status').textContent).toBe('2 of 6 cases right.');
  });

  it('closes a mended panel on its scene, and keeps the robot mended', () => {
    open(served(UNLOCKS.sugar));
    fireEvent.click(screen.getByRole('button', { name: /^Repair bay/ }));
    const bay = screen.getByRole('dialog');
    fireEvent.click(within(bay).getByRole('button', { name: `Open the panel, ${query.title}` }));
    wire(bay, 'Writes coffee, when', '!tea');
    wire(bay, 'Writes tea, when', 'tea');
    wire(bay, 'Writes one sugar, when', 'sugar');
    wire(bay, 'Writes one sugar, and when', '!no');
    expect(within(bay).getByRole('status').textContent).toMatch(/^All 6 cases right/);
    expect(within(bay).queryAllByRole('img', { name: 'Not yet' })).toHaveLength(0);
    fireEvent.click(within(bay).getByRole('button', { name: /Close the panel/ }));
    expect(kept().repairs).toEqual(['query']);
    expect(screen.queryByRole('heading', { name: query.title })).toBeNull();
    expect(screen.getByText(`Repair bay · ${query.title}`)).toBeTruthy();
  });

  it('shows a mended robot’s touch on its card, and lets it be rewired again', () => {
    open(served(UNLOCKS.sugar, { repairs: ['query'] }));
    fireEvent.click(screen.getByRole('button', { name: /^Repair bay/ }));
    const bay = screen.getByRole('dialog');
    expect(within(bay).getByText('Query · Mended')).toBeTruthy();
    expect(within(bay).getByText(query.touch)).toBeTruthy();
    fireEvent.click(within(bay).getByRole('button', { name: `Rewire again, ${query.title}` }));
    expect(within(bay).getByRole('status').textContent).toBe('2 of 6 cases right.');
  });
});
