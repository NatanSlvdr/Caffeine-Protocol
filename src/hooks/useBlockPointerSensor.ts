import { PointerSensor } from '@dnd-kit/core';

/** Drag the whole tile while leaving operand controls to handle their own input. */
export class BlockPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (event: React.PointerEvent, options: ConstructorParameters<typeof PointerSensor>[0]['options']) => {
        if ((event.target as HTMLElement).closest('input, [role="combobox"]')) return false;
        return PointerSensor.activators[0].handler(event, options);
      },
    },
  ];
}
