import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DialogueBox } from '../../../src/components/dialogue/DialogueBox';
import { portraitUrl } from '../../../src/components/dialogue/Portrait';
import { cast } from '../../../src/data/campaign/cast';
import { shiftIntro, shiftOutro } from '../../../src/data/campaign/dialogue';
import { CAST_IDS, line } from '../../../src/domain/dialogue';
import type { DialogueLine } from '../../../src/domain/dialogue';
import { levels } from '../../../src/data';
import { failureLines, successLines } from '../../../src/features/workspace/reactions';
import type { FailureCode } from '../../../src/domain/failures';
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
    // The keys that drive a scene are named on the buttons they stand in for.
    expect(screen.getByRole('button', { name: 'Next' }).getAttribute('aria-keyshortcuts')).toBe('Enter Space');
    expect(screen.getByRole('button', { name: 'Skip' }).getAttribute('aria-keyshortcuts')).toBe('Escape');
    expect(screen.getByText('Line 1 of 3')).toBeTruthy();
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

  it('reads the first line out as it lands, not only the ones after it', () => {
    // A live region keeps quiet about what it opens with, so on first paint it must still be empty.
    const first = renderToStaticMarkup(<DialogueBox lines={lines} variant="aside" onDone={() => {}} />);
    const region = new DOMParser().parseFromString(first, 'text/html').querySelector('[aria-live]');
    expect(region?.querySelector('.sr-only')?.textContent).toBe('');
    render(<DialogueBox lines={lines} variant="aside" onDone={() => {}} />);
    expect(document.querySelector('[aria-live] .sr-only')?.textContent).toBe('The shutters roll up.');
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

  it('moves on one line for a held key, never through the scene', () => {
    const onDone = vi.fn();
    render(<DialogueBox lines={lines} onDone={onDone} instant />);
    fireEvent.keyDown(window, { key: 'Enter' });
    for (const key of ['Enter', ' ', 'Enter', ' ']) fireEvent.keyDown(window, { key, repeat: true });
    expect(screen.getByText('Niko')).toBeTruthy();
    // The focused button doesn't take the repeat as a click either.
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Next' }), { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'Enter', repeat: true });
    expect(screen.getByText('Query')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('leaves the keyboard alone for an aside unless focus is inside it', () => {
    const onDone = vi.fn();
    const Host = ({ aside }: { aside: boolean }) => (
      <>
        <textarea aria-label="Routine" />
        {aside && <DialogueBox lines={lines} onDone={onDone} variant="aside" instant />}
      </>
    );
    const { rerender } = render(<Host aside={false} />);
    screen.getByRole('textbox', { name: 'Routine' }).focus();
    rerender(<Host aside />);
    // Landing beside code being typed, it leaves focus where it is.
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Routine' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBeNull();
    screen.getByRole('button', { name: 'Next' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('puts an aside one key away when nobody is typing', () => {
    render(
      <>
        <button type="button">Run service</button>
        <DialogueBox lines={lines} onDone={vi.fn()} variant="aside" instant />
      </>,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
    // It isn't modal, so Tab is free to leave it.
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
  });

  it('keeps Tab on a scene’s own buttons, not the screen dimmed behind it', () => {
    render(
      <>
        <button type="button">Run service</button>
        <DialogueBox lines={lines} onDone={vi.fn()} instant />
      </>,
    );
    const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey });
    const next = screen.getByRole('button', { name: 'Next' });
    const skip = screen.getByRole('button', { name: /Skip/ });
    expect(document.activeElement).toBe(next);
    tab();
    expect(document.activeElement).toBe(skip);
    tab();
    expect(document.activeElement).toBe(next);
    tab(true);
    expect(document.activeElement).toBe(skip);
    tab(true);
    expect(document.activeElement).toBe(next);
    // Focus that slipped out comes back in on the next Tab.
    screen.getByRole('button', { name: 'Run service' }).focus();
    tab();
    expect(document.activeElement).toBe(skip);
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
  const failure = (code: FailureCode, reason: string, extra: Partial<RunFailure> = {}): RunResult =>
    ({
      passed: false,
      observation: false,
      stars: 0,
      first_failure: { role: 'query', phrase: 'Two teas, please.', code, reason, ...extra },
    }) as RunResult;

  it('lets the guest react to a wrong order, then Niko explains', () => {
    const [guest, niko] = failureLines(
      failure('ticket-item', 'Ticket 1 has the wrong item: they asked for tea, not coffee.'),
      'query',
    );
    expect(guest).toMatchObject({ who: 'guest', mood: 'worried' });
    expect(guest.text).toContain('Two teas, please.');
    expect(niko.who).toBe('niko');
    expect(niko.text).toContain('has the wrong item');
  });

  it('explains why the common Query and robot mistakes matter', () => {
    const niko = (code: FailureCode, reason: string) =>
      failureLines(failure(code, reason, { role: 'query' }), 'query')[1].text;
    expect(niko('stopped-listening', 'Query stopped listening. Jump back to Wait for Orders after serving.')).toContain(
      'next one',
    );
    expect(
      niko('ticket-count', 'Query handed over too few tickets: every drink they ordered needs its own.'),
    ).toContain('One sheet per drink they named');
    expect(niko('unclear-order', 'This order is unclear. Use Help before taking paper.')).toContain('Guessing');
    expect(
      niko(
        'ticket-not-handed-over',
        'Query is still holding a ticket the kitchen never got: Deposit right at the kitchen handoff.',
      ),
    ).toContain('only half of it');
    expect(niko('no-job', 'Wait for dirty cups before collecting one.')).toContain('job it has been handed');
    expect(
      niko(
        'no-job',
        'Wait for Orders or Wait for Dirty cups first: Porter has no job yet, so there’s no table to store.',
      ),
    ).toContain('job it has been handed');
    expect(
      niko('carry-more', 'Brew made every drink one at a time: this shift, claim 2 tickets and make them in one trip.'),
    ).toContain('Fill both before setting off');
    expect(
      niko('carry-more', 'Porter carried one item at a time: this shift, fill the tray with 2 before setting off.'),
    ).toContain('Fill both before setting off');
    expect(
      niko(
        'recipe-not-function',
        'Brew served every ticket, but its recipe isn’t in a function yet: this shift, the steps go in Function recipe, and Brew uses Call recipe for each ticket.',
      ),
    ).toContain('one place to change');
    expect(
      niko(
        'end-of-routine',
        'Brew reached the end of its routine with work still to do: put a jump destination at the top and a Jump back to it at the end, so Brew goes back for the next ticket.',
      ),
    ).toContain('from top to bottom once');
    expect(
      niko(
        'loop-limit',
        'An hour went by and the service still isn’t finished: Porter keeps going round its loop without reaching its next job.',
      ),
    ).toContain('Something loops forever');
    expect(
      niko(
        'loop-limit',
        'Brew keeps going round its loop without doing anything: put Wait for Orders inside it, so Brew waits for its next ticket.',
      ),
    ).toContain('Something loops forever');
    expect(
      niko(
        'unfinished-work',
        'Porter is still holding the coffee for table 2, and its guest is waiting for it: serve it before waiting for more work.',
      ),
    ).toContain('has to see it through');
    // Brew's sugar slip is about counting it in, not reading the order.
    expect(niko('sugar-count', 'This coffee takes 2 sugars, but it has 1.')).toContain(
      'exactly the sugar on the ticket',
    );
    expect(niko('ticket-sugar', 'Ticket 1 needs 2 sugars, but it says 0.')).toContain('how much sugar they asked for');
    // A mark written where it doesn't belong is the opposite slip to a missing one.
    expect(niko('ticket-rush-extra', 'Ticket 1 isn’t in a rush, but it says Rush.')).toContain(
      'only for guests who say they’re in a hurry',
    );
    expect(niko('ticket-to-go-extra', 'Ticket 1 is staying in, but it says To go.')).toContain(
      'Only write To go when the order says so',
    );
    expect(niko('ticket-to-go-missing', 'Ticket 1 is to go: Write To go on it.')).toContain(
      'If To go IN item, then Write To go',
    );
    expect(niko('stay-in-to-table', 'This coffee is for table 2, not the to-go shelf.')).toContain(
      'goes to the table on its ticket',
    );
    expect(niko('not-brewed', 'Finish brewing before putting a lid on.')).toContain('putting a lid on');
    expect(niko('paper-in-hand', 'Deposit the current paper before taking another.')).toContain(
      'Deposit right, then take a fresh one',
    );
    expect(niko('paper-in-hand', 'Deposit this item’s paper before the For loop moves on.')).toContain('Deposit right');
    expect(
      niko('no-paper', 'Query isn’t holding a ticket to hand over: Take up a sheet and write on it first.'),
    ).toContain('only write on paper it’s holding');
    for (const reason of [
      'Move left 1 tile to the register before Wait for Orders.',
      'Return to the register after depositing the order.',
      'Move right to the handoff tile, then Deposit right into the order counter.',
      'No paper in that direction. At the register, use Take up: the paper stack is above it.',
    ])
      expect(niko('wrong-spot', reason)).toContain('the paper stack just above it');
    expect(niko('unset-variable', 'Store a table or a place in var3 before moving to it.')).toBe(
      'Store a table or a place in Var C before moving to it. A variable stays empty until a Store fills it: put the Store above the block that reads it.',
    );
    expect(niko('unset-variable', 'Store a number in var2 before looping on it.')).toContain('until a Store fills it');
    expect(niko('no-number', 'This item has no number to store. Check If Number IN item first.')).toContain(
      'inside an If',
    );
    expect(niko('recursive-call', 'A function can’t call itself.')).toContain('a Call in the main routine');
    expect(niko('recipe-order', 'The coffee machine can’t work on this coffee yet. Next step: Grind.')).toContain(
      'one step at a time',
    );
    expect(niko('nothing-there', 'There’s nothing for Brew to take there yet.')).toContain('Wait for Orders first');
    expect(niko('empty-hands', 'Brew isn’t holding anything to deposit.')).toContain('Pick it up first');
    expect(niko('one-job-at-a-time', 'Finish this delivery or cup before waiting for another.')).toContain(
      'before Wait for Orders',
    );
    const late = failureLines(
      failure('unclear-order', 'Use Help before taking paper or starting For item in order.', {
        role: 'query',
        phrase: 'a big one',
      }),
      'query',
    );
    expect(late.map((l) => l.text)).toEqual([
      'I said “a big one”… I’m not sure that came out right.',
      'Use Help before taking paper or starting For item in order. Guessing sends the wrong drink. Ask me with Help first, and I’ll find out what they meant.',
    ]);
    expect(
      niko('checkout', 'Query has to be back at the register after the last ticket, so the guest can pay at checkout.'),
    ).toContain('so the guest can pay');
    expect(niko('jump-across-block', 'Finish the function before jumping back.')).toContain('let it reach its End');
    expect(niko('return-outside-call', 'Return only works inside a function that was called.')).toContain(
      'back to the block after its Call',
    );
    expect(
      niko(
        'jump-across-block',
        'This For loop’s End was reached without its For: jump to the For line, not into the loop.',
      ),
    ).toContain('let it reach its End');
    // A slip that only mentions sugar is the robot's, so the guest doesn't complain about their sugar.
    const [query, paper] = failureLines(failure('no-paper', 'Take the order paper before writing sugar.'), 'query');
    expect(query.who).toBe('query');
    expect(paper.text).toContain('only write on paper it’s holding');
    const [brew, brewed] = failureLines(
      failure('already-brewed', 'This tea is already brewed: take up sugar or deposit it up at pickup.', {
        role: 'prep',
      }),
      'query',
    );
    expect(brew.who).toBe('brew');
    expect(brewed.text).toContain('finished with the machine');
    expect(niko('out-of-reach', 'Move to the sink first: it’s 2 tiles from here.')).toContain(
      'walk over before using it',
    );
    expect(niko('empty-hands', 'Carry a ready drink before serving.')).toContain('Pick it up first');
    // A dirty cup has no ticket, so Niko doesn't point at one.
    expect(niko('wrong-dirty-table', 'The dirty cup is on table 3, not table 2.')).toContain(
      'Wait for Dirty cups names the table',
    );
    expect(niko('wrong-table', 'This drink is for table 3, not table 2.')).toContain('The ticket names the table');
  });
  it('picks the hint by failure code, never by wording', () => {
    const lines = (code: FailureCode, reason: string) => failureLines(failure(code, reason), 'query');
    const hint = (code: FailureCode, reason: string) => lines(code, reason)[1].text.slice(reason.length);
    // Rewording, punctuating, or translating a message keeps its reaction and hint.
    const [guest, niko] = lines('ticket-sugar', 'Ticket 1 needs 2 sugars, but it says 0.');
    const [reworded, rewordedNiko] = lines('ticket-sugar', 'Le ticket 1 demande 2 sucres; il en indique 0!');
    expect(reworded).toEqual(guest);
    expect(rewordedNiko.text.endsWith(niko.text.slice('Ticket 1 needs 2 sugars, but it says 0.'.length))).toBe(true);
    // A message that happens to mention sugar, a lid, or a table no longer borrows another failure's hint.
    expect(hint('wrong-direction', 'The sugar station is below Brew: use Take down.')).toContain('arrow points at');
    expect(hint('wrong-direction', 'The lids are below Brew: use Take down.')).not.toContain('lid');
    expect(hint('wrong-variable-kind', 'Var A holds 9, and there’s no table 9.')).toContain('its Store put there');
    // Brew adding a cube too many is Brew's slip, before any guest tastes it.
    const [plop] = failureLines(failure('too-much-sugar', 'This coffee takes no sugar.', { role: 'prep' }), 'query');
    expect(plop.who).toBe('brew');
  });
  it('lets the stuck robot speak for itself', () => {
    const [robot] = failureLines(failure('unsupported', 'Something odd happened.', { role: 'prep' }), 'query');
    expect(robot).toMatchObject({ who: 'brew', text: '*sad beep* Not know what next!' });
    const [floor] = failureLines(failure('not-brewed', 'Finish brewing before sugar.', { role: 'floor' }), 'query');
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
    expect(verdict({ stars: 1, block_count: 14 })).toContain('uses 14 blocks, though, and 10 would do');
    expect(verdict({ stars: 2, executed_instructions: 52 })).toContain('took 52 steps where 40 would do');
  });

  it('plays the shift payoff in place of the stock cheer, then the verdict', () => {
    const passed = { passed: true, observation: false, stars: 3, first_failure: null } as unknown as RunResult;
    const payoff = [line('juno:happy', 'Actual tea.')];
    const lines = successLines(passed, 'query', 2, targets, payoff);
    expect(lines.map((l) => l.text)).toEqual(['Actual tea.', expect.stringContaining('Three stars')]);
    expect(successLines({ ...passed, observation: true }, 'query', 0, targets, payoff)).toEqual(payoff);
  });

  it('lets the robot cheer a new best in its own words, even on a repeat', () => {
    const passed = { passed: true, observation: false, stars: 3, first_failure: null } as unknown as RunResult;
    const texts = (lines: DialogueLine[]) => lines.map((l) => l.text);
    const [robot, niko] = successLines(passed, 'prep', 0, targets, [], false, 1);
    expect(robot).toMatchObject({ who: 'brew', text: '*BEEP BEEP!* New best! 3 stars, up from 1 star!' });
    expect(niko.text).toContain('Three stars');
    // A repeat told briefly still hears it, and a written payoff plays first.
    expect(texts(successLines({ ...passed, stars: 2 }, 'floor', 0, targets, [], true, 1))).toEqual([
      '*ding ding ding!* Up from 1 star to 2 stars. New best!',
      expect.stringContaining('took'),
    ]);
    expect(texts(successLines(passed, 'query', 0, targets, [line('juno:happy', 'Actual tea.')], false, 2))).toEqual([
      'Actual tea.',
      '*bip boop* 3 stars, up from 2 stars. Recording: new best.',
      expect.stringContaining('Three stars'),
    ]);
    // Matching the best, or a first service, is no milestone.
    expect(successLines(passed, 'prep', 0, targets, [], true, 3)).toHaveLength(1);
    expect(texts(successLines(passed, 'prep', 0, targets))[0]).not.toContain('New best');
  });

  it('points a setback on a shift that went right before at the routine that was served', () => {
    const slip = failure('ticket-item', 'Ticket 1 has the wrong item.');
    const [, , restore] = failureLines(slip, 'query', false, { query: 'listen' });
    expect(restore).toMatchObject({ who: 'niko' });
    expect(restore.text).toContain('Options → Restore Query’s routine has the one you last served');
    const porter = failureLines(failure('wrong-table', 'Wrong table.', { role: 'floor' }), 'query', false, {
      floor: 'walk',
    });
    expect(porter.at(-1)!.text).toContain('Restore Porter’s routine');
    // Only the robot that slipped, only with a routine that was served, and not on a reaction heard before.
    expect(failureLines(slip, 'query', false, { prep: 'brew', query: '  ' })).toHaveLength(2);
    expect(failureLines(slip, 'query')).toHaveLength(2);
    expect(failureLines(slip, 'query', true, { query: 'listen' })).toHaveLength(1);
  });
});
