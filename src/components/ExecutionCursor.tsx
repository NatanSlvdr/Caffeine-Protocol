import { useEffect, useRef, useState } from 'react';
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
      const surfaceRect = surface.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const numberRect = number.getBoundingClientRect();
      const size = 26;
      setPosition({
        // Keep the marker outside the number gutter, with a small breathing space.
        left: numberRect.left - surfaceRect.left - size - 7,
        top: rowRect.top - surfaceRect.top + rowRect.height / 2 - size / 2,
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(surface);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, line]);
  useEffect(() => { if (position !== undefined) placed.current = true; }, [position]);
  return <span className="execution-cursor" role="img" aria-label="Current instruction" aria-hidden={line < 0 || position === undefined}
    style={{ transform: `translate3d(${position?.left ?? 0}px, ${position?.top ?? 0}px, 0)`, opacity: line >= 0 && position !== undefined ? 1 : 0,
      transitionDuration: placed.current ? `${Math.min(360, stepSeconds * 600)}ms` : '0ms' }}>
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M3 2.5 15 9 3 15.5Z"/></svg>
  </span>;
}
