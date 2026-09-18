import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

/** Fixed-width container that animates its height when wrapped content changes. */
export function AutoHeight({
  className,
  contentClassName,
  label,
  paused = false,
  reduced = false,
  extraHeight = 0,
  children,
}: {
  className?: string;
  contentClassName?: string;
  label?: string;
  paused?: boolean;
  reduced?: boolean;
  extraHeight?: number;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => {
      // Layout height excludes the camera scale applied by the Html overlay.
      setHeight(element.offsetHeight);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);
  return (
    <div
      className={className}
      data-motion={reduced ? 'reduced' : undefined}
      style={{ height: height === undefined ? undefined : height + extraHeight, animationPlayState: paused ? 'paused' : 'running' }}
      aria-label={label}
    >
      <div className={contentClassName} ref={content}>
        {children}
      </div>
    </div>
  );
}
