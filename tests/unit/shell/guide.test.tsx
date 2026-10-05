import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideWindow } from '../../../src/app/GuideWindow';
import { UNLOCKS } from '../../../src/domain';
import { GameProvider } from '../../../src/state/GameStore';
import { makeSave, seedLocalStorage } from '../../helpers/saves';

vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

describe('how to play', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
    };
  });
  afterEach(() => localStorage.clear());

  /** The guide as a café opened up to `unlocked` reads it. */
  const guideAt = (unlocked: number) => {
    seedLocalStorage(makeSave({ unlocked, selected: unlocked }));
    const { unmount } = render(
      <GameProvider>
        <GuideWindow onClose={() => {}} />
      </GameProvider>,
    );
    const text = screen.getByRole('dialog', { name: 'How the café runs.' }).textContent;
    unmount();
    return text;
  };

  it('names each robot only once its act has opened, as the rail does', () => {
    const fresh = guideAt(0);
    expect(fresh).not.toMatch(/Query|Brew|Porter|three/);
    expect(fresh).toContain('you program secondhand robots until it runs by itself. The first of them turns up');
    // Until a robot joins, the ticket is carried by whoever does its job by hand.
    expect(fresh).toContain(
      'Niko writes down what the guest asked for, Moka makes exactly what the ticket says, and Pip takes it to the table it names.',
    );
    const actII = guideAt(UNLOCKS.prep - 1);
    expect(actII).toContain(
      'until it runs by itself: Query takes orders from Shift 02 and Brew runs the kitchen from Shift 09. More of the crew turn up',
    );
    expect(actII).not.toMatch(/Porter|three/);
    expect(actII).toContain(
      'Query writes down what the guest asked for, Brew makes exactly what the ticket says, and Pip',
    );
    // One shift before Porter's act opens, it still isn't named.
    expect(guideAt(UNLOCKS.floor - 2)).not.toContain('Porter');
    expect(guideAt(UNLOCKS.floor - 1)).toContain('and Porter takes it to the table it names.');
  });

  it('names blocks and stars the way the game shows them', () => {
    seedLocalStorage(makeSave({ unlocked: UNLOCKS.floor - 1 }));
    render(
      <GameProvider>
        <GuideWindow onClose={() => {}} />
      </GameProvider>,
    );
    const guide = screen.getByRole('dialog', { name: 'How the café runs.' });
    expect(guide.textContent).toContain('Move counts whole tiles');
    expect(guide.textContent).toContain('Turn on the Text editor in a shift’s Options');
    // Blocks have no grip: a group moves with the block that opens it.
    expect(guide.textContent).toContain(
      'Drag a branch, loop or function by its first block to move it whole, or drag a block out of the code to remove it.',
    );
    expect(guide.textContent).not.toContain('grip');
    // A tablet player learns the hold that lifts a block, and that a swipe scrolls instead.
    expect(guide.textContent).toContain(
      'On a touch screen, rest a finger on a block until it rises, then drag; a quicker swipe scrolls the routine.',
    );
    // The notebook is named where it is, and what it checks.
    expect(guide.textContent).toContain(
      'The Notebook beside Help keeps the open robot’s routine under a name, to bring back on any shift in its place or after it.',
    );
    // The keyboard way to move a block names every key the editor's own instructions do.
    expect(guide.textContent).toContain(
      'Space to lift, arrow keys to move, Space to drop, Esc to put it back, Delete to remove it, Enter to pick it as the place new blocks go.',
    );
    // A block's values can be set without a pointer too, both ways its menus answer the keys.
    expect(guide.textContent).toContain(
      'From the keyboard, a value’s menu opens with the arrow keys, or by typing the first letters of the one you want.',
    );
    // Shift numbers read as they do on the campaign rail and in the workspace.
    expect(guide.textContent).toContain(
      'you program three secondhand robots until it runs by itself: Query takes orders from Shift 02, Brew runs the kitchen from Shift 09, and Porter works the floor from Shift 14.',
    );
    expect(guide.textContent).toContain('Niko writes the tickets, Moka brews and Pip serves.');
    // The toolbar's own buttons come first, so a tablet without a keyboard can follow along.
    expect(guide.textContent).toContain('Run service (or');
    expect(guide.textContent).toContain('Stop & edit (or Esc)');
    // Esc's other job, out of service, is spelled out too.
    expect(guide.textContent).toContain('With the café idle, Esc heads back to the campaign.');
    expect(guide.textContent).toContain(
      'Most shifts send in a few rounds of guests, one after another, and every round has to go right.',
    );
    // The run shortcut names this keyboard's modifier only.
    const run = [...guide.querySelectorAll('kbd')].find((k) => k.textContent.includes('+ Enter'));
    expect(run?.textContent).toMatch(/^(Ctrl|⌘) \+ Enter$/);
    // Star glyphs are drawn only; each count is read in words, climbing in order.
    for (const words of ['One star', 'Two stars', 'Three stars']) expect(screen.getByText(words)).toBeTruthy();
    expect([...guide.querySelectorAll('.guide-stars')].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(
      true,
    );
  });
});
