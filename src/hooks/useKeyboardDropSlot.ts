import type { RefObject } from 'react';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { keyboardDropSlot, type DraggedScope } from '@/domain';

/** Keyboard drags advance between actual slots, not arbitrary pixel increments. */
export function useKeyboardCoordinates(
  dragScope: RefObject<DraggedScope | undefined>,
  lastSlot: RefObject<string | undefined>,
): KeyboardCoordinateGetter {
  return (event, { context, currentCoordinates }) => {
    const rect = context.collisionRect;
    if (!rect || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
    event.preventDefault();
    const point = { x: rect.left, y: rect.top + rect.height / 2 };
    const slots = context.droppableContainers.getEnabled().flatMap((container) => {
      const target = context.droppableRects.get(container.id),
        data = container.data.current;
      return target && typeof data?.at === 'number'
        ? [{ id: String(container.id), at: data.at, alternative: !!data.alternative, left: target.left, top: target.top, height: target.height }]
        : [];
    });
    const slot = keyboardDropSlot(event.code, point, slots, dragScope.current);
    if (!slot) return;
    lastSlot.current = slot.id;
    return { x: currentCoordinates.x + slot.left - point.x, y: currentCoordinates.y + slot.top + slot.height / 2 - point.y };
  };
}
