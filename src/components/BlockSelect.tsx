import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** A keyboard-accessible operand menu, styled as an inset piece of its parent block. */
export function BlockSelect({ value, options, label, disabled, onChange }: {
  value: string; options: { value: string; label: string }[]; label: string; disabled: boolean; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(0);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const choose = (next: string) => { onChange(next); setOpen(false); trigger.current?.focus(); };
  return <div className="block-select" ref={root} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
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
    {open && <div id={id} role="listbox" aria-label={label} className="operand-menu">{options.map((o, i) => <button type="button" id={`${id}-${i}`} key={o.value} role="option" aria-selected={o.value === value} className={i === focused ? 'focused' : ''} onPointerEnter={() => setFocused(i)} onClick={() => choose(o.value)}>{o.label}</button>)}</div>}
  </div>;
}
