import { useState } from 'react';
import type { RefObject } from 'react';
import { placeBlock, removeVisualBlock, type DraggedScope, type VisualBlock } from '@/domain';

export interface BlockDragRefs {
  codeArea: RefObject<HTMLDivElement | null>;
  pointer: RefObject<{ x: number; y: number } | null>;
  dragScope: RefObject<DraggedScope | undefined>;
  lastSlot: RefObject<string | undefined>;
  landingX: RefObject<number | undefined>;
  measuredPointer: RefObject<{ x: number; y: number; scrollTop: number; viewportTop: number } | undefined>;
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
  const resetDrag = () => {
    setDragged('');
    setDraggedLine(null);
    refs.dragScope.current = undefined;
    refs.lastSlot.current = undefined;
    refs.landingX.current = undefined;
    refs.measuredPointer.current = undefined;
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
      const bounds = refs.codeArea.current?.getBoundingClientRect(),
        point = refs.pointer.current;
      if (!library && bounds && point && (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom)) {
        if (Number.isInteger(line)) change(removeVisualBlock(source, line));
        return;
      }
      if (!over) return;
      const at = over.data.current?.at;
      if (typeof at !== 'number') return;
      const command = library ? String(active.data.current?.command ?? '') : rows.find((r) => r.line === line)?.command;
      if (command) change(placeBlock(source, command, at, library ? undefined : line, !!over.data.current?.alternative));
    },
  };
}
