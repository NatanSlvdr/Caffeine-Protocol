import { DROP_STICKY_BONUS, DROP_X_WEIGHT, KEYBOARD_NUDGE, KEYBOARD_ROW_TOLERANCE } from './constants';

export interface DropSlot {
  id: string;
  at: number;
  alternative: boolean;
  left: number;
  top: number;
  height: number;
}
export interface DraggedScope {
  from: number;
  end: number;
  command: string;
}

function validDropSlots(slots: DropSlot[], dragged?: DraggedScope) {
  return slots.filter(
    (slot) =>
      (!dragged || slot.at <= dragged.from || slot.at > dragged.end) &&
      // The group's own trailing slot collapses with it; the slot before it already means "put it back".
      (!dragged || slot.alternative || slot.at !== dragged.end + 1) &&
      (dragged?.command !== 'ELSE' || slot.alternative),
  );
}

/**
 * A landing preview pushes every slot beneath it down by its own height. Scoring slots as if that
 * preview were lifted out means each one sits where the block would actually land, so a block
 * resting still never chases the reflow, and swapping with a neighbour takes the same half-row
 * of travel up as down.
 */
export function settleDropSlots(slots: DropSlot[], landing?: { top: number; shift: number }) {
  if (!landing?.shift) return slots;
  return slots.map((slot) => (slot.top > landing.top + 0.5 ? { ...slot, top: slot.top - landing.shift } : slot));
}

/** Only insertion slots compete: rows never act as a second, conflicting set of swap targets. */
export function pickDropSlot(
  point: { x: number; y: number },
  slots: DropSlot[],
  dragged?: DraggedScope,
  previous?: string,
) {
  const valid = validDropSlots(slots, dragged);
  const score = (slot: DropSlot) =>
    Math.abs(point.y - slot.top - slot.height / 2) + Math.abs(point.x - slot.left) * DROP_X_WEIGHT;
  const best = valid.reduce<DropSlot | undefined>(
    (winner, slot) => (!winner || score(slot) < score(winner) ? slot : winner),
    undefined,
  );
  const current = valid.find((slot) => slot.id === previous);
  // A small dead band prevents flicker when the block rests between adjacent slots.
  return current && best && score(current) <= score(best) + DROP_STICKY_BONUS ? current : best;
}

/** Keyboard drags advance between actual slots, not arbitrary pixel increments. */
export function keyboardDropSlot(
  direction: string,
  point: { x: number; y: number },
  slots: DropSlot[],
  dragged?: DraggedScope,
  current?: string,
) {
  // Step from the slot already chosen rather than the block, which a scroll can leave a few pixels off it.
  const here = slots.find((slot) => slot.id === current);
  const from = here ? { x: here.left, y: here.top + here.height / 2 } : point;
  const candidates = validDropSlots(slots, dragged).filter((slot) => {
    const y = slot.top + slot.height / 2;
    if (slot.id === current) return false;
    if (direction === 'ArrowDown') return y > from.y + KEYBOARD_NUDGE;
    if (direction === 'ArrowUp') return y < from.y - KEYBOARD_NUDGE;
    if (direction === 'ArrowRight')
      return slot.left > from.x + KEYBOARD_NUDGE && Math.abs(y - from.y) < KEYBOARD_ROW_TOLERANCE;
    if (direction === 'ArrowLeft')
      return slot.left < from.x - KEYBOARD_NUDGE && Math.abs(y - from.y) < KEYBOARD_ROW_TOLERANCE;
    return false;
  });
  return pickDropSlot(from, candidates, dragged);
}
