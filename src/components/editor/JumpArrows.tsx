import { useEffect, useId, useState } from 'react';

interface JumpConnection {
  d: string;
}

/** Jump connectors share the code's scroll surface and track their movable empty targets. */
export function JumpArrows({
  root,
  source,
  dragging,
}: {
  root: React.RefObject<HTMLDivElement | null>;
  source: string;
  dragging: boolean;
}) {
  const [links, setLinks] = useState<JumpConnection[]>([]),
    marker = 'jump-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  useEffect(() => {
    // Parent host refs are attached before passive effects, including on a saved-program reload.
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const next = [...element.querySelectorAll<HTMLElement>('[data-jump]')]
        .filter((node) => !node.closest('.has-drop-preview .drag-source'))
        .flatMap((jump, index) => {
          const target = [...element.querySelectorAll<HTMLElement>('[data-target]')].find(
            (t) => t.dataset.target === jump.dataset.jump && !t.closest('.has-drop-preview .drag-source'),
          );
          if (!target) return [];
          const jumpLine = Number(jump.getAttribute('data-line')),
            targetLine = Number(target.getAttribute('data-line'));
          if (!Number.isInteger(jumpLine) || !Number.isInteger(targetLine)) return [];
          const a = jump.getBoundingClientRect(),
            b = target.getBoundingClientRect();
          const x1 = a.right - bounds.left + 3,
            y1 = a.top - bounds.top + a.height / 2;
          const x2 = b.right - bounds.left + 5,
            y2 = b.top - bounds.top + b.height / 2;
          // Short blue routes may pass behind intermediate blocks.
          const bend = Math.min(bounds.width - 8, Math.max(x1, x2) + 14 + Math.abs(y2 - y1) * 0.32 + Math.min(16, index * 4));
          const r = Math.min(18, Math.abs(y2 - y1) / 2);
          const s = y2 >= y1 ? 1 : -1;
          const d =
            r < 1
              ? 'M ' + x1 + ' ' + y1 + ' H ' + x2
              : 'M ' +
                x1 +
                ' ' +
                y1 +
                ' H ' +
                (bend - r) +
                ' Q ' +
                bend +
                ' ' +
                y1 +
                ' ' +
                bend +
                ' ' +
                (y1 + s * r) +
                ' V ' +
                (y2 - s * r) +
                ' Q ' +
                bend +
                ' ' +
                y2 +
                ' ' +
                (bend - r) +
                ' ' +
                y2 +
                ' H ' +
                x2;
          return [{ d }];
        });
      setLinks((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    element.querySelectorAll('.code-row .block').forEach((block) => observer?.observe(block));
    window.addEventListener('resize', measure);
    let frame = 0;
    const settlingUntil = performance.now() + 250;
    // Dropping ends the drag before the rows finish their layout animations.
    // Follow their rendered positions through the final frame as well.
    const track = () => {
      measure();
      const animating = [...element.querySelectorAll<HTMLElement>('.code-row')].some((row) =>
        row.getAnimations?.().some((animation) => animation.playState === 'running'),
      );
      if (dragging || animating || performance.now() < settlingUntil) frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [root, source, dragging]);
  return (
    <svg className="jump-arrows" aria-label="Jump connections">
      <defs>
        <marker id={marker} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M3 2 L9 6 L3 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {links.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={'url(#' + marker + ')'}
        />
      ))}
    </svg>
  );
}
