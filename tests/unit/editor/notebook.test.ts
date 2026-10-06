import { afterEach, describe, expect, it } from 'vitest';
import { UNLOCKS, unreadableLine } from '../../../src/domain';
import {
  MAX_PAGES,
  NAME_MAX,
  NOTEBOOK_KEY,
  NOTE_MAX,
  carryNotes,
  freeName,
  hasLesson,
  keepPage,
  lessonFileName,
  lessonText,
  mergePages,
  notebookFile,
  pageBlocks,
  parseNotebook,
  readNotebook,
  readableFrom,
  removePage,
  writeNotebook,
  type NotebookPage,
} from '../../../src/features/workspace/notebook';

const page = (name: string, source = 'LISTEN\nTAKE UP', role: NotebookPage['role'] = 'query'): NotebookPage => ({
  name,
  role,
  shift: 4,
  source,
});

afterEach(() => localStorage.clear());

describe('reading a page on a shift', () => {
  it('names the first line the open robot can’t read, and why', () => {
    expect(unreadableLine('LISTEN\n# a note\n\nTAKE UP', 'query', UNLOCKS.query)).toBeUndefined();
    // A block from a later shift is said to be one, at its line.
    expect(unreadableLine('LISTEN\nTAKE UP\nSTOP', 'query', UNLOCKS.query)).toEqual({
      line: 2,
      message: 'Query can’t use “STOP” yet: that block joins the library on a later shift.',
    });
    expect(unreadableLine('LISTEN\nSTOP', 'query', UNLOCKS.closing)).toBeUndefined();
    // Another robot's block is one this robot doesn't know at all.
    expect(unreadableLine('USE UP', 'floor', UNLOCKS.closing)?.message).toBe(
      'Porter doesn’t know “USE UP”. Check it against the block library.',
    );
    expect(unreadableLine('USE UP', 'prep', UNLOCKS.closing)).toBeUndefined();
  });

  it('reads part of a routine as well as a whole one', () => {
    // An If left open, or an End with nothing above it, is for the routine it goes into to settle.
    expect(unreadableLine('END\nTAKE UP', 'query', UNLOCKS.closing)).toBeUndefined();
  });
});

describe('the routine notebook', () => {
  it('keeps a page on top, in place of one by the same name in any case', () => {
    const pages = [page('Sugar run'), page('Two tables')];
    const kept = keepPage(pages, page('sugar RUN', 'LISTEN'));
    expect(kept.map((p) => [p.name, p.source])).toEqual([
      ['sugar RUN', 'LISTEN'],
      ['Two tables', 'LISTEN\nTAKE UP'],
    ]);
    expect(removePage(kept, 'Sugar run').map((p) => p.name)).toEqual(['Two tables']);
  });

  it('numbers a name on when it is taken, within the length a name may have', () => {
    const pages = [page('Query, Shift 04'), page('Query, Shift 04 (2)')];
    expect(freeName(pages, 'Query, Shift 04')).toBe('Query, Shift 04 (3)');
    expect(freeName(pages, '  Fresh  ')).toBe('Fresh');
    const long = 'x'.repeat(NAME_MAX + 5);
    expect(freeName([page('x'.repeat(NAME_MAX))], long)).toHaveLength(NAME_MAX);
  });

  it('counts the blocks a page holds, not its notes or blank lines', () => {
    expect(pageBlocks('# serve tea\nLISTEN\n\n  TAKE UP\nEND')).toBe(3);
  });

  it('brings an exported notebook in beside this one without overwriting anything kept', () => {
    const pages = [page('Sugar run'), page('Two tables', 'LISTEN')];
    const incoming = [page('Sugar run'), page('two tables', 'LISTEN\nSTOP'), page('Closing')];
    const merged = mergePages(pages, incoming);
    expect(merged.pages.map((p) => p.name)).toEqual(['Sugar run', 'Two tables', 'two tables (2)', 'Closing']);
    expect([merged.added, merged.already, merged.full]).toEqual([2, 1, 0]);

    const full = Array.from({ length: MAX_PAGES - 1 }, (_, i) => page(`Page ${i}`));
    const crowded = mergePages(full, [page('One more'), page('And another')]);
    expect(crowded.pages).toHaveLength(MAX_PAGES);
    expect([crowded.added, crowded.full]).toEqual([1, 1]);
  });

  it('reads back its own file, leaving out a damaged page, and turns away anything else', () => {
    const file = JSON.parse(notebookFile([page('Sugar run')]));
    file.pages.push({ name: 'Broken', role: 'chef', shift: 2, source: 'LISTEN' }, { name: '  ', role: 'query' });
    expect(parseNotebook(JSON.stringify(file))).toEqual({ pages: [page('Sugar run')], damaged: 2 });
    expect(() => parseNotebook('not json')).toThrow('It isn’t a routine notebook.');
    expect(() => parseNotebook('{"pages": []}')).toThrow('It isn’t a routine notebook.');
    expect(() => parseNotebook('{"version": 4, "stars": {}}')).toThrow('It’s a café export: import it from Settings.');
  });

  it('stays in this browser beside the save, and starts empty on anything unreadable', () => {
    expect(readNotebook()).toEqual([]);
    expect(writeNotebook([page('Sugar run')])).toBe(true);
    expect(readNotebook()).toEqual([page('Sugar run')]);
    localStorage.setItem(NOTEBOOK_KEY, '{');
    expect(readNotebook()).toEqual([]);
  });
});

describe('a page written up as a lesson', () => {
  const route = 'POSITION listen\nLISTEN\nTAKE UP\nITEM coffee\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nJUMP listen';
  const lesson: NotebookPage = {
    ...page('One coffee after another', route),
    shift: 3,
    about: 'Every guest gets a coffee, and Query goes back to listen for the next.',
    notes: [
      { block: 7, text: 'Back to the top, for the next guest in the queue.' },
      { block: 2, text: 'A fresh ticket for every guest.' },
    ],
  };

  it('reads as plain text: what it shows, the routine with its noted blocks numbered, then the notes in order', () => {
    expect(lessonText(lesson)).toBe(
      [
        'One coffee after another',
        'A lesson from the Caffeine Protocol routine notebook',
        '',
        'Query’s routine, kept on Shift 03. Query can read it from Shift 03 on.',
        '',
        'Every guest gets a coffee, and Query goes back to listen for the next.',
        '',
        'The routine, with its 2 notes marked:',
        '',
        '    POSITION listen',
        '    LISTEN',
        '[1] TAKE UP',
        '    ITEM coffee',
        '    MOVE RIGHT 1',
        '    DEPOSIT RIGHT',
        '    MOVE LEFT 1',
        '[2] JUMP listen',
        '',
        'Walkthrough',
        '',
        '1. TAKE UP (line 3)',
        '   A fresh ticket for every guest.',
        '',
        '2. JUMP listen (line 8)',
        '   Back to the top, for the next guest in the queue.',
        '',
        'To try it, type the routine into the café’s text editor on Shift 03 or',
        'later. The lesson is plain text: nothing in it runs.',
        '',
      ].join('\n'),
    );
    // Without notes it is the routine alone, and a comment or blank line is never a block to note.
    const bare = lessonText({
      ...page('Bare', 'LISTEN\n\n# the counter\nTAKE UP'),
      notes: [{ block: 1, text: 'Paper.' }],
    });
    expect(bare).toContain('\n    LISTEN\n\n    # the counter\n[1] TAKE UP\n');
    expect(bare).toContain('1. TAKE UP (line 4)\n   Paper.');
    expect(lessonText(page('Plain'))).toContain('The routine:\n\nLISTEN\nTAKE UP\n\nTo try it');
  });

  it('says the first shift its robot can read it on, by the blocks the library has by then', () => {
    expect(readableFrom(page('Coffee', route))).toBe(UNLOCKS.loop);
    expect(readableFrom(page('Sugar', 'LISTEN\nWRITE 1 sugar'))).toBe(UNLOCKS.sugar);
    expect(readableFrom(page('Brew’s', 'LISTEN\nWAIT FOR ORDERS', 'query'))).toBeUndefined();
    expect(lessonText(page('Brew’s', 'WAIT FOR ORDERS', 'query'))).toContain('Query can’t read it on any shift.');
  });

  it('keeps notes as one line of plain text, on blocks the page has, in the routine’s order', () => {
    const written: NotebookPage = {
      ...lesson,
      about: '  Line one\n\tline two\u0007  ',
      notes: [
        { block: 5, text: 'x'.repeat(NOTE_MAX + 20) },
        { block: 2, text: '   ' },
        { block: 99, text: 'No such block.' },
        { block: 0, text: 'First <b>block</b>' },
        { block: 0, text: 'Twice.' },
      ],
    };
    const [read] = parseNotebook(notebookFile([written])).pages;
    expect(read.about).toBe('Line one line two');
    expect(read.notes).toEqual([
      { block: 0, text: 'First <b>block</b>' },
      { block: 5, text: 'x'.repeat(NOTE_MAX) },
    ]);
    // Notes of the wrong shape are left out, the page still comes in; a page with nothing to say carries no lesson.
    const odd = JSON.stringify({
      format: 'caffeine-protocol-notebook',
      pages: [{ ...page('Odd'), about: 4, notes: [{ block: 'one', text: 'x' }, null, { block: 1, text: 'Kept.' }] }],
    });
    expect(parseNotebook(odd).pages).toEqual([{ ...page('Odd'), notes: [{ block: 1, text: 'Kept.' }] }]);
    expect(parseNotebook(notebookFile([{ ...page('Quiet'), about: ' ', notes: [] }])).pages[0]).toEqual(page('Quiet'));
    expect(hasLesson(page('Quiet'))).toBe(false);
    expect(hasLesson({ ...page('Said'), notes: [{ block: 0, text: 'Listen.' }] })).toBe(true);
  });

  it('carries its notes over to the routine kept in its place, each following its block', () => {
    const moved = `LISTEN\nPOSITION listen\nLISTEN\nTAKE UP\nITEM tea\nMOVE RIGHT 1\nDEPOSIT RIGHT\nMOVE LEFT 1\nJUMP listen`;
    expect(carryNotes(lesson, moved)).toEqual([
      { block: 8, text: 'Back to the top, for the next guest in the queue.' },
      { block: 3, text: 'A fresh ticket for every guest.' },
    ]);
    // The second of two alike stays on the second; a block no longer there takes its note with it.
    const twice = { ...page('Twice', 'MOVE RIGHT 1\nTAKE UP\nMOVE RIGHT 1'), notes: [{ block: 2, text: 'Again.' }] };
    expect(carryNotes(twice, 'TAKE UP\nMOVE RIGHT 1\nLISTEN\nMOVE RIGHT 1')).toEqual([{ block: 3, text: 'Again.' }]);
    expect(carryNotes(twice, 'TAKE UP\nMOVE RIGHT 1')).toEqual([]);
  });

  it('comes in from a notebook file as a page of its own when its lesson differs', () => {
    const quiet = { ...lesson, about: undefined, notes: undefined };
    expect(mergePages([quiet], [lesson]).pages.map((p) => p.name)).toEqual([
      'One coffee after another',
      'One coffee after another (2)',
    ]);
    expect(mergePages([lesson], [{ ...lesson, notes: [...lesson.notes!].reverse() }]).already).toBe(1);
  });

  it('goes out as a text file named after its page', () => {
    expect(lessonFileName('Café — Sugar, every way!')).toBe('caffeine-protocol-lesson-cafe-sugar-every-way.txt');
    expect(lessonFileName('☕')).toBe('caffeine-protocol-lesson-routine.txt');
  });
});
