import type { RefObject } from 'react';
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { keyboardDropSlot, type DraggedScope } from '@/domain';
import { measureDropSlots } from './measureDropSlots';

/** Keyboard drags advance between actual slots, not arbitrary pixel increments. */
export function useKeyboardCoordinates(
  root: RefObject<HTMLDivElement | null>,
  dragScope: RefObject<DraggedScope | undefined>,
  lastSlot: RefObject<string | undefined>,
): KeyboardCoordinateGetter {
  return (event, { context, currentCoordinates }) => {
    const rect = context.collisionRect;
    if (!rect || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) return;
    event.preventDefault();
    const corner = { x: rect.left, y: rect.top };
    const slot = keyboardDropSlot(
      event.code,
      corner,
      measureDropSlots(context.droppableContainers.getEnabled(), root.current),
      dragScope.current,
      lastSlot.current,
    );
    if (!slot) return;
    lastSlot.current = slot.id;
    return { x: currentCoordinates.x + slot.left - corner.x, y: currentCoordinates.y + slot.top - corner.y };
  };
}
