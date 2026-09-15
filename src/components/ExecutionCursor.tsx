import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';

/** Keep one triangle in the gutter so changes of instruction animate continuously. */
export function ExecutionCursor({ root, line, stepSeconds }: {
  root: RefObject<HTMLDivElement | null>; line: number; stepSeconds: number;
}) {
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const placed = useRef(false);
  useEffect(() => {
    const surface = root.current;
    if (!surface || line < 0) return;
    const measure = () => {
      const row = surface.querySelector<HTMLElement>(`[data-line="${line}"]`);
      const number = row?.closest('.code-row')?.querySelector<HTMLElement>('.line-number');
      if (!row || !number) return;
      const rowRect = row.getBoundingClientRect();
      const numberRect = number.getBoundingClientRect();
      const size = 26;
      setPosition({
        // Use viewport coordinates so the marker can cross the pane edge without
        // changing the code surface's internal padding or being clipped by it.
        left: numberRect.left - size - 7,
        top: rowRect.top + rowRect.height / 2 - size / 2,
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(surface);
    const scroller = surface.closest('.editor-body');
    scroller?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer?.disconnect();
      scroller?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [root, line]);
  useEffect(() => { if (position !== undefined) placed.current = true; }, [position]);
  const marker = <span className="execution-cursor" role="img" aria-label="Current instruction" aria-hidden={line < 0 || position === undefined}
    style={{ transform: `translate3d(${position?.left ?? 0}px, ${position?.top ?? 0}px, 0)`, opacity: line >= 0 && position !== undefined ? 1 : 0,
      transitionDuration: placed.current ? `${Math.min(360, stepSeconds * 600)}ms` : '0ms' }}>
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M3 2.5 15 9 3 15.5Z"/></svg>
  </span>;
  return typeof document === 'undefined' ? marker : createPortal(marker, document.body);
}
