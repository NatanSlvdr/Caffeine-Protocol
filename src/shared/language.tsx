import { createContext, isValidElement, use, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * The languages the game's words come in. English is the game's own; French follows it a screen at a time, starting
 * with the front door, the house settings and the handbook. Programming words (blocks, values, the text editor's
 * syntax) are never translated: a routine reads the same in either language, and so does a shared notebook.
 */
export type Language = 'en' | 'fr';

/** Each language named in itself, so whoever is looking for theirs can read it. */
export const LANGUAGES: readonly { id: Language; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'Français' },
];

/**
 * Kept for the browser rather than in a café: whoever sits at it reads every café in it in the same language, the way
 * they share one routine notebook. An exported café carries no language with it.
 */
export const LANGUAGE_KEY = 'caffeine-protocol.language';

const isLanguage = (value: unknown): value is Language => LANGUAGES.some(({ id }) => id === value);

function storedLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

const LanguageContext = createContext<readonly [Language, (language: Language) => void]>(['en', () => undefined]);

/** Holds the browser's language, keeps the page's `lang` in step for screen readers, and follows other tabs. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState(storedLanguage);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const follow = (e: StorageEvent) => {
      if (e.key === LANGUAGE_KEY) setLanguage(storedLanguage());
    };
    window.addEventListener('storage', follow);
    return () => window.removeEventListener('storage', follow);
  }, []);
  const value = useMemo(
    () =>
      [
        language,
        (next: Language) => {
          setLanguage(next);
          try {
            localStorage.setItem(LANGUAGE_KEY, next);
          } catch {
            // Storage refused: the choice holds for this visit.
          }
        },
      ] as const,
    [language],
  );
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

/** The browser's language, and a way to change it. */
export const useLanguage = () => use(LanguageContext);

/** A no-break space, and the narrow one French sets before ; ? and !. */
const NBSP = String.fromCharCode(0xa0);
const NARROW_NBSP = String.fromCharCode(0x202f);

/** French typography: no line ever starts with a colon, a closing guillemet, a semicolon, or a ? or !. */
const typeset = (text: string): string =>
  text
    .replace(/ ([:»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ ([;?!])/g, `${NARROW_NBSP}$1`);

/** Sets every sentence in a catalog, those built from a count or a name included, as `typeset` does. */
function typesetAll<Words>(value: Words): Words {
  if (typeof value === 'string') return typeset(value) as Words;
  if (typeof value === 'function')
    return ((...args: unknown[]) => typesetAll((value as (...args: unknown[]) => unknown)(...args))) as Words;
  // JSX is set by hand, with entities where a sentence needs a no-break space.
  if (isValidElement(value)) return value;
  if (Array.isArray(value)) return value.map(typesetAll) as Words;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, typesetAll(entry)])) as Words;
  return value;
}

/**
 * One screen's words in every language. The French has to say everything the English does, in the same shape: a
 * missing line or a sentence that takes different values fails to type-check. Words that depend on a count or a name
 * are functions, so each language builds its own sentence (plurals, elision, word order) rather than filling blanks.
 * The French is written with plain spaces, and set with French typography here.
 */
export const words = <Words,>(en: Words, fr: NoInfer<Words>): Record<Language, Words> => ({ en, fr: typesetAll(fr) });

/** The words for the language the browser reads in. */
export const useWords = <Words,>(all: Record<Language, Words>): Words => all[useLanguage()[0]];

/** A French count: zero and one take the singular (“0 étoile”, “1 étoile”, “3 étoiles”). */
export const countFr = (n: number, noun: string, plural = `${noun}s`): string => `${n} ${n < 2 ? noun : plural}`;
