import { useState } from 'react';
import { cafeKey } from '@/features/campaign/save/cafes';

/** Which of the campaign's keepsakes, guestbook entries, drills, specials, memories and repair benches the open café has already shown. */
export const seenKey = () => `${cafeKey()}.seen`;
type List = 'shelf' | 'guestbook' | 'drills' | 'specials' | 'memories' | 'repairs';

function read(): Partial<Record<List, string[]>> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(seenKey()) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Partial<Record<List, string[]>>) : {};
  } catch {
    return {};
  }
}

function write(list: List, ids: readonly string[]): void {
  try {
    localStorage.setItem(seenKey(), JSON.stringify({ ...read(), [list]: ids }));
  } catch {
    // Storage full or blocked: the marks only come back next visit.
  }
}

/**
 * What has arrived on a list since it was last opened in this browser. A convenience, not progress: it lives beside the
 * save, never in it. A browser that has never kept a record counts everything already there as seen, so an existing or
 * imported café doesn't open with everything marked new. What is no longer earned (a fresh start) drops out of the
 * record, so earning it again marks it new again.
 */
export function useUnseen(list: List, ids: readonly string[]) {
  const [seen, setSeen] = useState<readonly string[]>(() => {
    const kept = read()[list];
    const known = Array.isArray(kept) ? kept.filter((id) => ids.includes(id)) : ids;
    if (!Array.isArray(kept) || known.length !== kept.length) write(list, known);
    return known;
  });
  const fresh = ids.filter((id) => !seen.includes(id));
  /** Marks everything there now as seen, and gives back what was new until now. */
  const markSeen = () => {
    if (fresh.length > 0) {
      write(list, ids);
      setSeen(ids);
    }
    return fresh;
  };
  return { fresh, markSeen };
}
