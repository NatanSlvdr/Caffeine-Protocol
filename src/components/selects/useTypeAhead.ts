import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Typing picks out a menu's option by its first letters, as in a native select; a pause starts the word over.
 * Returns a lookup for a key press: the index in `names` it picks, counting on from `from`, or undefined for a key
 * that isn't a letter or digit, or one that fits no option.
 */
export function useTypeAhead() {
  const typed = useRef({ text: '', at: -Infinity });
  return (e: KeyboardEvent, names: string[], from: number): number | undefined => {
    if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return undefined;
    const text = (e.timeStamp - typed.current.at < 700 ? typed.current.text : '') + e.key.toLowerCase();
    typed.current = { text, at: e.timeStamp };
    // One letter, or the same one pressed again, looks past the current option, stepping through every option it
    // starts; a longer word keeps to the current option while it still fits.
    const repeated = [...text].every((letter) => letter === text[0]);
    const prefix = repeated ? text[0] : text;
    const start = repeated ? from + 1 : Math.max(from, 0);
    return names.map((_, i) => (start + i) % names.length).find((i) => names[i].toLowerCase().startsWith(prefix));
  };
}
