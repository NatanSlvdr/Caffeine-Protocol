import type { RefObject } from 'react';
import type { CollisionDetection } from '@dnd-kit/core';
import { pickDropSlot, type DraggedScope } from '@/domain';

export interface DropCollisionRefs {
  root: RefObject<HTMLDivElement | null>;
  codeArea: RefObject<HTMLDivElement | null>;
  pointer: RefObject<{ x: number; y: number } | null>;
  dragScope: RefObject<DraggedScope | undefined>;
  lastSlot: RefObject<string | undefined>;
  landingX: RefObject<number | undefined>;
  measuredPointer: RefObject<{ x: number; y: number; scrollTop: number; viewportTop: number } | undefined>;
}

/** Only insertion slots compete: rows never act as a second, conflicting set of swap targets. */
export function useDropCollision({
  root,
  codeArea,
  pointer,
  dragScope,
  lastSlot,
  landingX,
  measuredPointer,
}: DropCollisionRefs): CollisionDetection {
  return (args) => {
    pointer.current = args.pointerCoordinates;
    const point = args.pointerCoordinates ?? {
      x: args.collisionRect.left,
      y: args.collisionRect.top + args.collisionRect.height / 2,
    };
    const bounds = codeArea.current?.getBoundingClientRect();
    if (!bounds || point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) {
      lastSlot.current = undefined;
      return [];
    }
    const landing = root.current?.querySelector('.drop-projection')?.getBoundingClientRect();
    if (
      landing &&
      lastSlot.current &&
      point.x >= landing.left - 20 &&
      point.x <= landing.right + 40 &&
      Math.abs(point.x - (landingX.current ?? point.x)) < 24 &&
      point.y >= landing.top - 10 &&
      point.y <= landing.bottom + 10
    )
      return [{ id: lastSlot.current }];
    const slots = args.droppableContainers.flatMap((container) => {
      const rect = args.droppableRects.get(container.id),
        data = container.data.current;
      return rect && typeof data?.at === 'number'
        ? [{ id: String(container.id), at: data.at, alternative: !!data.alternative, left: rect.left, top: rect.top, height: rect.height }]
        : [];
    });
    const previousPoint = measuredPointer.current;
    const scrollTop = codeArea.current?.scrollTop ?? 0;
    const stablePoint =
      args.pointerCoordinates && previousPoint?.scrollTop === scrollTop && previousPoint.viewportTop === bounds.top
        ? previousPoint
        : undefined;
    const slot = pickDropSlot(point, slots, dragScope.current, lastSlot.current, stablePoint);
    if (!stablePoint || Math.hypot(point.x - stablePoint.x, point.y - stablePoint.y) > 3)
      measuredPointer.current = { ...point, scrollTop, viewportTop: bounds.top };
    if (slot?.id !== lastSlot.current) landingX.current = point.x;
    lastSlot.current = slot?.id;
    return slot ? [{ id: slot.id }] : [];
  };
}
