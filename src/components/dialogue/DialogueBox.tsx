import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FastForward } from 'lucide-react';
import { cast, speakerLabel, speakerParts } from '@/data/campaign/cast';
import type { DialogueChoices, DialogueLine, DialogueOption } from '@/domain';
import { BlockIcon } from '../BlockIcon';
import { category } from '../editor/blockMeta';
import { useWords } from '@/shared/language';
import { DialoguePaceContext } from './pace';
import { DIALOGUE_WORDS } from './dialogueWords';
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
  /**
   * The scene's language when it isn't the page's, for its kicker, its lines and its answers: a cutscene is still English
   * on a French page. A line can say otherwise for itself.
   */
  lang?: string;
  /** What comes before the kicker, in the reader's language: “Shift 04”. */
  kickerLabel?: string;
  /** Label on the last line's button; Continue, in the reader's language, if none. */
  doneLabel?: string;
  /** Print each line whole instead of typing it out, as reduced motion asks; the house settings can ask for it too. */
  instant?: boolean;
  /** Called with the new line's index in `lines` each time the scene moves on; an answer's lines report their choice's. */
  onLine?: (index: number) => void;
  /** The answers given before, by choice id: a choice met again marks the one given last time. */
  choices?: DialogueChoices;
  /** Called as the player picks what Niko says. */
  onChoose?: (choice: string, option: string) => void;
}

/**
 * Characters talk one line at a time: click, Enter or Space advances, ← goes back a line, Escape skips the rest. At a
 * choice the player picks what Niko says, by button or number key, and the answer's lines play next.
 */
export function DialogueBox({
  lines,
  onDone,
  variant = 'scene',
  kicker,
  lang,
  kickerLabel,
  doneLabel,
  instant = false,
  onLine,
  choices = {},
  onChoose,
}: DialogueBoxProps) {
  const say = useWords(DIALOGUE_WORDS);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  // The furthest line reached: a line gone back over is printed whole, since it has been read once already.
  const [reached, setReached] = useState(0);
  // The answer picked at each choice this time through, by the choice line's index in `lines`.
  const [picked, setPicked] = useState<Record<number, string>>({});
  const next = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLButtonElement>(null);
  /** The lines as they play: each choice followed by the lines of the answer picked there, once there is one. */
  const played = useMemo(
    () =>
      lines.flatMap((each, source) => {
        const answer = each.choice?.options.find((option) => option.id === picked[source]);
        return [each, ...(answer?.lines ?? [])].map((said) => ({ said, source }));
      }),
    [lines, picked],
  );
  const at = Math.min(index, played.length - 1);
  const current = played[at]?.said;
  const source = played[at]?.source ?? 0;
  const parts = segments(current?.text ?? '');
  const text = parts.map((part) => part.text).join('');
  const pace = useContext(DialoguePaceContext);
  const step = instant ? Infinity : LETTERS[pace];
  const shown = Math.min(step === Infinity ? text.length : typed, text.length);
  const typing = shown < text.length;
  const last = index >= played.length - 1;
  const scene = variant === 'scene';
  const choice = current?.choice;
  // A choice waits for its answer; one already picked this time through can be picked again, or moved past.
  const asking = !!choice && !typing;
  const answered = choice ? picked[source] : undefined;
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
    else if (choice && !answered) firstOption.current?.focus({ preventScroll: true });
    else if (last) onDone();
    else {
      setIndex(index + 1);
      setTyped(index + 1 <= reached ? Infinity : 0);
      setReached(Math.max(reached, index + 1));
      onLine?.(played[index + 1].source);
    }
  };

  /** Says the answer and plays its lines. A different answer on the way back replaces the lines read after it. */
  const answer = (option: DialogueOption) => {
    if (!choice) return;
    const again = answered === option.id;
    setPicked({ ...picked, [source]: option.id });
    onChoose?.(choice.id, option.id);
    setIndex(index + 1);
    setTyped(again && index + 1 <= reached ? Infinity : 0);
    setReached(again ? Math.max(reached, index + 1) : index + 1);
    onLine?.(source);
  };

  /** Steps back to re-read the line before, whole. Gives false on the first line, where there is nothing to go back to. */
  const back = () => {
    if (index === 0) return false;
    setIndex(index - 1);
    setTyped(Infinity);
    onLine?.(played[index - 1].source);
    return true;
  };

  // A scene takes focus. So does an aside, so the crew's reaction to a run started from the keyboard is one key away,
  // unless the player is typing in a field: then it waits for them to Tab to it.
  useEffect(() => {
    if (scene || !writing(document.activeElement)) next.current?.focus({ preventScroll: true });
  }, [scene]);
  // A choice takes focus once it's asked, as Next had it, so the answers are the next keys pressed.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (asking && (scene || box.current?.contains(document.activeElement)))
      firstOption.current?.focus({ preventScroll: true });
  }, [asking, index, scene]);

  // A scene owns the keyboard; an aside only answers while focus is inside it, so typing code is never hijacked.
  const options = asking ? choice.options : [];
  const handlers = useRef({ advance, back, onDone, answer, options });
  handlers.current = { advance, back, onDone, answer, options };
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
      else if (/^[1-9]$/.test(e.key) && !e.altKey && !e.metaKey && !e.ctrlKey) {
        const option = handlers.current.options[Number(e.key) - 1];
        if (!option) return;
        handlers.current.answer(option);
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
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
  const label = speaker && speakerParts(speaker, say.customer);
  const said = current.lang ?? lang;
  let left = shown;
  return (
    <div
      className={`dialogue dialogue-${variant}`}
      role="dialog"
      aria-modal={scene || undefined}
      aria-label={kicker ? (kickerLabel ? `${kickerLabel} · ${kicker}` : kicker) : say.dialogue}
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
          {kicker && scene && (
            <p className="dialogue-kicker">
              {kickerLabel && `${kickerLabel} · `}
              <span lang={lang}>{kicker}</span>
            </p>
          )}
          {label && (
            <p className="dialogue-name">
              {label.role && <span className="dialogue-role">{say.role(label.role)}</span>}
              {label.name}
            </p>
          )}
          <p className="dialogue-text" aria-live="polite">
            <span aria-hidden="true" lang={said}>
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
            {/* Who speaks is said in the reader's language; what they say, in the scene's. */}
            <span className="sr-only">
              {voiced && (
                <>
                  {speaker && say.says(speakerLabel(speaker, say.customer))}
                  <span lang={said}>{text}</span>
                </>
              )}
            </span>
          </p>
          {asking && (
            <div className="dialogue-choices" role="group" aria-label={say.choices}>
              {choice.options.map((option, i) => {
                const chosen = (answered ?? choices[choice.id]) === option.id;
                const mark = answered ? say.saidNow : say.saidBefore;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`dialogue-choice${chosen ? ' chosen' : ''}`}
                    ref={i === 0 ? firstOption : undefined}
                    aria-keyshortcuts={String(i + 1)}
                    // The words Niko says, then the mark, read as one name rather than run together.
                    aria-label={chosen ? `${option.label} (${mark.toLowerCase()})` : option.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      answer(option);
                    }}
                  >
                    <kbd aria-hidden="true">{i + 1}</kbd>
                    <span lang={lang}>{option.label}</span>
                    {chosen && <small aria-hidden="true">{mark}</small>}
                  </button>
                );
              })}
            </div>
          )}
          <div className="dialogue-controls">
            <span className="dialogue-count">
              <span aria-hidden="true">
                {index + 1}/{lines.length}
              </span>
              <span className="sr-only">{say.line(index + 1, lines.length)}</span>
            </span>
            {index > 0 && (
              <button
                type="button"
                className="dialogue-back"
                aria-keyshortcuts="ArrowLeft"
                title={say.backTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  back();
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" /> {say.back}
              </button>
            )}
            {!last && (
              <button
                type="button"
                className="dialogue-skip"
                aria-keyshortcuts="Escape"
                title={say.skipTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  onDone();
                }}
              >
                {say.skip} <FastForward size={14} aria-hidden="true" />
              </button>
            )}
            {(!asking || answered) && (
              <button
                type="button"
                className="dialogue-next"
                ref={next}
                aria-keyshortcuts="Enter Space"
                title={say.nextTitle}
                onClick={(e) => {
                  e.stopPropagation();
                  advance();
                }}
              >
                {last && !typing ? (doneLabel ?? say.done) : say.next} <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
