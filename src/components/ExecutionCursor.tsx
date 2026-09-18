import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Keep one triangle in the gutter so changes of instruction animate continuously. */
export function ExecutionCursor({ root, line, stepSeconds }: {
  root: RefObject<HTMLDivElement | null>; line: number; stepSeconds: number;
}) {
  const [position, setPosition] = useState<{ left: number; top: number; height: number; width: number }>();
  const placed = useRef(false);
  useEffect(() => {
    const surface = root.current;
    if (!surface || line < 0) return;

    const reduced = useReducedMotion();
    surface.querySelector<HTMLElement>(`[data-line="${line}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
    const measure = () => {
      const row = surface.querySelector<HTMLElement>(`[data-line="${line}"]`);
      if (!row) { setPosition(undefined); return; }
      const rowRect = row.getBoundingClientRect();
      const bounds = surface.getBoundingClientRect();
      const center = rowRect.top + rowRect.height / 2;
      const next = {
        // Local coordinates scroll with the blocks without scroll listeners.
        left: -16,
        top: center - bounds.top - 16,
        height: rowRect.height + 5,
        width: bounds.width,
      };
      // Observer notifications must not cancel an instruction transition.
      setPosition(current => current && current.top === next.top && current.height === next.height && current.width === next.width ? current : next);
    };
    measure();
    const reposition = () => measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(reposition);
    observer?.observe(surface);
    surface.querySelectorAll('.code-row').forEach(row => observer?.observe(row));
    window.addEventListener('resize', reposition);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', reposition);
    };
  }, [root, line]);
  useEffect(() => { if (position !== undefined) placed.current = true; }, [position]);
  const marker = <span className="execution-cursor" role="img" aria-label="Current instruction" aria-hidden={line < 0 || position === undefined}
    style={{ transform: `translate3d(${position?.left ?? 0}px, ${position?.top ?? 0}px, 0)`, opacity: line >= 0 && position !== undefined ? 1 : 0,
      transitionDuration: placed.current ? `${Math.min(180, stepSeconds * 200)}ms` : '0ms' }}>
    <span className="execution-line-highlight" aria-hidden="true" style={{width: position?.width ?? 0, height: position?.height ?? 0, top: 16 - (position?.height ?? 0) / 2}}/>
    <svg viewBox="0 0 20 20" width="32" height="32" aria-hidden="true"><path d="M3.5 3 16.5 10 3.5 17Z"/></svg>
  </span>;
  return marker;
}
