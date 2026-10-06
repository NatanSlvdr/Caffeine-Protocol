import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels } from '../../../src/data';
import { drills } from '../../../src/data/drills';
import { predictions } from '../../../src/data/predictions';
import type { RunEvidence } from '../../../src/features/workspace/evidence';
import { drillFor } from '../../../src/features/workspace/hints';
import { HelpModal } from '../../../src/features/workspace/modals/HelpModal';
import { CampaignPage } from '../../../src/shell/CampaignPage';
import { SEEN_KEY } from '../../../src/shell/unseen';
import { GameProvider } from '../../../src/state/GameStore';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

beforeEach(() => {
  window.location.hash = '/campaign';
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const servedThrough = (served: number) => Object.fromEntries(Array.from({ length: served }, (_, i) => [i, 2]));
const campaign = (served: number) => {
  seedLocalStorage(makeSave({ unlocked: served, selected: served, stars: servedThrough(served) }));
  return render(
    <GameProvider>
      <CampaignPage />
    </GameProvider>,
  );
};
const first = drills[0];

describe('drills on the campaign', () => {
  it('come out once the first shift with a drill is served, and only those served are open', () => {
    const { unmount } = campaign(first.shift - 1);
    expect(screen.queryByRole('button', { name: /^Drills/ })).toBeNull();
    unmount();

    // Seen with none there, so the first is news.
    campaign(first.shift);
    fireEvent.click(screen.getByRole('button', { name: 'Drills, 1 drill, 1 new' }));
    const window = screen.getByRole('dialog', { name: 'Drills.' });
    expect(within(window).getAllByRole('button', { name: /^Paper, then pen/ })).toHaveLength(1);
    expect(within(window).getByRole('region', { name: 'Act I, Query' })).toBeTruthy();
    // A drill names what it's on and nothing past it.
    expect(window.textContent).not.toMatch(/Brew|Porter/);
    expect(window.querySelector('.drills-waiting')?.textContent).toBe(
      `0 of 1 drill done. ${drills.length + predictions.length - 1} more drills open as later shifts are served.`,
    );
  });

  it('marks the drills that came in since they were last opened', () => {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ drills: [first.id] }));
    campaign(drills[1].shift);
    fireEvent.click(screen.getByRole('button', { name: 'Drills, 2 drills, 1 new' }));
    const picks = within(screen.getByRole('dialog')).getAllByRole('button', { name: /Shift/ });
    expect(picks.map((pick) => pick.textContent?.includes('New'))).toEqual([false, true]);
    expect(screen.getByRole('button', { name: 'Drills, 2 drills' })).toBeTruthy();
  });

  it('fill the gap with the pick, and answer with the café’s own verdict', () => {
    campaign(first.shift);
    fireEvent.click(screen.getByRole('button', { name: 'Drills, 1 drill' }));
    fireEvent.click(screen.getByRole('button', { name: /^Paper, then pen/ }));
    const window = screen.getByRole('dialog', { name: first.title });
    expect(document.activeElement?.textContent).toBe(first.question);
    expect(within(window).getByText('The gap')).toBeTruthy();
    const routine = window.querySelector('figure')!;
    expect(routine.textContent).toContain(`Query’s routine on Shift ${first.shift}`);
    expect(routine.textContent).toContain('Wait for Orders');

    const passages = within(within(window).getByRole('list', { name: 'Passages' })).getAllByRole('button');
    expect(passages.map((passage) => passage.getAttribute('aria-label'))).toEqual([
      'Write Coffee, then Take up',
      'Take up, then Write Coffee',
    ]);
    fireEvent.click(passages[0]);
    expect(passages[0].getAttribute('aria-pressed')).toBe('true');
    expect(within(window).getByRole('status').textContent).toBe(
      'Not served. Take the order paper before writing its item. Try another passage.',
    );
    // The gap now shows the pick, in place.
    expect(within(window).queryByText('The gap')).toBeNull();
    expect(routine.querySelector('.drill-filled')?.textContent).toBe('Write CoffeeTake up');

    fireEvent.click(passages[1]);
    expect(passages[0].getAttribute('aria-pressed')).toBe('false');
    expect(within(window).getByRole('status').textContent).toBe(`Served. ${first.idea}`);

    fireEvent.click(within(window).getByRole('button', { name: 'All drills' }));
    expect(screen.getByRole('dialog', { name: 'Drills.' })).toBeTruthy();
    expect(document.activeElement?.textContent).toMatch(/^Paper, then pen/);
  });

  it('lay a nested passage out by how deep it sits', () => {
    const nested = drills.find((drill) => drill.id === 'ticket-per-drink')!;
    campaign(nested.shift);
    fireEvent.click(screen.getByRole('button', { name: /^Drills/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${nested.title}`) }));
    const passages = within(screen.getByRole('list', { name: 'Passages' })).getAllByRole('button');
    const depths = (passage: HTMLElement) =>
      [...passage.querySelectorAll<HTMLElement>('.block-line')].map((line) => line.style.getPropertyValue('--depth'));
    expect(depths(passages[0])).toEqual(['0', '0']);
    expect(depths(passages[1])).toEqual(['0', '1']);
  });
});

describe('a drill got right on the first pick', () => {
  const open = (title: string) => {
    fireEvent.click(screen.getByRole('button', { name: /^Drills/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
    return screen.getByRole('dialog', { name: title });
  };
  const saved = () => JSON.parse(localStorage.getItem('caffeine-protocol.v1') ?? '{}').drills;

  it('is ticked and kept with the café; one got right only after a miss is not', () => {
    campaign(first.shift);
    let window = open(first.title);
    const passages = () => within(within(window).getByRole('list', { name: 'Passages' })).getAllByRole('button');
    fireEvent.click(passages()[0]);
    fireEvent.click(passages()[1]);
    expect(within(window).getByRole('status').textContent).toMatch(/^Served/);
    fireEvent.click(within(window).getByRole('button', { name: 'All drills' }));
    expect(screen.getByRole('button', { name: /^Paper, then pen/ }).textContent).not.toContain('done');
    expect(saved()).toBeUndefined();

    window = open(first.title);
    fireEvent.click(passages()[1]);
    fireEvent.click(within(window).getByRole('button', { name: 'All drills' }));
    expect(screen.getByRole('button', { name: /^Paper, then pen/ }).textContent).toMatch(/^Paper, then pen, done/);
    expect(screen.getByRole('dialog').querySelector('.drills-waiting')?.textContent).toMatch(/^1 of 1 drill done\./);
    expect(saved()).toEqual([first.id]);
  });
});

describe('a moment to call', () => {
  const moment = predictions.find((each) => each.id === 'tea-or-coffee')!;
  const open = () => {
    campaign(moment.shift);
    fireEvent.click(screen.getByRole('button', { name: /^Drills/ }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${moment.title}`) }));
    return screen.getByRole('dialog', { name: moment.title });
  };

  it('shows the guest, the block just run and lettered choices, then what the café ran next', () => {
    const window = open();
    expect(document.activeElement?.textContent).toBe('Which block does Query run next?');
    expect(window.querySelector('.prediction-moment')?.textContent).toContain('The guest says“tea”');
    expect(window.querySelector('.block-line.ran')?.textContent).toBe('If Tea in Orders just ran');
    const blocks = within(within(window).getByRole('list', { name: 'Blocks' })).getAllByRole('button');
    expect(blocks.map((block) => block.getAttribute('aria-label'))).toEqual([
      'A: Write Tea',
      'B: Write Coffee',
      'C: Move right 1',
    ]);
    // The letters are in the routine too, beside the blocks they stand for.
    expect([...window.querySelectorAll('figure .block-line-mark')].map((mark) => mark.textContent?.trim())).toEqual([
      'just ran',
      'A',
      'B',
      'C',
    ]);

    fireEvent.click(blocks[1]);
    const status = within(window).getByRole('status');
    expect(status.textContent).toBe(`Not this time. Query ran A, Write Tea, next. ${moment.why}`);
    expect(window.querySelector('.block-line.next')?.textContent).toBe('Write Tea A · ran next');
    expect(window.querySelector('.block-line.missed')?.textContent).toBe('Write Coffee B');
    // One call a visit: the others can't be tried once the café has shown the answer.
    expect(blocks.every((block) => block.getAttribute('aria-disabled') === 'true')).toBe(true);
    fireEvent.click(blocks[0]);
    expect(status.textContent).toMatch(/^Not this time/);
    fireEvent.click(within(window).getByRole('button', { name: 'All drills' }));
    expect(screen.getByRole('button', { name: new RegExp(`^${moment.title}`) }).textContent).not.toContain('done');
  });

  it('is done once called right', () => {
    const window = open();
    fireEvent.click(within(within(window).getByRole('list', { name: 'Blocks' })).getAllByRole('button')[0]);
    expect(within(window).getByRole('status').textContent).toBe(`Called it. ${moment.why}`);
    fireEvent.click(within(window).getByRole('button', { name: 'All drills' }));
    const pick = screen.getByRole('button', { name: new RegExp(`^${moment.title}`) });
    expect(pick.textContent).toContain(`${moment.title}, doneWhat runs next · Shift ${moment.shift}`);
  });
});

describe('a drill named in Help', () => {
  const evidence = (code: string) => ({ failure: { code } }) as RunEvidence;
  const ticket = drills.find((drill) => drill.id === 'ticket-per-drink')!;

  it('is the newest served drill on the idea the last run missed', () => {
    const stars = servedThrough(ticket.shift);
    expect(drillFor(drills, stars, evidence('no-paper'), false)).toBe(ticket);
    // Paper first is served, the ticket per drink not yet: the older drill it is.
    expect(drillFor(drills, servedThrough(first.shift), evidence('no-paper'), false)).toBe(first);
    expect(drillFor(drills, {}, evidence('no-paper'), false)).toBeUndefined();
    // Running out of steps says too little to point anywhere, and an edited routine isn't the one that failed.
    expect(drillFor(drills, stars, evidence('loop-limit'), false)).toBeUndefined();
    expect(drillFor(drills, stars, evidence('no-paper'), true)).toBeUndefined();
    expect(drillFor(drills, stars, null, false)).toBeUndefined();
  });

  it('sits with the clue', () => {
    const props = {
      index: 6,
      title: 'Shift',
      lesson: { note: 'Note', solution: 'LISTEN\nTAKE UP' },
      brief: { story: 'Story', objective: 'Goal', concept: 'The idea.' },
      level: levels[6],
      role: 'query' as const,
      source: 'LISTEN',
      opening: 'LISTEN',
      observation: false,
      running: false,
      onHints: () => {},
      evidence: null,
      stale: false,
      drill: ticket,
      onShowClue: () => {},
      onUseExample: () => {},
      onReplayIntro: () => {},
      onClose: () => {},
    };
    const { rerender } = render(<HelpModal {...props} hints={1} />);
    expect(screen.queryByText(/Drills have one/)).toBeNull();
    rerender(<HelpModal {...props} hints={2} />);
    const hints = within(screen.getByRole('list', { name: 'Hints' })).getAllByRole('listitem');
    expect(hints[1].querySelector('.help-drill')?.textContent).toBe(
      `The order rail’s Drills have one on this, from Shift ${ticket.shift}: “${ticket.title}”.`,
    );
  });
});
