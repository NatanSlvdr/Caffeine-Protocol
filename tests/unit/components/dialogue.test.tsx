import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DialogueBox } from '../../../src/components/dialogue/DialogueBox';
import { portraitUrl } from '../../../src/components/dialogue/Portrait';
import { cast } from '../../../src/data/campaign/cast';
import { endingScene, shiftIntro } from '../../../src/data/campaign/dialogue';
import { CAST_IDS, line } from '../../../src/domain/dialogue';
import { levels } from '../../../src/data';
import { failureLines, successLines } from '../../../src/features/workspace/reactions';
import type { RunFailure, RunResult } from '../../../src/domain/types';

const lines = [line('', 'The shutters roll up.'), line('niko:happy', 'We’re open!'), line('query', 'Acknowledged.')];

describe('DialogueBox', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('types each line out, then advances and finishes on the done button', () => {
    const onDone = vi.fn();
    render(<DialogueBox lines={lines} onDone={onDone} kicker="Shift 01 · Test" doneLabel="Start the shift" />);
    const dialog = screen.getByRole('dialog', { name: 'Shift 01 · Test' });
    // The whole line is readable to screen readers while it types.
    expect(dialog.querySelector('.sr-only')?.textContent).toBe('The shutters roll up.');
    expect(dialog.querySelector('.dialogue-unread')?.textContent).toBe('The shutters roll up.');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Niko')).toBeTruthy();
    expect(document.querySelector('.portrait')?.getAttribute('data-mood')).toBe('happy');
    // A click mid-line finishes it instead of skipping ahead.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Niko')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Query')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start the shift' }));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('prints lines whole when instant, and Escape skips a scene', () => {
    const onDone = vi.fn();
    render(<DialogueBox lines={lines} onDone={onDone} instant />);
    expect(document.querySelector('.dialogue-unread')?.textContent).toBe('');
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Niko')).toBeTruthy();
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    fireEvent.keyDown(window, { key: 'Escape' });
    window.removeEventListener('keydown', outer);
    expect(onDone).toHaveBeenCalledOnce();
    // The workspace never sees the key, so Escape doesn't also leave the shift.
    expect(outer).not.toHaveBeenCalled();
  });

  it('leaves the keyboard alone for an aside unless focus is inside it', () => {
    const onDone = vi.fn();
    render(<DialogueBox lines={lines} onDone={onDone} variant="aside" instant />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBeNull();
    screen.getByRole('button', { name: 'Next' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('sets robots in machine type and sound effects apart', () => {
    render(<DialogueBox lines={[line('query', '*bip boop* Menu doubled.')]} onDone={() => {}} instant />);
    expect(document.querySelector('.dialogue-stage')?.classList.contains('robot-voice')).toBe(true);
    expect(document.querySelector('.dialogue-sfx')?.textContent).toBe('bip boop');
    expect(document.querySelector('.sr-only')?.textContent).toBe('Query: bip boop Menu doubled.');
  });

  it('gives every character a portrait, falling back to neutral for a missing mood', () => {
    for (const id of CAST_IDS) expect(portraitUrl(id), id).toBeTruthy();
    expect(portraitUrl('albert', 'worried')).toBe(portraitUrl('albert'));
    render(<DialogueBox lines={[line('albert', 'The usual.')]} onDone={() => {}} instant />);
    expect(document.querySelector('.portrait img')?.getAttribute('src')).toBe(portraitUrl('albert'));
  });
});

describe('scripts', () => {
  const speakers = (scene: { who?: string }[]) => scene.flatMap((l) => (l.who ? [l.who] : []));

  it('gives every shift an intro, spoken only by known cast', () => {
    for (let i = 0; i < levels.length; i++) {
      const intro = shiftIntro(i);
      expect(intro.length, `shift ${i + 1}`).toBeGreaterThan(0);
      for (const l of intro) expect(l.text.trim(), `shift ${i + 1}`).not.toBe('');
      for (const who of speakers(intro)) expect(CAST_IDS).toContain(who);
    }
    for (const who of speakers(endingScene)) expect(CAST_IDS).toContain(who);
  });

  it('names every cast member', () => {
    for (const id of CAST_IDS) expect(cast[id].name).toBeTruthy();
  });
});

describe('reactions', () => {
  const failure = (reason: string, extra: Partial<RunFailure> = {}): RunResult =>
    ({
      passed: false,
      observation: false,
      stars: 0,
      first_failure: { role: 'query', phrase: 'Two teas, please.', reason, ...extra },
    }) as RunResult;

  it('lets the guest react to a wrong order, then Niko explains', () => {
    const [guest, niko] = failureLines(failure('Wrong item: expected tea, got coffee.'), 'query');
    expect(guest).toMatchObject({ who: 'guest', mood: 'worried' });
    expect(guest.text).toContain('Two teas, please.');
    expect(niko.who).toBe('niko');
    expect(niko.text).toContain('Wrong item');
  });

  it('lets the stuck robot speak for itself', () => {
    const [robot] = failureLines(failure('Something odd happened.', { role: 'prep' }), 'query');
    expect(robot.who).toBe('brew');
    const [floor] = failureLines(failure('Finish brewing before sugar.', { role: 'floor' }), 'query');
    expect(floor.who).toBe('porter');
    expect(floor.text).toContain('not ready');
  });

  it('cheers a finished service before the receipt', () => {
    const passed = { passed: true, observation: false, stars: 3, first_failure: null } as unknown as RunResult;
    const [robot, niko] = successLines(passed, 'prep', 0);
    expect(robot.who).toBe('brew');
    expect(niko.text).toContain('Three stars');
    expect(successLines({ ...passed, observation: true }, 'query', 0)).toHaveLength(1);
  });
});
