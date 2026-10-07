import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import type { VisualBlock } from '@/domain';
import { EDITOR_WORDS, type EditorWords } from './editorWords';

/** Read with every draggable block, so it fits a library block being added as well as one being moved. */
export const dragInstructions = (say: EditorWords['drag'] = EDITOR_WORDS.en.drag): ScreenReaderInstructions => ({
  draggable: say.instructions,
});

/**
 * What a screen reader hears while moving blocks, using the same numbers the code pane shows.
 * `outside` says whether the drag ended outside the code area, where a routine block is removed.
 */
export function dragAnnouncements(
  rows: VisualBlock[],
  outside: () => boolean = () => false,
  say: EditorWords['drag'] = EDITOR_WORDS.en.drag,
): Announcements {
  const numbered = (row: VisualBlock) => say.block(rows.indexOf(row) + 1, row.command);
  const name = (id: unknown) => {
    const text = String(id);
    if (text.startsWith('library:')) return say.newBlock(text.slice(8));
    const row = rows.find((r) => r.line === Number(text));
    return row ? numbered(row) : say.someBlock;
  };
  const place = (activeId: unknown, id: unknown) => {
    const [kind, value] = String(id).split(':');
    if (kind === 'else') return say.elseBranch;
    const at = Number(value);
    // Either side of a block's own group is where it already is.
    const moving = rows.find((r) => r.line === Number(activeId));
    if (moving && (at === moving.line || at === moving.end + 1)) return say.inPlace;
    // The innermost group the spot sits in: rows come in source order, so the last match is the deepest.
    // An else branch stops a line short of the END it shares with its IF, so its last spot is one further.
    const owner = rows.findLast((r) => r.line < at && at <= r.end + (r.command === 'ELSE' ? 1 : 0) && r.end > r.line);
    const next = rows.find((r) => r.line >= at && (!owner || r.line <= owner.end));
    const where = next ? say.before(numbered(next)) : owner ? say.end : say.routineEnd;
    return owner ? say.inside(where, numbered(owner)) : where;
  };
  return {
    onDragStart: ({ active }) => say.start(name(active.id)),
    onDragOver: ({ active, over }) =>
      over ? say.over(name(active.id), place(active.id, over.id)) : say.nowhere(name(active.id)),
    onDragEnd: ({ active, over }) => {
      // Said as it turns out: a routine block let go outside the code is gone, and a new one let go nowhere was
      // never added.
      if (String(active.id).startsWith('library:'))
        return over ? say.dropped(name(active.id), place(active.id, over.id)) : say.notAdded(name(active.id));
      if (outside()) return say.removed(name(active.id));
      return over ? say.dropped(name(active.id), place(active.id, over.id)) : say.putBack(name(active.id));
    },
    onDragCancel: ({ active }) =>
      String(active.id).startsWith('library:') ? say.cancelled : say.stays(name(active.id)),
  };
}
