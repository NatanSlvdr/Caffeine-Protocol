import { useLayoutEffect, useRef } from 'react';
import { useDndContext } from '@dnd-kit/core';

/** Hide the original group only while a landing slot displays its full-size preview. */
export function ProgramSurface({ root, children }: { root: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  const { active, over } = useDndContext();
  const previous = useRef(new Map<HTMLElement, { left: number; top: number }>());
  const wasDragging = useRef(false);
  // Animate visual rows only; drop targets keep stable, final-layout coordinates.
  useLayoutEffect(() => {
    const surface = root.current;
    if (!surface) return;
    const reduced = document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<HTMLElement, { left: number; top: number }>();
    const bounds = surface.getBoundingClientRect();
    for (const row of surface.querySelectorAll<HTMLElement>('.code-row')) {
      if (row.closest('.drop-projection,.drag-source')) continue;
      const old = previous.current.get(row);
      const transform = getComputedStyle(row).transform;
      const matrix = transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number);
      const rect = row.getBoundingClientRect();
      const offsetX = matrix?.[4] ?? 0,
        offsetY = matrix?.[5] ?? 0;
      const position = { left: rect.left - bounds.left - offsetX, top: rect.top - bounds.top - offsetY };
      next.set(row, position);
      // Pointer updates do not restart an animation whose destination is unchanged.
      if (old && Math.abs(old.left - position.left) + Math.abs(old.top - position.top) < 0.5 && !reduced) continue;
      row.getAnimations?.().forEach((animation) => animation.cancel());
      if (old && (active || wasDragging.current) && !reduced) {
        const dx = old.left - position.left + offsetX,
          dy = old.top - position.top + offsetY;
        if (Math.abs(dx) + Math.abs(dy) > 1)
          row.animate?.([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], {
            duration: 190,
            easing: 'cubic-bezier(.2,.8,.2,1)',
          });
      }
    }
    previous.current = next;
    wasDragging.current = !!active;
  });
  return (
    <div className={'block-list visual-program' + (active ? ' is-dragging' : '') + (over ? ' has-drop-preview' : '')} ref={root}>
      {children}
    </div>
  );
}
