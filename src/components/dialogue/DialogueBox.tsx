import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FastForward } from 'lucide-react';
import { cast } from '@/data/campaign/cast';
import type { DialogueLine } from '@/domain';
import { Portrait, portraitUrl } from './Portrait';

const TYPE_MS = 22;

/** `*whirr*` in a script is a sound effect, set apart from the spoken words. */
function segments(text: string) {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => (/^\*[^*]+\*$/.test(part) ? { sfx: true, text: part.slice(1, -1) } : { sfx: false, text: part }));
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
}

/** Characters talk one line at a time: click, Enter or Space advances, Escape skips the rest. */
export function DialogueBox({
  lines,
  onDone,
  variant = 'scene',
  kicker,
  doneLabel = 'Continue',
  instant = false,
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
      setIndex((i) => i + 1);
      setTyped(0);
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
        if (e.target instanceof HTMLButtonElement && box.current?.contains(e.target)) return;
        handlers.current.advance();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', keys, true);
    return () => window.removeEventListener('keydown', keys, true);
  }, [scene]);

  if (!current) return null;
  const speaker = current.who ? cast[current.who] : undefined;
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
          {speaker && <p className="dialogue-name">{speaker.name}</p>}
          <p className="dialogue-text" aria-live="polite">
            <span aria-hidden="true">
              {parts.map((part, i) => {
                const typed = part.text.slice(0, Math.max(left, 0));
                left -= part.text.length;
                return (
                  <span key={i} className={part.sfx ? 'dialogue-sfx' : undefined}>
                    {typed}
                    <span className="dialogue-unread">{part.text.slice(typed.length)}</span>
                  </span>
                );
              })}
            </span>
            <span className="sr-only">{speaker ? `${speaker.name}: ${text}` : text}</span>
          </p>
          <div className="dialogue-controls">
            <span className="dialogue-count" aria-hidden="true">
              {index + 1}/{lines.length}
            </span>
            {!last && (
              <button
                type="button"
                className="dialogue-skip"
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
