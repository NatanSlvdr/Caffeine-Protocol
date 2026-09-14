import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/** A keyboard-accessible operand menu, styled as an inset piece of its parent block. */
export function BlockSelect({ value, options, label, disabled, onChange }: {
  value: string; options: { value: string; label: string }[]; label: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(0);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect(), theme = getComputedStyle(button);
      const below = window.innerHeight - rect.bottom - 16, above = rect.top - 16;
      const height = Math.min(240, Math.max(0, Math.max(below, above)));
      const actualHeight = Math.min(menu.current?.scrollHeight ?? 240, height);
      const width = Math.min(Math.max(rect.width, menu.current?.offsetWidth ?? 0), window.innerWidth - 16);
      setMenuStyle({
        position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: below >= actualHeight || below >= above ? rect.bottom + 7 : Math.max(8, rect.top - actualHeight - 7),
        minWidth: Math.min(rect.width, window.innerWidth - 16), maxWidth: window.innerWidth - 16, maxHeight: height,
        '--tile': theme.getPropertyValue('--tile'), '--edge': theme.getPropertyValue('--edge'), '--tile-ink': theme.getPropertyValue('--tile-ink'),
      } as CSSProperties);
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const choose = (next: string) => { onChange(next); setOpen(false); trigger.current?.focus(); };
  return <div className="block-select" ref={root} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" disabled={disabled}
      onClick={() => { setFocused(Math.max(0, options.findIndex(o => o.value === value))); setOpen(!open); }}
      onKeyDown={e => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); setOpen(true);
          setFocused(i => e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(options[focused].value); }
      }} aria-activedescendant={open ? `${id}-${focused}` : undefined}>
      {options.find(o => o.value === value)?.label ?? value}<ChevronDown size={12}/>
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="operand-menu operand-menu-floating" style={menuStyle}>{options.map((o, i) => <button type="button" tabIndex={-1} id={`${id}-${i}`} key={o.value} role="option" aria-selected={o.value === value} className={i === focused ? 'focused' : ''} onPointerEnter={() => setFocused(i)} onPointerDown={e => e.preventDefault()} onClick={() => choose(o.value)}>{o.label}</button>)}</div>, document.body)}
  </div>;
}
