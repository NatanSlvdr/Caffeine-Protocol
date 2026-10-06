import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { specialById } from '../../../src/data/specials';
import { compileProgram } from '../../../src/domain/program';
import { runLevel } from '../../../src/domain/simulation';
import { UNLOCKS } from '../../../src/domain/unlocks';
import { ReceiptModal } from '../../../src/features/workspace/modals/ReceiptModal';
import { newSave } from '../../../src/features/campaign/save/persistence';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/components/Cafe', () => ({ Cafe: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const special = specialById('together')!;
const stars = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [i, 3]));
const finished = { ...newSave(), selected: 20, unlocked: 20, complete: true, stars };

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

describe('the specials', () => {
  it.each([
    ['a café still in the campaign', newSave(), '#/special/together'],
    ['a special that isn’t on the board', finished, '#/special/nope'],
  ])('keeps the address out of reach for %s', (_, save, hash) => {
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify(save));
    window.location.hash = hash;
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Caffeine Protocol' })).toBeTruthy();
  });

  it('stays off the campaign page until the campaign is finished', () => {
    window.location.hash = '#/campaign';
    render(<App />);
    expect(screen.queryByRole('button', { name: /^Specials/ })).toBeNull();
  });

  it('opens from the campaign page once it is, into a shift of its own', async () => {
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify(finished));
    window.location.hash = '#/campaign';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Specials, 4 specials' }));
    const board = screen.getByRole('dialog');
    expect(within(board).getByRole('heading', { name: special.title })).toBeTruthy();
    expect(within(board).getByText(/Asked for by Rosa/)).toBeTruthy();
    expect(within(board).getByRole('img', { name: 'Not served yet' })).toBeTruthy();
    fireEvent.click(within(board).getByRole('button', { name: `Serve ${special.title}` }));
    await waitFor(() => expect(window.location.hash).toBe('#/special/together'));
    expect(document.title).toBe(`Special: ${special.title} · Caffeine Protocol`);
    expect(screen.getByText(`Special · ${special.title}`)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Campaign/ }).textContent).toMatch(/Campaign \/ Special$/);
    // Laid out as a shift.
    expect(document.querySelector('.app.workspace.special')).toBeTruthy();
  });

  it('shows a served special’s own stars on the board', () => {
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify({ ...finished, specials: { together: { stars: 2 } } }));
    window.location.hash = '#/campaign';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Specials, 4 specials' }));
    expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Serve again ${special.title}` })).toBeTruthy();
  });

  it('ends on the regular’s thanks, how close each table’s drinks came, and the way back', () => {
    const programs = special.lesson.robotSolution;
    const result = runLevel(special.level, compileProgram(programs.query, UNLOCKS.together), programs);
    const onNext = vi.fn();
    render(
      <ReceiptModal
        label="Special"
        level={special.level}
        result={result}
        observation={false}
        thanks={special.thanks}
        onNext={onNext}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Special · Service receipt')).toBeTruthy();
    expect(screen.getByText(special.thanks)).toBeTruthy();
    const together = screen.getByText('Tables served together').nextElementSibling!;
    expect(together.textContent).toMatch(/^\d+ · all within \d+(\.\d)? s$/);
    fireEvent.click(screen.getByRole('button', { name: /Back to the campaign/ }));
    expect(onNext).toHaveBeenCalled();
  });

  it('lays a menu’s cards out side by side, each with its own targets, before any is served', async () => {
    localStorage.setItem('caffeine-protocol.v1', JSON.stringify(finished));
    window.location.hash = '#/campaign';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Specials, 4 specials' }));
    const board = screen.getByRole('dialog');
    expect(within(board).getByRole('heading', { name: 'The Saturday Market' })).toBeTruthy();
    expect(within(board).getByText(/Asked for by Mr\. Albert/)).toBeTruthy();
    expect(within(board).getByText('0 of 3 menus served')).toBeTruthy();
    // The cards wait behind the menu: none of them is on the board itself.
    expect(within(board).queryByRole('heading', { name: 'The Tea Table' })).toBeNull();
    fireEvent.click(within(board).getByRole('button', { name: 'Plan the menu, The Saturday Market' }));

    expect(within(board).getByRole('heading', { level: 2, name: 'The Saturday Market' })).toBeTruthy();
    expect(document.activeElement?.textContent).toMatch(/All specials/);
    const cards = within(board).getAllByRole('listitem');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'The Tea Table',
      'The Espresso Bar',
      'The Market Hatch',
    ]);
    const tea = specialById('tea-table')!;
    expect(within(cards[0]).getByText(tea.card!.constraint)).toBeTruthy();
    expect(
      within(cards[0]).getByText(
        `${tea.level.block_target} blocks or fewer · ${tea.level.instruction_target} steps or fewer`,
      ),
    ).toBeTruthy();

    // Back to the board, onto the menu's own button.
    fireEvent.click(within(board).getByRole('button', { name: /All specials/ }));
    expect(document.activeElement).toBe(within(board).getByRole('button', { name: /^Plan the menu/ }));
    fireEvent.click(within(board).getByRole('button', { name: /^Plan the menu/ }));
    fireEvent.click(within(board).getByRole('button', { name: 'Serve this menu, The Tea Table' }));
    await waitFor(() => expect(window.location.hash).toBe('#/special/tea-table'));
    expect(screen.getByText('Menu card · The Tea Table')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Campaign/ }).textContent).toMatch(/Campaign \/ Menu card$/);
  });

  it('counts the menus served, and shows each card’s own stars', () => {
    localStorage.setItem(
      'caffeine-protocol.v1',
      JSON.stringify({ ...finished, specials: { 'espresso-bar': { stars: 3 } } }),
    );
    window.location.hash = '#/campaign';
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Specials, 4 specials' }));
    expect(screen.getByText('1 of 3 menus served')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Plan the menu/ }));
    const menu = screen.getByRole('dialog');
    expect(within(menu).getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(within(menu).getAllByRole('img', { name: 'Not served yet' })).toHaveLength(2);
    expect(within(menu).getByRole('button', { name: 'Serve again, The Espresso Bar' })).toBeTruthy();
  });
});
