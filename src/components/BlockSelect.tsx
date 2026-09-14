import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DIRECTIONS, directionLabel, normalizeDirection, type Direction } from '../domain/directions';

export interface BlockOption {
  value: string;
  label: string;
  icon?: ReactNode;
  iconOnly?: boolean;
}

/** A keyboard-accessible operand menu, styled as an inset piece of its parent block. */
export function BlockSelect({ value, options, label, disabled, onChange }: {
  value: string; options: BlockOption[]; label: string; disabled: boolean; onChange: (value: string) => void;
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
  const selected = options.find(o => o.value === value);
  return <div className="block-select" ref={root} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" role="combobox" aria-label={label} title={selected?.iconOnly ? selected.label : undefined} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" disabled={disabled}
      onClick={() => { setFocused(Math.max(0, options.findIndex(o => o.value === value))); setOpen(!open); }}
      onKeyDown={e => {
        if (!options.length) return;
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); setOpen(true);
          setFocused(i => e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        } else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(options[focused].value); }
      }} aria-activedescendant={open ? `${id}-${focused}` : undefined}>
      {selected?.iconOnly && selected.icon ? <><span className="selected-operand-icon">{selected.icon}</span><span className="sr-only">{selected.label}</span></> : <>{selected?.icon}{selected?.label ?? value}</>}<ChevronDown size={12}/>
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="operand-menu operand-menu-floating" style={menuStyle}>{options.map((o, i) => <button type="button" tabIndex={-1} id={`${id}-${i}`} key={o.value} role="option" aria-selected={o.value === value} className={i === focused ? 'focused' : ''} onPointerEnter={() => setFocused(i)} onPointerDown={e => e.preventDefault()} onClick={() => choose(o.value)}>{o.icon}{o.label}</button>)}</div>, document.body)}
  </div>;
}

const directionGrid: (Direction | null)[] = ['UP_LEFT', 'UP', 'UP_RIGHT', 'LEFT', null, 'RIGHT', 'DOWN_LEFT', 'DOWN', 'DOWN_RIGHT'];

/** A compact square grid that expands to choose one of eight directions. */
export function DirectionSelect({ value, label, disabled, onChange }: {
  value: string; label: string; disabled: boolean; onChange: (value: Direction) => void;
}) {
  const selected = normalizeDirection(value) ?? 'RIGHT';
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(Math.max(0, DIRECTIONS.indexOf(selected)));
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const position = () => {
      const button = trigger.current;
      if (!button) return;
      const rect = button.getBoundingClientRect(), theme = getComputedStyle(button);
      const width = Math.min(188, window.innerWidth - 16), height = Math.min(208, window.innerHeight - 16);
      setMenuStyle({
        position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 7 : Math.max(8, rect.top - height - 7),
        width, maxHeight: height,
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
  const choose = (next: Direction) => { onChange(next); setOpen(false); trigger.current?.focus(); };
  return <div className="direction-select block-select" ref={root} onClick={e => e.stopPropagation()} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !menu.current?.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="direction-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" title={directionLabel(selected)} disabled={disabled}
      onClick={() => { setFocused(Math.max(0, DIRECTIONS.indexOf(selected))); setOpen(!open); }}
      onKeyDown={e => {
        if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault(); setOpen(true);
          setFocused(i => (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + DIRECTIONS.length) % DIRECTIONS.length);
        } else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(DIRECTIONS[focused]); }
      }} aria-activedescendant={open ? `${id}-${DIRECTIONS[focused]}` : undefined}>
      <span className="direction-mini-grid" aria-hidden="true">{directionGrid.map((direction, i) => <span key={direction ?? `center-${i}`} className={direction ? (direction === selected ? 'chosen' : '') : 'empty'}/>)}</span>
      <span className="sr-only">{directionLabel(selected)}</span>
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} className="direction-menu operand-menu-floating" style={menuStyle}>
      <div className="direction-grid">{directionGrid.map((direction, i) => direction ? <button type="button" tabIndex={-1} id={`${id}-${direction}`} key={direction} role="option" aria-label={directionLabel(direction)} aria-selected={direction === selected} className={DIRECTIONS[focused] === direction ? 'focused' : ''} title={directionLabel(direction)} onPointerEnter={() => setFocused(DIRECTIONS.indexOf(direction))} onPointerDown={e => e.preventDefault()} onClick={() => choose(direction)}/> : <span aria-hidden="true" key={`center-${i}`}/>)}</div>
      <small>Choose a direction</small>
    </div>, document.body)}
  </div>;
}
