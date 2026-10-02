import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core';
import { spokenBlock, type VisualBlock } from '@/domain';

export const dragInstructions: ScreenReaderInstructions = {
  draggable:
    'To move this block, press Space. Use the arrow keys to choose a spot, Space to drop, or Escape to cancel.',
};

/** What a screen reader hears while moving blocks, using the same numbers the code pane shows. */
export function dragAnnouncements(rows: VisualBlock[]): Announcements {
  const numbered = (row: VisualBlock) => `block ${rows.indexOf(row) + 1} (${spokenBlock(row.command)})`;
  const name = (id: unknown) => {
    const text = String(id);
    if (text.startsWith('library:')) return `a new ${spokenBlock(text.slice(8))} block`;
    const row = rows.find((r) => r.line === Number(text));
    return row ? numbered(row) : 'the block';
  };
  const place = (activeId: unknown, id: unknown) => {
    const [kind, value] = String(id).split(':');
    if (kind === 'else') return 'as a new else branch';
    const at = Number(value);
    // Either side of a block's own group is where it already is.
    const moving = rows.find((r) => r.line === Number(activeId));
    if (moving && (at === moving.line || at === moving.end + 1)) return 'in its current spot';
    // The innermost group the spot sits in: rows come in source order, so the last match is the deepest.
    // An else branch stops a line short of the END it shares with its IF, so its last spot is one further.
    const owner = rows.findLast((r) => r.line < at && at <= r.end + (r.command === 'ELSE' ? 1 : 0) && r.end > r.line);
    const next = rows.find((r) => r.line >= at && (!owner || r.line <= owner.end));
    const where = next ? `before ${numbered(next)}` : owner ? 'at the end' : 'at the end of the routine';
    return owner ? `${where}, inside ${numbered(owner)}` : where;
  };
  const sentence = (text: string) => text[0].toUpperCase() + text.slice(1);
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      sentence(
        over ? `${name(active.id)}: ${place(active.id, over.id)}.` : `${name(active.id)} is not over a drop spot.`,
      ),
    onDragEnd: ({ active, over }) =>
      over ? `Dropped ${name(active.id)} ${place(active.id, over.id)}.` : `Put ${name(active.id)} back.`,
    onDragCancel: ({ active }) =>
      String(active.id).startsWith('library:')
        ? 'Cancelled. Nothing was added.'
        : `Cancelled. ${sentence(name(active.id))} stays where it was.`,
  };
}
