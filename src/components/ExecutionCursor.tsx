import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/** Keep one triangle in the gutter so changes of instruction animate continuously. */
export function ExecutionCursor({ root, line, stepSeconds }: {
  root: RefObject<HTMLDivElement | null>; line: number; stepSeconds: number;
}) {
  const [top, setTop] = useState<number>();
  const placed = useRef(false);
  useEffect(() => {
    const surface = root.current;
    if (!surface || line < 0) return;
    const measure = () => {
      const row = surface.querySelector<HTMLElement>(`[data-line="${line}"]`);
      if (!row) return;
      const rect = row.getBoundingClientRect();
      setTop(rect.top - surface.getBoundingClientRect().top + rect.height / 2 - 9);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(surface);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [root, line]);
  useEffect(() => { if (top !== undefined) placed.current = true; }, [top]);
  return <span className="execution-cursor" role="img" aria-label="Current instruction" aria-hidden={line < 0 || top === undefined}
    style={{ transform: `translate3d(27px, ${top ?? 0}px, 0)`, opacity: line >= 0 && top !== undefined ? 1 : 0,
      transitionDuration: placed.current ? `${Math.min(360, stepSeconds * 600)}ms` : '0ms' }}>
    <svg viewBox="0 0 16 18" width="16" height="18" aria-hidden="true"><path d="M2 2 14 9 2 16Z"/></svg>
  </span>;
}
