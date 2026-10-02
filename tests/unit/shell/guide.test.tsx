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
    // The toolbar's own buttons come first, so a tablet without a keyboard can follow along.
    expect(guide.textContent).toContain('Run service (or');
    expect(guide.textContent).toContain('Stop & edit (or Esc)');
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
