import { useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FastForward } from 'lucide-react';
import { cast, speakerLabel, speakerParts } from '@/data/campaign/cast';
import type { DialogueLine } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { category } from '../editor/blockMeta';
import { DialoguePaceContext } from './pace';
import { Portrait, portraitUrl } from './Portrait';

const TYPE_MS = 22;
/** Letters typed on each tick: Quick types three at a time, at the same steady rhythm. */
const LETTERS = { typed: 1, quick: 3, whole: Infinity };

/** A field being typed in, which a reaction landing beside it never takes focus from. */
const writing = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

type Part = { kind: 'text' | 'sfx'; text: string } | { kind: 'block'; text: string; command: string };

/** `*whirr*` in a script is a sound effect; `[LISTEN|Wait for Orders]` shows the command as its block. */
function segments(text: string): Part[] {
  return text
    .split(/(\*[^*]+\*|\[[A-Z][^\]|]*\|[^\]]+\])/)
    .filter(Boolean)
    .map((part) => {
      if (/^\*[^*]+\*$/.test(part)) return { kind: 'sfx', text: part.slice(1, -1) };
      const block = /^\[([^\]|]+)\|([^\]]+)\]$/.exec(part);
      return block ? { kind: 'block', command: block[1], text: block[2] } : { kind: 'text', text: part };
    });
}

export interface DialogueBoxProps {
  lines: DialogueLine[];
  onDone: () => void;
  /** `scene` dims the whole screen like a visual novel; `aside` sits over the café and leaves the code free. */
  variant?: 'scene' | 'aside';
  /** Small caption above the box, e.g. the shift name. */
  kicker?: string;
  /** Label on the last line's button. */
  doneLabel?: string;
  /** Print each line whole instead of typing it out, as reduced motion asks; the house settings can ask for it too. */
  instant?: boolean;
  /** Called with the new line's index each time the scene moves on. */
  onLine?: (index: number) => void;
}

/** Characters talk one line at a time: click, Enter or Space advances, ← goes back a line, Escape skips the rest. */
export function DialogueBox({
  lines,
  onDone,
  variant = 'scene',
  kicker,
  doneLabel = 'Continue',
  instant = false,
  onLine,
}: DialogueBoxProps) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  // The furthest line reached: a line gone back over is printed whole, since it has been read once already.
  const [reached, setReached] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const current = lines[Math.min(index, lines.length - 1)];
  const parts = segments(current?.text ?? '');
  const text = parts.map((part) => part.text).join('');
  const pace = useContext(DialoguePaceContext);
  const step = instant ? Infinity : LETTERS[pace];
  const shown = Math.min(step === Infinity ? text.length : typed, text.length);
  const typing = shown < text.length;
  const last = index >= lines.length - 1;
  const scene = variant === 'scene';
  // A live region only reads out what changes in it, so it opens empty and the first line arrives a moment later,
  // like every line after it. Otherwise the crew's reaction would start on a line no screen reader hears.
  const [voiced, setVoiced] = useState(false);
  useEffect(() => setVoiced(true), []);

  // Fetch every portrait up front so a new speaker or mood never pops in half-loaded.
  useEffect(() => {
    for (const { who, mood } of lines) {
      const url = who && portraitUrl(who, mood);
      if (url) new Image().src = url;
    }
  }, [lines]);

  useEffect(() => {
    if (!typing) return;
    const timer = window.setInterval(() => setTyped((count) => count + step), TYPE_MS);
    return () => window.clearInterval(timer);
  }, [index, typing, step]);

  const advance = () => {
    if (typing) setTyped(text.length);
    else if (last) onDone();
    else {
      setIndex(index + 1);
      setTyped(index + 1 <= reached ? Infinity : 0);
      setReached(Math.max(reached, index + 1));
      onLine?.(index + 1);
    }
  };

  /** Steps back to re-read the line before, whole. Gives false on the first line, where there is nothing to go back to. */
  const back = () => {
    if (index === 0) return false;
    setIndex(index - 1);
    setTyped(Infinity);
    onLine?.(index - 1);
    return true;
  };

  // A scene takes focus. So does an aside, so the crew's reaction to a run started from the keyboard is one key away,
  // unless the player is typing in a field: then it waits for them to Tab to it.
  useEffect(() => {
    if (scene || !writing(document.activeElement)) next.current?.focus({ preventScroll: true });
  }, [scene]);

  // A scene owns the keyboard; an aside only answers while focus is inside it, so typing code is never hijacked.
  const handlers = useRef({ advance, back, onDone });
  handlers.current = { advance, back, onDone };
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (!scene && !box.current?.contains(document.activeElement)) return;
      if (e.key === 'Tab' && scene) {
        // A scene is modal: Tab goes round its own buttons, not through the dimmed screen behind it.
        const stops = [...(box.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
        const at = stops.indexOf(document.activeElement as HTMLButtonElement);
        const to = e.shiftKey ? (at <= 0 ? stops.length : at) - 1 : (at + 1) % stops.length;
        stops[to]?.focus({ preventScroll: true });
      } else if (e.key === 'Escape') handlers.current.onDone();
      else if (e.key === 'ArrowLeft' && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (!handlers.current.back()) return;
      } else if ((e.key === 'Enter' || e.key === ' ') && !e.metaKey && !e.ctrlKey) {
        // A held key moves on one line, not through the rest of the scene and past its last button.
        // Its repeats are swallowed, so a focused button doesn't click on them either.
        if (!e.repeat) {
          if (e.target instanceof HTMLButtonElement && box.current?.contains(e.target)) return;
          handlers.current.advance();
        }
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [scene]);

  if (!current) return null;
  const speaker = current.who ? cast[current.who] : undefined;
  const label = speaker && speakerParts(speaker);
  let left = shown;
  return (
    <div
      className={`dialogue dialogue-${variant}`}
      role="dialog"
      aria-modal={scene || undefined}
      aria-label={kicker ?? 'Dialogue'}
      onClick={scene ? advance : undefined}
    >
      <div
        className={`dialogue-stage${speaker ? (speaker.robot ? ' robot-voice' : '') : ' narration'}`}
        ref={box}
        style={speaker ? { ['--speaker' as string]: speaker.color } : undefined}
        onClick={scene ? undefined : advance}
      >
        {current.who && <Portrait key={current.who} who={current.who} mood={current.mood} />}
        <div className="dialogue-box">
          {kicker && scene && <p className="dialogue-kicker">{kicker}</p>}
          {label && (
            <p className="dialogue-name">
              {label.role && <span className="dialogue-role">{label.role}:</span>}
              {label.name}
            </p>
          )}
          <p className="dialogue-text" aria-live="polite">
            <span aria-hidden="true">
              {parts.map((part, i) => {
                const typed = part.text.slice(0, Math.max(left, 0));
                left -= part.text.length;
                // A block pops in whole as the typing reaches it.
                if (part.kind === 'block')
                  return (
                    <span
                      key={i}
                      className={`command-tile dialogue-block ${category(part.command)}${typed ? '' : ' dialogue-unread'}`}
                    >
                      <BlockIcon command={part.command} />
                      {part.text}
                    </span>
                  );
                return (
                  <span key={i} className={part.kind === 'sfx' ? 'dialogue-sfx' : undefined}>
                    {typed}
                    <span className="dialogue-unread">{part.text.slice(typed.length)}</span>
                  </span>
                );
              })}
            </span>
            <span className="sr-only">{voiced && (speaker ? `${speakerLabel(speaker)}: ${text}` : text)}</span>
          </p>
          <div className="dialogue-controls">
            <span className="dialogue-count">
              <span aria-hidden="true">
                {index + 1}/{lines.length}
              </span>
              <span className="sr-only">
                Line {index + 1} of {lines.length}
              </span>
            </span>
            {index > 0 && (
              <button
                type="button"
                className="dialogue-back"
                aria-keyshortcuts="ArrowLeft"
                title="The line before · ←"
                onClick={(e) => {
                  e.stopPropagation();
                  back();
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </button>
            )}
            {!last && (
              <button
                type="button"
                className="dialogue-skip"
                aria-keyshortcuts="Escape"
                title="Skip the rest · Esc"
                onClick={(e) => {
                  e.stopPropagation();
                  onDone();
                }}
              >
                Skip <FastForward size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="dialogue-next"
              ref={next}
              aria-keyshortcuts="Enter Space"
              title="Enter or Space"
              onClick={(e) => {
                e.stopPropagation();
                advance();
              }}
            >
              {last && !typing ? doneLabel : 'Next'} <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
