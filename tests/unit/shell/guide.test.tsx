import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideWindow } from '../../../src/app/GuideWindow';
import { GameProvider } from '../../../src/state/GameStore';

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
  it('names blocks and stars the way the game shows them', () => {
    render(
      <GameProvider>
        <GuideWindow onClose={() => {}} />
      </GameProvider>,
    );
    const guide = screen.getByRole('dialog', { name: 'How the café runs.' });
    expect(guide.textContent).toContain('Move counts whole tiles');
    expect(guide.textContent).toContain('Turn on the Text editor in a shift’s Options');
    // Blocks have no grip: a group moves with the block that opens it.
    expect(guide.textContent).toContain('Drag a branch, loop or function by its first block to move it whole.');
    expect(guide.textContent).not.toContain('grip');
    // Shift numbers read as they do on the campaign rail and in the workspace.
    expect(guide.textContent).toContain(
      'Query takes orders from Shift 02, Brew runs the kitchen from Shift 09, and Porter works the floor from Shift 14.',
    );
    expect(guide.textContent).toContain('Niko writes the tickets, Moka brews and Pip serves.');
    // The toolbar's own buttons come first, so a tablet without a keyboard can follow along.
    expect(guide.textContent).toContain('Run service (or');
    expect(guide.textContent).toContain('Stop & edit (or Esc)');
    // Esc's other job, out of service, is spelled out too.
    expect(guide.textContent).toContain('With the café idle, Esc heads back to the campaign.');
    // The run shortcut names this keyboard's modifier only.
    const run = [...guide.querySelectorAll('kbd')].find((k) => k.textContent.includes('Enter'));
    expect(run?.textContent).toMatch(/^(Ctrl|⌘) \+ Enter$/);
    // Star glyphs are drawn only; each count is read in words, climbing in order.
    for (const words of ['One star', 'Two stars', 'Three stars']) expect(screen.getByText(words)).toBeTruthy();
    expect([...guide.querySelectorAll('.guide-stars')].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(
      true,
    );
  });
});
