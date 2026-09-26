import type { RefObject } from 'react';
import type { CollisionDetection } from '@dnd-kit/core';
import { pickDropSlot, type DraggedScope } from '@/domain';
import { measureDropSlots } from './measureDropSlots';

export interface DropCollisionRefs {
  root: RefObject<HTMLDivElement | null>;
  codeArea: RefObject<HTMLDivElement | null>;
  pointer: RefObject<{ x: number; y: number } | null>;
  dragScope: RefObject<DraggedScope | undefined>;
  lastSlot: RefObject<string | undefined>;
}

/** Only insertion slots compete: rows never act as a second, conflicting set of swap targets. */
export function useDropCollision({
  root,
  codeArea,
  pointer,
  dragScope,
  lastSlot,
}: DropCollisionRefs): CollisionDetection {
  return (args) => {
    pointer.current = args.pointerCoordinates;
    const held = args.pointerCoordinates ?? {
      x: args.collisionRect.left,
      y: args.collisionRect.top + args.collisionRect.height / 2,
    };
    const bounds = codeArea.current?.getBoundingClientRect();
    if (!bounds || held.x < bounds.left || held.x > bounds.right || held.y < bounds.top || held.y > bounds.bottom) {
      lastSlot.current = undefined;
      return [];
    }
    // Keyboard drags pick their slot while stepping; the collision pass only confirms it.
    if (!args.pointerCoordinates && lastSlot.current) return [{ id: lastSlot.current }];
    // The block's own top-left corner decides, as it does for keyboard drags, so where along the
    // block it was grabbed never tips it into, or out of, a scope.
    const corner = { x: args.collisionRect.left, y: args.collisionRect.top };
    const slot = pickDropSlot(
      corner,
      measureDropSlots(args.droppableContainers, root.current),
      dragScope.current,
      lastSlot.current,
    );
    lastSlot.current = slot?.id;
    return slot ? [{ id: slot.id }] : [];
  };
}
