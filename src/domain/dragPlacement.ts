import { DROP_REFLOW_TOLERANCE, DROP_STICKY_BONUS, DROP_X_WEIGHT, KEYBOARD_NUDGE, KEYBOARD_ROW_TOLERANCE } from './constants';

export interface DropSlot {
  id: string;
  at: number;
  alternative: boolean;
  left: number;
  top: number;
  height: number;
}
export interface DraggedScope { from: number; end: number; command: string }

function validDropSlots(slots: DropSlot[], dragged?: DraggedScope) {
  return slots.filter(slot =>
    (!dragged || slot.at <= dragged.from || slot.at > dragged.end) &&
    (dragged?.command !== 'ELSE' || slot.alternative)
  );
}

/** Only insertion slots compete: rows never act as a second, conflicting set of swap targets. */
export function pickDropSlot(point: { x: number; y: number }, slots: DropSlot[], dragged?: DraggedScope, previous?: string, previousPoint?: {x:number;y:number}) {
  const valid = validDropSlots(slots, dragged);
  const score = (slot: DropSlot) => Math.abs(point.y - slot.top - slot.height / 2) + Math.abs(point.x - slot.left) * DROP_X_WEIGHT;
  const best = valid.reduce<DropSlot | undefined>((winner, slot) => !winner || score(slot) < score(winner) ? slot : winner, undefined);
  const current = valid.find(slot => slot.id === previous);
  // A preview can reflow all slot rectangles beneath a stationary pointer.
  // Keep its target until the user actually moves, rather than chasing that reflow.
  if(current&&previousPoint&&Math.hypot(point.x-previousPoint.x,point.y-previousPoint.y)<=DROP_REFLOW_TOLERANCE)return current;
  // A small dead band prevents flicker when the pointer rests between adjacent slots.
  return current && best && score(current) <= score(best) + DROP_STICKY_BONUS ? current : best;
}

/** Keyboard drags advance between actual slots, not arbitrary pixel increments. */
export function keyboardDropSlot(direction: string, point: { x: number; y: number }, slots: DropSlot[], dragged?: DraggedScope) {
  const candidates = validDropSlots(slots, dragged).filter(slot => {
    const y = slot.top + slot.height / 2;
    if (direction === 'ArrowDown') return y > point.y + KEYBOARD_NUDGE;
    if (direction === 'ArrowUp') return y < point.y - KEYBOARD_NUDGE;
    if (direction === 'ArrowRight') return slot.left > point.x + KEYBOARD_NUDGE && Math.abs(y - point.y) < KEYBOARD_ROW_TOLERANCE;
    if (direction === 'ArrowLeft') return slot.left < point.x - KEYBOARD_NUDGE && Math.abs(y - point.y) < KEYBOARD_ROW_TOLERANCE;
    return false;
  });
  return pickDropSlot(point, candidates, dragged);
}
