import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import { cast, speakerLabel, speakerParts } from '@/data/campaign/cast';
import type { DialogueLine } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { category } from '../editor/blockMeta';
import { Portrait, portraitUrl } from './Portrait';

const TYPE_MS = 22;

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
  /** Print each line whole instead of typing it out. */
  instant?: boolean;
  /** Called with the new line's index each time the scene moves on. */
  onLine?: (index: number) => void;
}

/** Characters talk one line at a time: click, Enter or Space advances, Escape skips the rest. */
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
  const next = useRef<HTMLButtonElement>(null);
  const current = lines[Math.min(index, lines.length - 1)];
  const parts = segments(current?.text ?? '');
  const text = parts.map((part) => part.text).join('');
  const shown = instant ? text.length : Math.min(typed, text.length);
  const typing = shown < text.length;
  const last = index >= lines.length - 1;
  const scene = variant === 'scene';

  // Fetch every portrait up front so a new speaker or mood never pops in half-loaded.
  useEffect(() => {
    for (const { who, mood } of lines) {
      const url = who && portraitUrl(who, mood);
      if (url) new Image().src = url;
    }
  }, [lines]);

  useEffect(() => {
    if (!typing) return;
    const timer = window.setInterval(() => setTyped((count) => count + 1), TYPE_MS);
    return () => window.clearInterval(timer);
  }, [index, typing]);

  const advance = () => {
    if (typing) setTyped(text.length);
    else if (last) onDone();
    else {
      setIndex(index + 1);
      setTyped(0);
      onLine?.(index + 1);
    }
  };

  useEffect(() => {
    if (scene) next.current?.focus({ preventScroll: true });
  }, [scene]);

  // A scene owns the keyboard; an aside only answers while focus is inside it, so typing code is never hijacked.
  const handlers = useRef({ advance, onDone });
  handlers.current = { advance, onDone };
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (!scene && !box.current?.contains(document.activeElement)) return;
      if (e.key === 'Escape') handlers.current.onDone();
      else if ((e.key === 'Enter' || e.key === ' ') && !e.metaKey && !e.ctrlKey) {
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
            <span className="sr-only">{speaker ? `${speakerLabel(speaker)}: ${text}` : text}</span>
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
