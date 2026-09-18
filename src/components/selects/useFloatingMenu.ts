import { useEffect, useRef, useState } from 'react';

/** Shared outside-close + portal anchors for floating operand menus. */
export function useFloatingMenu({ active, onOutside }: { active: boolean; onOutside: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const outside = useRef(onOutside);
  outside.current = onOutside;
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!active) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) outside.current();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [active]);
  return { root, menu, menuStyle, setMenuStyle };
}
