import type { DroppableContainer } from '@dnd-kit/core';
import { settleDropSlots, type DropSlot } from '@/domain';

/**
 * Measure every insertion slot as it is laid out right now, then settle it against the landing
 * preview. Each slot is its anchor's top edge: the exact line where a dropped block's top lands.
 */
export function measureDropSlots(containers: Iterable<DroppableContainer>, root: HTMLElement | null): DropSlot[] {
  const slots = [...containers].flatMap((container) => {
    const node = container.node.current,
      data = container.data.current;
    if (!node || typeof data?.at !== 'number') return [];
    // An Else slot is aimed at through its empty branch, where the block lands, not through its Else row;
    // otherwise the end of the If body, just above, wins while the block hovers the Else.
    const rect = ((data.alternative && node.querySelector('.scope-body > *')) || node).getBoundingClientRect();
    return [
      {
        id: String(container.id),
        at: data.at,
        alternative: !!data.alternative,
        left: rect.left,
        top: rect.top,
        height: 0,
      },
    ];
  });
  // Else previews float beside their branch and push nothing down.
  const anchor = root?.querySelector('.insertion-anchor > .drop-projection')?.parentElement;
  if (!anchor) return slots;
  const landing = anchor.getBoundingClientRect();
  // A hinted slot swaps its placeholder for a block of about the same height.
  return settleDropSlots(slots, {
    top: landing.top,
    shift: anchor.classList.contains('with-hint') ? 0 : landing.height,
  });
}
