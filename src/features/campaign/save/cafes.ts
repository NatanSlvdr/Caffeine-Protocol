import { SAVE_KEY } from './settings';

/**
 * The cafés kept in this browser, each its own playthrough with its own progress, routines and settings. The first
 * café lives where a café always has (`SAVE_KEY`), so a browser that had one café before there could be several
 * finds it as the first, untouched; each café added later takes a key of its own. Which café a tab plays is settled
 * once, as it opens, and never changes under it: switching cafés reloads the page.
 */
export const CAFES_KEY = `${SAVE_KEY}.cafes`;
export const FIRST_CAFE = 'first';
export const CAFE_NAME_MAX = 32;
export const MAX_CAFES = 8;
const FIRST_NAME = 'First café';

export interface CafeEntry {
  id: string;
  name: string;
}
export interface CafeList {
  /** The café a visit opens: the one opened last. */
  open: string;
  cafes: CafeEntry[];
}

/** The café this tab plays, settled as it opens. */
let current = FIRST_CAFE;
export const openCafeId = () => current;

/** Where a café's save is kept; the open café's unless another is named. */
export const cafeKey = (id = current) => (id === FIRST_CAFE ? SAVE_KEY : `${SAVE_KEY}.cafe-${id}`);
/** What a café keeps beside its save, by the suffix on its key: the kept copy, the marks of what's been seen, benches. */
const BESIDE = ['', '.backup', '.seen', '.bench'];

const single = (): CafeList => ({ open: FIRST_CAFE, cafes: [{ id: FIRST_CAFE, name: FIRST_NAME }] });
const key = (name: string) => name.trim().toLowerCase();
export const cleanCafeName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, CAFE_NAME_MAX);

/** The cafés this browser keeps. With no list yet, or a damaged one, there is the first café alone. */
export function readCafes(storage: Pick<Storage, 'getItem'>): CafeList {
  try {
    const stored = JSON.parse(storage.getItem(CAFES_KEY) ?? 'null') as unknown;
    const { open, cafes } = (stored ?? {}) as Record<string, unknown>;
    if (!Array.isArray(cafes)) return single();
    const read = cafes
      .filter(
        (cafe): cafe is CafeEntry =>
          !!cafe &&
          typeof cafe === 'object' &&
          typeof (cafe as CafeEntry).id === 'string' &&
          /^(first|\d+)$/.test((cafe as CafeEntry).id) &&
          typeof (cafe as CafeEntry).name === 'string' &&
          !!cleanCafeName((cafe as CafeEntry).name),
      )
      .map(({ id, name }) => ({ id, name: cleanCafeName(name) }))
      .filter((cafe, i, all) => all.findIndex((c) => c.id === cafe.id) === i)
      .slice(0, MAX_CAFES);
    if (!read.length) return single();
    return { open: read.some((cafe) => cafe.id === open) ? (open as string) : read[0].id, cafes: read };
  } catch {
    return single();
  }
}

export function writeCafes(storage: Pick<Storage, 'setItem'>, list: CafeList): boolean {
  try {
    storage.setItem(CAFES_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Settle which café this tab plays, as it opens: the one opened last. */
export function settleCafe(storage: Pick<Storage, 'getItem'> | undefined): CafeList {
  const list = storage ? readCafes(storage) : single();
  current = list.open;
  return list;
}

/** A name no other café has: the one asked for, or it numbered on. */
export function freeCafeName(list: CafeList, name: string, except?: string): string {
  const base = cleanCafeName(name) || 'Café';
  const taken = (n: string) => list.cafes.some((cafe) => cafe.id !== except && key(cafe.name) === key(n));
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const numbered = `${base.slice(0, CAFE_NAME_MAX - String(n).length - 1)} ${n}`;
    if (!taken(numbered)) return numbered;
  }
}

/** The name a new café is offered: Café 2, Café 3 and on. */
export const nextCafeName = (list: CafeList) => freeCafeName(list, `Café ${list.cafes.length + 1}`);

/** Adds a café at the end of the list, with a key no café has used. */
export function addCafe(list: CafeList, name: string): { list: CafeList; id: string } {
  const id = String(Math.max(1, ...list.cafes.map((cafe) => Number(cafe.id) || 1)) + 1);
  return { list: { ...list, cafes: [...list.cafes, { id, name: freeCafeName(list, name) }] }, id };
}

export const renameCafe = (list: CafeList, id: string, name: string): CafeList => ({
  ...list,
  cafes: list.cafes.map((cafe) => (cafe.id === id ? { ...cafe, name: freeCafeName(list, name, id) } : cafe)),
});

/** Clears what a café keeps, so a café added later under the same key starts empty. */
export function clearCafe(storage: Pick<Storage, 'removeItem'>, id: string): void {
  for (const part of BESIDE)
    try {
      storage.removeItem(`${cafeKey(id)}${part}`);
    } catch {
      // Blocked storage keeps what it has.
    }
}

/** Takes a café off the list, and everything it kept with it. */
export function removeCafe(storage: Pick<Storage, 'removeItem'>, list: CafeList, id: string): CafeList {
  clearCafe(storage, id);
  const cafes = list.cafes.filter((cafe) => cafe.id !== id);
  return { open: list.open === id ? cafes[0].id : list.open, cafes };
}
