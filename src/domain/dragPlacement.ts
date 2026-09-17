export interface DropSlot {
  id: string;
  at: number;
  alternative: boolean;
  left: number;
  top: number;
  height: number;
}
export interface DraggedScope { from: number; end: number; command: string }

export function validDropSlots(slots: DropSlot[], dragged?: DraggedScope) {
  return slots.filter(slot =>
    (!dragged || slot.at <= dragged.from || slot.at > dragged.end) &&
    (dragged?.command !== 'ELSE' || slot.alternative)
  );
}

/** Only insertion slots compete: rows never act as a second, conflicting set of swap targets. */
export function pickDropSlot(point: { x: number; y: number }, slots: DropSlot[], dragged?: DraggedScope, previous?: string, previousPoint?: {x:number;y:number}) {
  const valid = validDropSlots(slots, dragged);
  const score = (slot: DropSlot) => Math.abs(point.y - slot.top - slot.height / 2) + Math.abs(point.x - slot.left) * .2;
  const best = valid.reduce<DropSlot | undefined>((winner, slot) => !winner || score(slot) < score(winner) ? slot : winner, undefined);
  const current = valid.find(slot => slot.id === previous);
  // A preview can reflow all slot rectangles beneath a stationary pointer.
  // Keep its target until the user actually moves, rather than chasing that reflow.
  if(current&&previousPoint&&Math.hypot(point.x-previousPoint.x,point.y-previousPoint.y)<=3)return current;
  // A small dead band prevents flicker when the pointer rests between adjacent slots.
  return current && best && score(current) <= score(best) + 5 ? current : best;
}

/** Keyboard drags advance between actual slots, not arbitrary pixel increments. */
export function keyboardDropSlot(direction: string, point: { x: number; y: number }, slots: DropSlot[], dragged?: DraggedScope) {
  const candidates = validDropSlots(slots, dragged).filter(slot => {
    const y = slot.top + slot.height / 2;
    if (direction === 'ArrowDown') return y > point.y + 2;
    if (direction === 'ArrowUp') return y < point.y - 2;
    if (direction === 'ArrowRight') return slot.left > point.x + 2 && Math.abs(y - point.y) < 24;
    if (direction === 'ArrowLeft') return slot.left < point.x - 2 && Math.abs(y - point.y) < 24;
    return false;
  });
  return pickDropSlot(point, candidates, dragged);
}
