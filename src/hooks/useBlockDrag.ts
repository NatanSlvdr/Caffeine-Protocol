import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { placeBlock, removeVisualBlock, type DraggedScope, type VisualBlock } from '@/domain';

export interface BlockDragRefs {
  codeArea: RefObject<HTMLDivElement | null>;
  pointer: RefObject<{ x: number; y: number } | null>;
  dragScope: RefObject<DraggedScope | undefined>;
  lastSlot: RefObject<string | undefined>;
}

/** Whether a pointer drag ended outside the code area, where letting go of a routine block removes it. */
export function droppedOutside({ codeArea, pointer }: Pick<BlockDragRefs, 'codeArea' | 'pointer'>): boolean {
  const bounds = codeArea.current?.getBoundingClientRect(),
    point = pointer.current;
  return (
    !!bounds &&
    !!point &&
    (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom)
  );
}

/** Drag lifecycle for visual blocks: library inserts, scope moves, and drag-out deletes. */
export function useBlockDrag(
  source: string,
  rows: VisualBlock[],
  disabled: boolean,
  change: (value: string) => void,
  refs: BlockDragRefs,
) {
  const [dragged, setDragged] = useState('');
  const [draggedLine, setDraggedLine] = useState<number | null>(null);
  // dnd-kit cancels a pointer drag on Escape without claiming the key; claim it first so the
  // shift's own Escape shortcut does not also leave for the campaign. Undo and redo wait for the drop too: the
  // routine can't change under a block in mid-air.
  useEffect(() => {
    if (!dragged) return;
    const claim = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && /^[zy]$/i.test(e.key))) e.preventDefault();
    };
    window.addEventListener('keydown', claim, true);
    return () => window.removeEventListener('keydown', claim, true);
  }, [dragged]);
  const resetDrag = () => {
    setDragged('');
    setDraggedLine(null);
    refs.dragScope.current = undefined;
    refs.lastSlot.current = undefined;
  };
  return {
    dragged,
    draggedLine,
    resetDrag,
    onDragStart: ({ active }: { active: { id: unknown; data: { current?: { at?: unknown; command?: string } } } }) => {
      refs.pointer.current = null;
      const dataAt = active.data.current?.at,
        line = typeof dataAt === 'number' ? dataAt : Number(active.id);
      const row = rows.find((r) => r.line === line);
      setDragged(active.data.current?.command ?? row?.command ?? '');
      setDraggedLine(row?.line ?? (Number.isInteger(line) ? line : null));
      refs.dragScope.current = row ? { from: row.line, end: row.end, command: row.command } : undefined;
      refs.lastSlot.current = undefined;
    },
    onDragCancel: resetDrag,
    onDragEnd: ({
      active,
      over,
    }: {
      active: { id: unknown; data: { current?: { at?: unknown; command?: string } } };
      over?: { id: unknown; data: { current?: { at?: unknown; alternative?: unknown } } } | null;
    }) => {
      resetDrag();
      if (disabled) return;
      const library = String(active.id).startsWith('library:');
      const dataAt = active.data.current?.at,
        line = typeof dataAt === 'number' ? dataAt : Number(active.id);
      if (!library && droppedOutside(refs)) {
        if (Number.isInteger(line)) change(removeVisualBlock(source, line));
        return;
      }
      if (!over) return;
      const at = over.data.current?.at;
      if (typeof at !== 'number') return;
      const command = library ? String(active.data.current?.command ?? '') : rows.find((r) => r.line === line)?.command;
      if (command)
        change(placeBlock(source, command, at, library ? undefined : line, !!over.data.current?.alternative));
    },
  };
}
