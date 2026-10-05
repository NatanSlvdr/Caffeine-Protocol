import { ROBOT_ROLES } from '@/domain/robots';
import type { RobotRole } from '@/domain';
import { SAVE_KEY } from '@/features/campaign/save/settings';

/** The player's routine notebook: named routines, or parts of one, kept to bring back on any shift. */
export const NOTEBOOK_KEY = `${SAVE_KEY}.notebook`;
/** What an exported notebook says it is, so a café export or anything else isn't read as one. */
const NOTEBOOK_FORMAT = 'caffeine-protocol-notebook';
export const MAX_PAGES = 60;
export const NAME_MAX = 48;
/** Far past any routine a robot has room for; a page this long is not one the game wrote. */
const SOURCE_MAX = 20_000;

/** One kept routine: its name, the robot it was written for and the shift it was kept on. */
export interface NotebookPage {
  name: string;
  role: RobotRole;
  shift: number;
  source: string;
}

const key = (name: string) => name.trim().toLowerCase();
export const findPage = (pages: readonly NotebookPage[], name: string) => pages.find((p) => key(p.name) === key(name));

/** The blocks a page holds: every line that isn't blank or a note. */
export const pageBlocks = (source: string) =>
  source.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).length;

/** A name not yet in the notebook: the one asked for, or it numbered on. */
export function freeName(pages: readonly NotebookPage[], name: string): string {
  const base = name.trim().slice(0, NAME_MAX);
  if (!findPage(pages, base)) return base;
  for (let n = 2; ; n++) {
    const numbered = `${base.slice(0, NAME_MAX - String(n).length - 3)} (${n})`;
    if (!findPage(pages, numbered)) return numbered;
  }
}

/** Keeps a page at the top of the notebook, in place of one with the same name. */
export function keepPage(pages: readonly NotebookPage[], page: NotebookPage): NotebookPage[] {
  return [page, ...pages.filter((p) => key(p.name) !== key(page.name))];
}

export const removePage = (pages: readonly NotebookPage[], name: string) =>
  pages.filter((p) => key(p.name) !== key(name));

/**
 * Adds an imported notebook's pages after these. A page already here, word for word, comes in once; one whose name is
 * taken by a different routine comes in numbered on, so nothing kept is overwritten. Past the notebook's room, the
 * rest stay out and are counted.
 */
export function mergePages(pages: readonly NotebookPage[], incoming: readonly NotebookPage[]) {
  const merged = [...pages];
  let added = 0,
    already = 0,
    full = 0;
  for (const page of incoming) {
    if (merged.some((p) => key(p.name) === key(page.name) && p.role === page.role && p.source === page.source))
      already++;
    else if (merged.length >= MAX_PAGES) full++;
    else {
      merged.push({ ...page, name: freeName(merged, page.name) });
      added++;
    }
  }
  return { pages: merged, added, already, full };
}

function readPage(value: unknown): NotebookPage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { name, role, shift, source } = value as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof source !== 'string' || source.length > SOURCE_MAX)
    return undefined;
  if (!ROBOT_ROLES.includes(role as RobotRole) || !Number.isInteger(shift) || (shift as number) < 1) return undefined;
  return { name: name.trim().slice(0, NAME_MAX), role: role as RobotRole, shift: shift as number, source };
}

/** Whether a file is an exported notebook, so a café import can say where it goes instead. */
export function isNotebookFile(text: string): boolean {
  try {
    return (JSON.parse(text) as { format?: unknown } | null)?.format === NOTEBOOK_FORMAT;
  } catch {
    return false;
  }
}

/**
 * The pages of an exported notebook. A file that isn't one throws, worded for the player; a damaged page is left out
 * and counted, so the rest still come in.
 */
export function parseNotebook(text: string): { pages: NotebookPage[]; damaged: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('It isn’t a routine notebook.');
  }
  const file = data as { format?: unknown; pages?: unknown } | null;
  if (!file || file.format !== NOTEBOOK_FORMAT || !Array.isArray(file.pages))
    throw new Error(
      file && typeof file === 'object' && 'stars' in file
        ? 'It’s a café export: import it from Settings.'
        : 'It isn’t a routine notebook.',
    );
  const pages = file.pages.map(readPage);
  const kept = pages.filter((page): page is NotebookPage => !!page);
  return { pages: kept, damaged: pages.length - kept.length };
}

/** A notebook as a file to carry to another browser, laid out to be read; the browser's own copy is kept compact. */
export const notebookFile = (pages: readonly NotebookPage[], spaced = true) =>
  JSON.stringify({ format: NOTEBOOK_FORMAT, version: 1, pages }, null, spaced ? 2 : undefined);

/** The notebook this browser keeps, beside the save and never in it: a fresh café starts with the same notebook. */
export function readNotebook(): NotebookPage[] {
  try {
    const stored = localStorage.getItem(NOTEBOOK_KEY);
    return stored ? parseNotebook(stored).pages.slice(0, MAX_PAGES) : [];
  } catch {
    return [];
  }
}

/** Whether the browser kept the notebook; with site data blocked or full, it lasts until the page closes. */
export function writeNotebook(pages: readonly NotebookPage[]): boolean {
  try {
    localStorage.setItem(NOTEBOOK_KEY, notebookFile(pages, false));
    return true;
  } catch {
    return false;
  }
}
