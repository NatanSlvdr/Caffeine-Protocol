import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/** Screen position anchored beside a code row; tracks scrolling and resizes. */
export function useAnchoredPosition(anchor?: RefObject<HTMLDivElement | null>) {
  const [position, setPosition] = useState<{ left: number; top: number }>();
  useLayoutEffect(() => {
    const place = () => {
      const row = anchor?.current;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const pane = row.closest('.editor-panel')?.getBoundingClientRect();
      setPosition({ left: (pane?.left ?? rect.left) - 12, top: rect.top + rect.height / 2 });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor]);
  return position;
}
