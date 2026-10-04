import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../src/App';
import { DialogueBox } from '../../../src/components/dialogue/DialogueBox';
import { DialoguePaceContext } from '../../../src/components/dialogue/pace';
import { line } from '../../../src/domain/dialogue';
import { lessons } from '../../../src/data';
import { SAVE_KEY, newSave, parseSave } from '../../../src/features/campaign/save/persistence';
import type { DialoguePace } from '../../../src/domain';

vi.mock('../../../src/shell/HomeCafePreview', () => ({ HomeCafePreview: () => <div /> }));
vi.mock('../../../src/audio', () => ({ configureAudio: vi.fn(), startAudio: vi.fn() }));

const lines = [line('', 'The shutters roll up.')];
const unread = () => document.querySelector('.dialogue-unread')?.textContent ?? '';
function box(pace: DialoguePace, instant = false) {
  render(
    <DialoguePaceContext value={pace}>
      <DialogueBox lines={lines} onDone={() => {}} instant={instant} />
    </DialoguePaceContext>,
  );
}

describe('the dialogue pace', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('types a letter a tick', () => {
    box('typed');
    act(() => vi.advanceTimersByTime(22 * 2));
    expect(unread()).toBe('e shutters roll up.');
  });

  it('types three letters a tick when quick', () => {
    box('quick');
    act(() => vi.advanceTimersByTime(22 * 2));
    expect(unread()).toBe('utters roll up.');
  });

  it('shows each line whole when asked', () => {
    box('whole');
    expect(unread()).toBe('');
  });

  it('gives way to reduced motion', () => {
    box('typed', true);
    expect(unread()).toBe('');
  });
});

describe('the dialogue pace setting', () => {
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

  it('is chosen in the house settings and saved', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const group = screen.getByRole('radiogroup', { name: 'Dialogue text' });
    expect((screen.getByRole('radio', { name: 'Typed' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Whole lines' }));
    expect(group).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).settings.dialogue_pace).toBe('whole');
  });

  it('types lines out for saves made before it, and rejects a pace it doesn’t know', () => {
    const old = newSave();
    delete (old.settings as Partial<typeof old.settings>).dialogue_pace;
    expect(parseSave(JSON.stringify(old), lessons).settings.dialogue_pace).toBe('typed');
    const quick = { ...newSave(), settings: { ...newSave().settings, dialogue_pace: 'quick' } };
    expect(parseSave(JSON.stringify(quick), lessons).settings.dialogue_pace).toBe('quick');
    const odd = { ...newSave(), settings: { ...newSave().settings, dialogue_pace: 'fast' } };
    expect(() => parseSave(JSON.stringify(odd), lessons)).toThrow('Invalid dialogue pace.');
  });
});
