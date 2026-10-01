import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DialogueBox } from '../../../src/components/dialogue/DialogueBox';
import { portraitUrl } from '../../../src/components/dialogue/Portrait';
import { cast } from '../../../src/data/campaign/cast';
import { shiftIntro, shiftOutro } from '../../../src/data/campaign/dialogue';
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

  it('shows a named command as its block, popping in when the typing reaches it', () => {
    render(<DialogueBox lines={[line('niko', 'Use [LISTEN|Wait for Orders] first.')]} onDone={() => {}} />);
    const block = document.querySelector('.dialogue-block');
    expect(block?.textContent).toBe('Wait for Orders');
    expect(block?.classList.contains('dialogue-unread')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(block?.classList.contains('dialogue-unread')).toBe(false);
    expect(document.querySelector('.sr-only')?.textContent).toBe('Niko: Use Wait for Orders first.');
  });

  it('labels guests as customers, never as crew', () => {
    render(<DialogueBox lines={[line('juno', 'Tea, please.'), line('guest', 'Coffee!')]} onDone={() => {}} instant />);
    expect(document.querySelector('.dialogue-name')?.textContent).toBe('Customer:Juno');
    expect(document.querySelector('.dialogue-name')?.lastChild?.textContent).toBe('Juno');
    expect(document.querySelector('.sr-only')?.textContent).toBe('Juno, customer: Tea, please.');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.querySelector('.dialogue-role')).toBeNull();
    expect(document.querySelector('.dialogue-name')?.textContent).toBe('Customer');
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
  });

  it('pays every shift off with a scene, spoken only by known cast', () => {
    for (let i = 0; i < levels.length; i++) {
      const outro = shiftOutro(i);
      expect(outro.length, `shift ${i + 1}`).toBeGreaterThan(0);
      for (const l of outro) expect(l.text.trim(), `shift ${i + 1}`).not.toBe('');
      for (const who of speakers(outro)) expect(CAST_IDS).toContain(who);
    }
    expect(shiftOutro(levels.length)).toEqual([]);
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
    const [guest, niko] = failureLines(
      failure('Ticket 1 has the wrong item: they asked for tea, not coffee.'),
      'query',
    );
    expect(guest).toMatchObject({ who: 'guest', mood: 'worried' });
    expect(guest.text).toContain('Two teas, please.');
    expect(niko.who).toBe('niko');
    expect(niko.text).toContain('has the wrong item');
  });

  it('explains why the common Query and robot mistakes matter', () => {
    const niko = (reason: string) => failureLines(failure(reason, { role: 'query' }), 'query')[1].text;
    expect(niko('Query stopped listening. Jump back to Wait for Orders after serving.')).toContain('next one');
    expect(niko('Query handed over too few tickets: every drink they ordered needs its own.')).toContain(
      'every drink they named',
    );
    expect(niko('This order is unclear. Use Help before taking paper.')).toContain('Guessing');
    expect(
      niko('Query is still holding a ticket the kitchen never got: Deposit right at the kitchen handoff.'),
    ).toContain('only half of it');
    expect(niko('Wait for dirty cups before collecting one.')).toContain('job it has been handed');
    expect(
      niko('Wait for Orders or Wait for Dirty cups first: Porter has no job yet, so there’s no table to store.'),
    ).toContain('job it has been handed');
    expect(
      niko('Brew made every drink one at a time: this shift, claim 2 tickets and make them in one trip.'),
    ).toContain('Fill both before setting off');
    expect(niko('Porter carried one item at a time: this shift, fill the tray with 2 before setting off.')).toContain(
      'Fill both before setting off',
    );
    expect(
      niko(
        'Brew served every ticket, but its recipe isn’t in a function yet: this shift, the steps go in Function recipe, and Brew uses Call recipe for each ticket.',
      ),
    ).toContain('one place to change');
    expect(
      niko(
        'Brew reached the end of its program with work still to do: put a Position marker at the top and a Jump back to it at the end, so Brew goes back for the next ticket.',
      ),
    ).toContain('from top to bottom once');
    expect(
      niko(
        'An hour went by and the service still isn’t finished: Porter keeps going round its loop without reaching its next job.',
      ),
    ).toContain('Something loops forever');
    expect(
      niko(
        'Brew keeps going round its loop without doing anything: put Wait for Orders inside it, so Brew waits for its next ticket.',
      ),
    ).toContain('Something loops forever');
    expect(
      niko(
        'Porter is still holding the coffee for table 2, and its guest is waiting for it: serve it before waiting for more work.',
      ),
    ).toContain('has to see it through');
    // Brew's sugar slip is about counting it in, not reading the order.
    expect(niko('This coffee takes 2 sugars, but it has 1.')).toContain('exactly the sugar on the ticket');
    expect(niko('Ticket 1 needs 2 sugars, but it says 0.')).toContain('how much sugar they asked for');
    expect(niko('Move to the sink first: it’s 2 tiles from here.')).toContain('walk over before using it');
    expect(niko('Carry a ready drink before serving.')).toContain('Pick it up first');
    // A dirty cup has no ticket, so Niko doesn't point at one.
    expect(niko('The dirty cup is on table 3, not table 2.')).toContain('Wait for Dirty cups names the table');
    expect(niko('This drink is for table 3, not table 2.')).toContain('The ticket names the table');
  });
  it('lets the stuck robot speak for itself', () => {
    const [robot] = failureLines(failure('Something odd happened.', { role: 'prep' }), 'query');
    expect(robot.who).toBe('brew');
    const [floor] = failureLines(failure('Finish brewing before sugar.', { role: 'floor' }), 'query');
    expect(floor.who).toBe('porter');
    expect(floor.text).toContain('not ready');
  });

  const targets = { block_target: 10, instruction_target: 40 };
  it('cheers a finished service before the receipt', () => {
    const passed = { passed: true, observation: false, stars: 3, first_failure: null } as unknown as RunResult;
    const [robot, niko] = successLines(passed, 'prep', 0, targets);
    expect(robot.who).toBe('brew');
    expect(niko.text).toContain('Three stars');
    expect(successLines({ ...passed, observation: true }, 'query', 0, targets)).toHaveLength(1);
  });
  it('says which star target was missed, and by how much', () => {
    const passed = { passed: true, observation: false, first_failure: null } as unknown as RunResult;
    const verdict = (patch: Partial<RunResult>) => successLines({ ...passed, ...patch }, 'query', 0, targets)[1].text;
    expect(verdict({ stars: 1, block_count: 14 })).toContain('runs 14 blocks, though, and 10 would do');
    expect(verdict({ stars: 2, executed_instructions: 52 })).toContain('took 52 steps where 40 would do');
  });

  it('plays the shift payoff in place of the stock cheer, then the verdict', () => {
    const passed = { passed: true, observation: false, stars: 3, first_failure: null } as unknown as RunResult;
    const payoff = [line('juno:happy', 'Actual tea.')];
    const lines = successLines(passed, 'query', 2, targets, payoff);
    expect(lines.map((l) => l.text)).toEqual(['Actual tea.', expect.stringContaining('Three stars')]);
    expect(successLines({ ...passed, observation: true }, 'query', 0, targets, payoff)).toEqual(payoff);
  });
});
