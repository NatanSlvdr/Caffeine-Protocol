import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { memoryById } from '../../../src/data/memories';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { newSave } from '../../../src/features/campaign/save/persistence';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const memory = memoryById('day-one')!;
const SLOT = UNLOCKS.sugar - 1;
/** A café that has just served Act I, with a routine of its own on the shift whose tools the memory borrows. */
const served = (shifts: number) => ({
  ...newSave(),
  selected: shifts,
  unlocked: shifts,
  stars: Object.fromEntries(Array.from({ length: shifts }, (_, index) => [index, 3])),
  robotDrafts: { [SLOT]: { query: '# Mine\nLISTEN', prep: '', floor: '' } },
});
const open = (save: object, hash: string) => {
  localStorage.setItem('caffeine-protocol.v1', JSON.stringify(save));
  window.location.hash = hash;
  render(<App />);
};

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

describe('the memories', () => {
  it('stay off the campaign page, and out of reach, until Act I is served', async () => {
    open(served(UNLOCKS.help - 1), '#/memory/day-one');
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
    window.location.hash = '#/campaign';
    await screen.findByRole('heading', { name: 'Choose a shift' });
    expect(screen.queryByRole('button', { name: /^Memories/ })).toBeNull();
  });

  it('keep an address that names no memory out of reach', () => {
    open(served(UNLOCKS.help), '#/memory/nope');
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
  });

  it('open from the campaign page once it is, into a shift of their own on a routine of their own', async () => {
    open(served(UNLOCKS.help), '#/campaign');
    fireEvent.click(screen.getByRole('button', { name: 'Memories, 1 memory' }));
    const board = screen.getByRole('dialog');
    expect(within(board).getByRole('heading', { name: memory.title })).toBeTruthy();
    expect(board.querySelector('small')?.textContent).toBe('Query’s log · Shift 5’s tools');
    expect(within(board).getByRole('img', { name: 'Not played yet' })).toBeTruthy();
    fireEvent.click(within(board).getByRole('button', { name: `Play ${memory.title}` }));
    await waitFor(() => expect(window.location.hash).toBe('#/memory/day-one'));
    expect(document.title).toBe(`Memory: ${memory.title} · Caffeine Protocol`);
    expect(screen.getByRole('dialog', { name: `Memory · ${memory.title}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Campaign/ }).textContent).toMatch(/Campaign \/ Memory$/);
    // Laid out as a shift, in the colours of an old photo.
    expect(document.querySelector('.app.workspace.memory')).toBeTruthy();
    expect(document.querySelector('.workspace-main.memory')).toBeTruthy();
  });

  it('show a played memory’s own stars on the board', () => {
    open({ ...served(UNLOCKS.help), memories: { 'day-one': { stars: 2 } } }, '#/campaign');
    fireEvent.click(screen.getByRole('button', { name: 'Memories, 1 memory' }));
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Play again ${memory.title}` })).toBeTruthy();
  });
});
