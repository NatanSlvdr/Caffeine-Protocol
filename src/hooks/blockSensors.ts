import { PointerSensor, TouchSensor } from '@dnd-kit/core';

/** How long a finger rests on a block before it lifts: a quicker swipe scrolls the routine instead. */
export const TOUCH_LIFT_MS = 250;
/** How far the finger may wander while it rests, in px, before the touch is taken for a scroll. */
export const TOUCH_LIFT_TOLERANCE = 8;

/** An operand control inside a tile keeps its own input; only the tile's face drags. */
const onField = (target: EventTarget | null) => !!(target as Element | null)?.closest?.('input, [role="combobox"]');

/**
 * A browser that sends touch events sends them for a finger and an Apple Pencil alike, after the pointer events.
 * Those are left to the touch sensor, which can hold off the scroll a lift needs; a pointer sensor can't.
 */
const touchLeftToTouchSensor = (event: PointerEvent) =>
  event.pointerType === 'touch' || (event.pointerType === 'pen' && 'ontouchstart' in window);

/** A mouse drags a block once it has moved a few pixels. */
export class BlockPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: React.PointerEvent, options: ConstructorParameters<typeof PointerSensor>[0]['options']) => {
        if (onField(event.target) || touchLeftToTouchSensor(event.nativeEvent)) return false;
        return PointerSensor.activators[0].handler(event, options);
      },
    },
  ];
}

/**
 * A finger lifts a block by resting on it ({@link TOUCH_LIFT_MS}), so the routine and the library still scroll under
 * a swipe; the blocks allow panning (`touch-action: manipulation`) for that.
 */
export class BlockTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: (event: React.TouchEvent, options: ConstructorParameters<typeof TouchSensor>[0]['options']) => {
        if (onField(event.target)) return false;
        return TouchSensor.activators[0].handler(event, options);
      },
    },
  ];
}
