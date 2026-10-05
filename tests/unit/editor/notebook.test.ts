import { afterEach, describe, expect, it } from 'vitest';
import { UNLOCKS, unreadableLine } from '../../../src/domain';
import {
  MAX_PAGES,
  NAME_MAX,
  NOTEBOOK_KEY,
  freeName,
  keepPage,
  mergePages,
  notebookFile,
  pageBlocks,
  parseNotebook,
  readNotebook,
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
