import { ROBOT_DISPLAY_NAMES, ROBOT_ROLES } from '@/domain/robots';
import { unreadableLine, type RobotRole } from '@/domain';
import { UNLOCKS } from '@/domain/unlocks';
import { pad2 } from '@/shared/lib/format';
import { SAVE_KEY } from '@/features/campaign/save/settings';

/** The player's routine notebook: named routines, or parts of one, kept to bring back on any shift. */
export const NOTEBOOK_KEY = `${SAVE_KEY}.notebook`;
/** What an exported notebook says it is, so a café export or anything else isn't read as one. */
const NOTEBOOK_FORMAT = 'caffeine-protocol-notebook';
export const MAX_PAGES = 60;
export const NAME_MAX = 48;
/** The longest note a page or one of its blocks takes: a sentence or two. */
export const NOTE_MAX = 280;
/** Far past any routine a robot has room for; a page this long is not one the game wrote. */
const SOURCE_MAX = 20_000;

/** A note on one of a page's blocks: which block, counted from 0 among the page's blocks, and what it says. */
export interface BlockNote {
  block: number;
  text: string;
}

/**
 * One kept routine: its name, the robot it was written for and the shift it was kept on. A page can carry a lesson:
 * a word on what it shows, and notes on the blocks worth one, all plain text.
 */
export interface NotebookPage {
  name: string;
  role: RobotRole;
  shift: number;
  source: string;
  about?: string;
  notes?: BlockNote[];
}

const key = (name: string) => name.trim().toLowerCase();
export const findPage = (pages: readonly NotebookPage[], name: string) => pages.find((p) => key(p.name) === key(name));

/** A page's blocks, every line that isn't blank or a comment, each with where it is in the routine and as written. */
export const pageLines = (source: string) =>
  source
    .split('\n')
    .map((text, line) => ({ line, text: text.trimEnd() }))
    .filter(({ text }) => text.trim() && !text.trim().startsWith('#'));

export const pageBlocks = (source: string) => pageLines(source).length;

/** A note as it is kept and carried: one line of plain text, nothing in it that could be anything else. */
export const plainNote = (text: string) =>
  text
    .replace(/[\p{Cc}\s]+/gu, ' ')
    .trim()
    .slice(0, NOTE_MAX);

/** A page's lesson, cleaned: empty notes and notes on blocks it doesn't have are left out, the rest in block order. */
function cleanLesson(page: NotebookPage): NotebookPage {
  const { about, notes, ...rest } = page;
  const blocks = pageBlocks(page.source);
  const said = plainNote(about ?? '');
  const kept = (notes ?? [])
    .map((note) => ({ block: note.block, text: plainNote(note.text) }))
    .filter((note, i, all) => note.text && note.block < blocks && all.findIndex((n) => n.block === note.block) === i)
    .sort((a, b) => a.block - b.block);
  return { ...rest, ...(said && { about: said }), ...(kept.length && { notes: kept }) };
}

/** Whether a page carries a lesson: a word on what it shows, or a note on a block. */
export const hasLesson = (page: NotebookPage) => !!(page.about?.trim() || page.notes?.some((note) => note.text.trim()));

/**
 * A page's notes carried over to the routine kept in its place: each follows its block, found by what it says (the
 * second Move Right 1 is still the second), and a note whose block is gone is left out.
 */
export function carryNotes(page: NotebookPage, source: string): BlockNote[] {
  const before = pageLines(page.source).map(({ text }) => text.trim());
  const after = pageLines(source).map(({ text }) => text.trim());
  return (page.notes ?? []).flatMap((note) => {
    const said = before[note.block];
    const nth = before.slice(0, note.block).filter((text) => text === said).length;
    const block = after.flatMap((text, i) => (text === said ? [i] : []))[nth];
    return block === undefined ? [] : [{ block, text: note.text }];
  });
}

/**
 * The first shift a page's robot can read it on, with the blocks the library has by then; undefined when it never
 * can, being written with another robot's blocks.
 */
export function readableFrom(page: NotebookPage): number | undefined {
  const first = { query: UNLOCKS.query, prep: UNLOCKS.prep, floor: UNLOCKS.floor }[page.role];
  for (let shift = first; shift <= UNLOCKS.closing; shift++)
    if (!unreadableLine(page.source, page.role, shift)) return shift;
  return undefined;
}

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
    if (
      merged.some(
        (p) =>
          key(p.name) === key(page.name) &&
          p.role === page.role &&
          p.source === page.source &&
          JSON.stringify(cleanLesson(p)) === JSON.stringify(cleanLesson({ ...page, name: p.name })),
      )
    )
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
  const { name, role, shift, source, about, notes } = value as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof source !== 'string' || source.length > SOURCE_MAX)
    return undefined;
  if (!ROBOT_ROLES.includes(role as RobotRole) || !Number.isInteger(shift) || (shift as number) < 1) return undefined;
  const page = { name: name.trim().slice(0, NAME_MAX), role: role as RobotRole, shift: shift as number, source };
  const written = Array.isArray(notes)
    ? notes.filter(
        (note): note is BlockNote =>
          !!note &&
          typeof note === 'object' &&
          Number.isInteger((note as BlockNote).block) &&
          (note as BlockNote).block >= 0 &&
          typeof (note as BlockNote).text === 'string',
      )
    : [];
  return cleanLesson({ ...page, about: typeof about === 'string' ? about : undefined, notes: written });
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
  JSON.stringify({ format: NOTEBOOK_FORMAT, version: 1, pages: pages.map(cleanLesson) }, null, spaced ? 2 : undefined);

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

/** Words wrapped to a line length, each line after the first indented. */
function wrap(text: string, indent: string, width = 76): string {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && indent.length + line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return [...lines, line].join(`\n${indent}`);
}

/**
 * A page as a lesson to read away from the café: plain text, its word on what it shows, the routine with the noted
 * blocks numbered beside them, then a walkthrough of the notes in the routine's order. Nothing in it runs; the
 * routine is there to be typed into the text editor, and the lesson says from which shift it can be.
 */
export function lessonText(page: NotebookPage): string {
  const { about, notes = [] } = cleanLesson(page);
  const robot = ROBOT_DISPLAY_NAMES[page.role];
  const from = readableFrom(page);
  const lines = pageLines(page.source);
  const step = new Map(notes.map((note, i) => [lines[note.block].line, i + 1]));
  const gutter = notes.length ? `[${notes.length}]`.length + 1 : 0;
  const routine = page.source
    .trimEnd()
    .split('\n')
    .map((text) => text.trimEnd())
    .map((text, line) => {
      const n = step.get(line);
      return `${(n ? `[${n}]` : '').padStart(gutter - 1).padEnd(gutter)}${text}`.trimEnd();
    });
  const walkthrough = notes.map((note, i) => {
    const { line, text } = lines[note.block];
    return `${i + 1}. ${text.trim()} (line ${line + 1})\n   ${wrap(note.text, '   ')}`;
  });
  return [
    page.name,
    'A lesson from the Caffeine Protocol routine notebook',
    '',
    wrap(
      `${robot}’s routine, kept on Shift ${pad2(page.shift)}. ${
        from ? `${robot} can read it from Shift ${pad2(from)} on.` : `${robot} can’t read it on any shift.`
      }`,
      '',
    ),
    ...(about ? ['', wrap(about, '')] : []),
    '',
    notes.length
      ? `The routine, with ${notes.length === 1 ? 'its note' : `its ${notes.length} notes`} marked:`
      : 'The routine:',
    '',
    ...routine,
    ...(notes.length ? ['', 'Walkthrough', '', walkthrough.join('\n\n')] : []),
    '',
    wrap(
      `${from ? `To try it, type the routine into the café’s text editor on Shift ${pad2(from)} or later. ` : ''}The lesson is plain text: nothing in it runs.`,
      '',
    ),
    '',
  ].join('\n');
}

/** A lesson's file name, after its page. */
export function lessonFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `caffeine-protocol-lesson-${slug || 'routine'}.txt`;
}
