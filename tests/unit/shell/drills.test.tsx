import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levels } from '../../../src/data';
import { drills } from '../../../src/data/drills';
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
    expect(within(window).getByText(`${drills.length - 1} more drills open as later shifts are served.`)).toBeTruthy();
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
